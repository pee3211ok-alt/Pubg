from fastapi import FastAPI, APIRouter, HTTPException, Header, UploadFile, File, Form, Query
from fastapi.responses import Response
from fastapi.concurrency import run_in_threadpool
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os, logging, uuid, random, secrets, string, bcrypt, httpx, requests, jwt
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Any
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

ADMIN_EMAIL = os.environ['ADMIN_EMAIL']
ADMIN_PASSWORD = os.environ['ADMIN_PASSWORD']
JWT_SECRET = os.environ['JWT_SECRET']
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
APP_NAME = "heeba-pubg"
_storage_key = None

def init_storage():
    global _storage_key
    if _storage_key:
        return _storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_LLM_KEY}, timeout=30)
    resp.raise_for_status()
    _storage_key = resp.json()["storage_key"]
    return _storage_key

def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type}, data=data, timeout=120)
    resp.raise_for_status()
    return resp.json()

def get_object(path: str):
    key = init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ---------------- Helpers ----------------
def now_utc() -> datetime:
    return datetime.now(timezone.utc)

def rand_code(n=6):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=n))

def clean(doc: dict) -> dict:
    if not doc: return doc
    doc.pop('_id', None)
    return doc

async def get_user_by_token(authorization: Optional[str]) -> Optional[dict]:
    if not authorization or not authorization.startswith('Bearer '):
        return None
    token = authorization.split(' ', 1)[1]
    # Try JWT (admin) first
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        if payload.get('type') == 'admin':
            user = await db.users.find_one({'user_id': payload['user_id']}, {'_id': 0})
            return user
    except Exception:
        pass
    # Session token (Google auth)
    sess = await db.user_sessions.find_one({'session_token': token}, {'_id': 0})
    if not sess: return None
    exp = sess.get('expires_at')
    if exp and exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp and exp < now_utc():
        return None
    user = await db.users.find_one({'user_id': sess['user_id']}, {'_id': 0})
    return user

async def require_user(authorization: Optional[str]) -> dict:
    user = await get_user_by_token(authorization)
    if not user:
        raise HTTPException(status_code=401, detail='Unauthorized')
    return user

async def require_admin(authorization: Optional[str]) -> dict:
    user = await require_user(authorization)
    if not user.get('is_admin'):
        raise HTTPException(status_code=403, detail='Admin only')
    return user

async def log_tx(user_id: str, delta: int, reason: str, meta: dict = None):
    await db.transactions.insert_one({
        'tx_id': str(uuid.uuid4()),
        'user_id': user_id,
        'delta': delta,
        'reason': reason,
        'meta': meta or {},
        'created_at': now_utc(),
    })

# ---------------- Models ----------------
class SessionIn(BaseModel):
    session_id: str

class AdminLoginIn(BaseModel):
    email: str
    password: str

class SpinResult(BaseModel):
    prize_id: str
    prize_name: str
    prize_type: str
    points_awarded: int
    rarity: str
    next_spin_at: Optional[datetime] = None

class PrizeIn(BaseModel):
    name: str
    description: Optional[str] = ""
    image_url: Optional[str] = ""
    rarity: str = "common"  # common | rare | epic | legendary
    weight: float = 10.0    # probability weight
    prize_type: str = "points"  # points | item
    points_value: int = 0    # if type=points, amount awarded
    stock: int = -1          # -1 unlimited
    active: bool = True

class ProductIn(BaseModel):
    name: str
    description: Optional[str] = ""
    image_url: Optional[str] = ""
    category: str = "uc"     # uc | skins | boxes | items
    rarity: str = "common"
    price_points: int = 100
    stock: int = -1
    active: bool = True

class PurchaseIn(BaseModel):
    product_id: str
    pubg_id: Optional[str] = ""

class ClaimIn(BaseModel):
    pubg_id: str

class ChannelIn(BaseModel):
    name: str
    handle: Optional[str] = ""
    platform: str = "telegram"  # telegram | youtube | tiktok | instagram
    url: str
    mandatory: bool = True
    active: bool = True

class CreatorIn(BaseModel):
    name: str
    avatar_url: Optional[str] = ""
    platforms: List[str] = []  # list of platform names
    url: Optional[str] = ""

class NotificationIn(BaseModel):
    title: str
    body: Optional[str] = ""
    icon: str = "bell"
    for_user_id: Optional[str] = None  # None = broadcast

class WheelConfigIn(BaseModel):
    cooldown_hours: int = 24
    spin_cost_points: int = 0

class BackgroundIn(BaseModel):
    key: str  # home | wheel | login | lobby
    url: str

class OrderStatusIn(BaseModel):
    status: str  # pending | approved | delivered | rejected
    admin_note: Optional[str] = ""

class AdjustPointsIn(BaseModel):
    delta: int
    reason: str = "admin_adjust"

# ---------------- Startup ----------------
@app.on_event("startup")
async def startup():
    # Indexes
    await db.users.create_index('email', unique=True)
    await db.users.create_index('user_id', unique=True)
    await db.users.create_index('invite_code', unique=True, sparse=True)
    await db.user_sessions.create_index('session_token', unique=True)
    await db.user_sessions.create_index('expires_at', expireAfterSeconds=0)
    # Object storage
    try:
        init_storage()
    except Exception as e:
        logger.warning(f"Storage init failed: {e}")
    # Seed admin user
    admin = await db.users.find_one({'email': ADMIN_EMAIL})
    if not admin:
        pw_hash = bcrypt.hashpw(ADMIN_PASSWORD.encode(), bcrypt.gensalt()).decode()
        await db.users.insert_one({
            'user_id': f'user_admin_{uuid.uuid4().hex[:8]}',
            'email': ADMIN_EMAIL,
            'name': 'قائد هيبة',
            'picture': '',
            'is_admin': True,
            'password_hash': pw_hash,
            'points': 0,
            'invite_code': 'HEEBA1',
            'referred_by': None,
            'referrals_count': 0,
            'subscribed_channels': [],
            'created_at': now_utc(),
        })
        logger.info("Admin user seeded")
    else:
        # Ensure admin flag + password hash always in sync
        pw_hash = bcrypt.hashpw(ADMIN_PASSWORD.encode(), bcrypt.gensalt()).decode()
        await db.users.update_one({'email': ADMIN_EMAIL}, {'$set': {'is_admin': True, 'password_hash': pw_hash}})

    # Seed prizes
    if await db.prizes.count_documents({}) == 0:
        seed_prizes = [
            {'name': '10 نقاط', 'points_value': 10, 'rarity': 'common', 'weight': 30, 'prize_type': 'points'},
            {'name': '50 نقطة', 'points_value': 50, 'rarity': 'common', 'weight': 25, 'prize_type': 'points'},
            {'name': '100 نقطة', 'points_value': 100, 'rarity': 'rare', 'weight': 15, 'prize_type': 'points'},
            {'name': '500 نقطة', 'points_value': 500, 'rarity': 'epic', 'weight': 8, 'prize_type': 'points'},
            {'name': 'جائزة PUBG', 'points_value': 0, 'rarity': 'legendary', 'weight': 2, 'prize_type': 'item', 'description': '60 UC PUBG'},
            {'name': 'جائزة نادرة', 'points_value': 0, 'rarity': 'epic', 'weight': 5, 'prize_type': 'item', 'description': 'صندوق كلاسيكي'},
            {'name': 'حظ أوفر', 'points_value': 0, 'rarity': 'common', 'weight': 15, 'prize_type': 'points'},
        ]
        for p in seed_prizes:
            p.update({'prize_id': str(uuid.uuid4()), 'stock': -1, 'active': True, 'image_url': '', 'description': p.get('description', ''), 'created_at': now_utc()})
            await db.prizes.insert_one(p)
        logger.info("Prizes seeded")

    # Seed products
    if await db.products.count_documents({}) == 0:
        seed_products = [
            {'name': '60 UC', 'category': 'uc', 'price_points': 500, 'rarity': 'common', 'description': 'شحن 60 UC ببجي'},
            {'name': '300 UC', 'category': 'uc', 'price_points': 2000, 'rarity': 'rare', 'description': 'شحن 300 UC ببجي'},
            {'name': '600 UC', 'category': 'uc', 'price_points': 4000, 'rarity': 'epic', 'description': 'شحن 600 UC ببجي'},
            {'name': 'سكن أسطوري', 'category': 'skins', 'price_points': 5000, 'rarity': 'legendary', 'description': 'سكن سلاح أسطوري'},
            {'name': 'صندوق كلاسيكي', 'category': 'boxes', 'price_points': 750, 'rarity': 'rare', 'description': 'صندوق كلاسيكي عشوائي'},
            {'name': 'قسيمة مميزة', 'category': 'items', 'price_points': 250, 'rarity': 'common', 'description': 'قسيمة داخل اللعبة'},
            {'name': 'حزمة RP', 'category': 'items', 'price_points': 1200, 'rarity': 'epic', 'description': 'حزمة Royal Pass'},
        ]
        for p in seed_products:
            p.update({'product_id': str(uuid.uuid4()), 'stock': -1, 'active': True, 'image_url': '', 'created_at': now_utc()})
            await db.products.insert_one(p)
        logger.info("Products seeded")

    # Seed channels
    if await db.channels.count_documents({}) == 0:
        seed_channels = [
            {'name': 'قناة هيبة الرسمية', 'handle': '@heeba_official', 'platform': 'telegram', 'url': 'https://t.me/heeba_official', 'mandatory': True},
            {'name': 'قناة الجوائز', 'handle': '@heeba_rewards', 'platform': 'telegram', 'url': 'https://t.me/heeba_rewards', 'mandatory': True},
            {'name': 'قناة الأخبار', 'handle': '@heeba_news', 'platform': 'youtube', 'url': 'https://youtube.com/@heeba_news', 'mandatory': True},
        ]
        for c in seed_channels:
            c.update({'channel_id': str(uuid.uuid4()), 'active': True, 'created_at': now_utc()})
            await db.channels.insert_one(c)

    # Seed creators
    if await db.creators.count_documents({}) == 0:
        seed_creators = [
            {'name': 'ABN Z3EM', 'platforms': ['youtube', 'tiktok', 'telegram'], 'url': 'https://youtube.com/@abnz3em'},
            {'name': 'MoShawaly', 'platforms': ['tiktok', 'telegram'], 'url': 'https://tiktok.com/@moshawaly'},
            {'name': 'Kemo', 'platforms': ['instagram', 'youtube'], 'url': 'https://instagram.com/kemo'},
            {'name': '3bdo', 'platforms': ['tiktok', 'youtube'], 'url': 'https://tiktok.com/@3bdo'},
            {'name': 'Eslam Adly', 'platforms': ['youtube'], 'url': 'https://youtube.com/@eslamadly'},
        ]
        for c in seed_creators:
            c.update({'creator_id': str(uuid.uuid4()), 'avatar_url': '', 'created_at': now_utc()})
            await db.creators.insert_one(c)

    # Wheel config
    if not await db.config.find_one({'key': 'wheel'}):
        await db.config.insert_one({'key': 'wheel', 'cooldown_hours': 24, 'spin_cost_points': 0})
    if not await db.config.find_one({'key': 'backgrounds'}):
        await db.config.insert_one({'key': 'backgrounds', 'home': '', 'wheel': '', 'login': ''})

# ---------------- Auth ----------------
@api_router.post('/auth/session')
async def auth_session(inp: SessionIn):
    if not inp.session_id:
        raise HTTPException(400, 'session_id required')
    # Exchange with Emergent
    async with httpx.AsyncClient(timeout=30) as http:
        r = await http.get(
            'https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data',
            headers={'X-Session-ID': inp.session_id},
        )
        if r.status_code != 200:
            raise HTTPException(401, 'Invalid session')
        data = r.json()
    email = data.get('email')
    name = data.get('name') or email.split('@')[0]
    picture = data.get('picture') or ''
    session_token = data.get('session_token')
    if not email or not session_token:
        raise HTTPException(401, 'Bad session data')

    is_admin = (email == ADMIN_EMAIL)
    existing = await db.users.find_one({'email': email})
    if existing:
        user_id = existing['user_id']
        await db.users.update_one({'user_id': user_id}, {'$set': {'name': name, 'picture': picture, 'is_admin': is_admin or existing.get('is_admin', False)}})
    else:
        user_id = f'user_{uuid.uuid4().hex[:12]}'
        invite_code = rand_code(6)
        while await db.users.find_one({'invite_code': invite_code}):
            invite_code = rand_code(6)
        await db.users.insert_one({
            'user_id': user_id, 'email': email, 'name': name, 'picture': picture,
            'is_admin': is_admin, 'points': 100, 'invite_code': invite_code,
            'referred_by': None, 'referrals_count': 0, 'subscribed_channels': [],
            'created_at': now_utc(),
        })
        await log_tx(user_id, 100, 'welcome_bonus')

    await db.user_sessions.insert_one({
        'session_token': session_token,
        'user_id': user_id,
        'created_at': now_utc(),
        'expires_at': now_utc() + timedelta(days=7),
    })
    user = clean(await db.users.find_one({'user_id': user_id}, {'_id': 0, 'password_hash': 0}))
    return {'session_token': session_token, 'user': user}

@api_router.post('/auth/admin/login')
async def admin_login(inp: AdminLoginIn):
    user = await db.users.find_one({'email': inp.email})
    if not user or not user.get('password_hash'):
        raise HTTPException(401, 'Invalid credentials')
    if not bcrypt.checkpw(inp.password.encode(), user['password_hash'].encode()):
        raise HTTPException(401, 'Invalid credentials')
    token = jwt.encode(
        {'user_id': user['user_id'], 'type': 'admin', 'exp': int((now_utc() + timedelta(days=30)).timestamp())},
        JWT_SECRET, algorithm='HS256',
    )
    u = clean(await db.users.find_one({'user_id': user['user_id']}, {'_id': 0, 'password_hash': 0}))
    return {'session_token': token, 'user': u}

@api_router.get('/auth/me')
async def me(authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    user.pop('password_hash', None)
    return user

@api_router.post('/auth/logout')
async def logout(authorization: Optional[str] = Header(None)):
    if authorization and authorization.startswith('Bearer '):
        token = authorization.split(' ', 1)[1]
        await db.user_sessions.delete_one({'session_token': token})
    return {'ok': True}

# ---------------- Config / Backgrounds ----------------
@api_router.get('/config')
async def get_config():
    bg = await db.config.find_one({'key': 'backgrounds'}, {'_id': 0}) or {}
    wheel = await db.config.find_one({'key': 'wheel'}, {'_id': 0}) or {}
    return {'backgrounds': bg, 'wheel': wheel}

@api_router.post('/admin/config/wheel')
async def set_wheel(inp: WheelConfigIn, authorization: Optional[str] = Header(None)):
    await require_admin(authorization)
    await db.config.update_one({'key': 'wheel'}, {'$set': {'cooldown_hours': inp.cooldown_hours, 'spin_cost_points': inp.spin_cost_points}}, upsert=True)
    return {'ok': True}

@api_router.post('/admin/config/background')
async def set_bg(inp: BackgroundIn, authorization: Optional[str] = Header(None)):
    await require_admin(authorization)
    await db.config.update_one({'key': 'backgrounds'}, {'$set': {inp.key: inp.url}}, upsert=True)
    return {'ok': True}

# ---------------- Channels ----------------
@api_router.get('/channels')
async def list_channels():
    docs = await db.channels.find({'active': True}, {'_id': 0}).to_list(100)
    return docs

@api_router.post('/channels/confirm')
async def confirm_channels(authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    mandatory = await db.channels.find({'active': True, 'mandatory': True}, {'_id': 0}).to_list(100)
    ids = [c['channel_id'] for c in mandatory]
    await db.users.update_one({'user_id': user['user_id']}, {'$set': {'subscribed_channels': ids, 'subscribed_at': now_utc()}})
    return {'ok': True}

@api_router.post('/admin/channels')
async def add_channel(inp: ChannelIn, authorization: Optional[str] = Header(None)):
    await require_admin(authorization)
    doc = inp.model_dump()
    doc.update({'channel_id': str(uuid.uuid4()), 'created_at': now_utc()})
    await db.channels.insert_one(doc)
    return clean(doc)

@api_router.put('/admin/channels/{cid}')
async def upd_channel(cid: str, inp: ChannelIn, authorization: Optional[str] = Header(None)):
    await require_admin(authorization)
    await db.channels.update_one({'channel_id': cid}, {'$set': inp.model_dump()})
    return {'ok': True}

@api_router.delete('/admin/channels/{cid}')
async def del_channel(cid: str, authorization: Optional[str] = Header(None)):
    await require_admin(authorization)
    await db.channels.delete_one({'channel_id': cid})
    return {'ok': True}

# ---------------- Wheel ----------------
@api_router.get('/wheel/prizes')
async def wheel_prizes():
    docs = await db.prizes.find({'active': True}, {'_id': 0}).to_list(50)
    return docs

@api_router.get('/wheel/status')
async def wheel_status(authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    cfg = await db.config.find_one({'key': 'wheel'}, {'_id': 0}) or {}
    hours = cfg.get('cooldown_hours', 24)
    last = user.get('last_spin_at')
    next_at = None
    can_spin = True
    if last:
        if last.tzinfo is None:
            last = last.replace(tzinfo=timezone.utc)
        next_at = last + timedelta(hours=hours)
        can_spin = now_utc() >= next_at
    return {'can_spin': can_spin, 'next_spin_at': next_at, 'cooldown_hours': hours}

@api_router.post('/wheel/spin')
async def wheel_spin(authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    cfg = await db.config.find_one({'key': 'wheel'}, {'_id': 0}) or {}
    hours = cfg.get('cooldown_hours', 24)
    last = user.get('last_spin_at')
    if last:
        if last.tzinfo is None:
            last = last.replace(tzinfo=timezone.utc)
        if now_utc() < last + timedelta(hours=hours):
            raise HTTPException(429, 'On cooldown')
    prizes = await db.prizes.find({'active': True}, {'_id': 0}).to_list(50)
    prizes = [p for p in prizes if p.get('stock', -1) != 0]
    if not prizes:
        raise HTTPException(400, 'No prizes available')
    total = sum(max(p.get('weight', 1), 0.001) for p in prizes)
    r = random.uniform(0, total)
    acc = 0.0
    chosen = prizes[-1]
    for p in prizes:
        acc += max(p.get('weight', 1), 0.001)
        if r <= acc:
            chosen = p; break
    # Award
    points = int(chosen.get('points_value', 0)) if chosen.get('prize_type') == 'points' else 0
    if points > 0:
        await db.users.update_one({'user_id': user['user_id']}, {'$inc': {'points': points}})
        await log_tx(user['user_id'], points, 'wheel_win', {'prize_id': chosen['prize_id'], 'prize_name': chosen['name']})
    win_id = str(uuid.uuid4())
    await db.wins.insert_one({
        'win_id': win_id, 'user_id': user['user_id'],
        'prize_id': chosen['prize_id'], 'prize_name': chosen['name'],
        'prize_type': chosen.get('prize_type', 'points'), 'rarity': chosen.get('rarity', 'common'),
        'image_url': chosen.get('image_url', ''),
        'points_awarded': points,
        'status': 'delivered' if chosen.get('prize_type') == 'points' else 'pending',
        'created_at': now_utc(),
    })
    # decrement stock if item
    if chosen.get('stock', -1) > 0:
        await db.prizes.update_one({'prize_id': chosen['prize_id']}, {'$inc': {'stock': -1}})
    await db.users.update_one({'user_id': user['user_id']}, {'$set': {'last_spin_at': now_utc()}})
    next_at = now_utc() + timedelta(hours=hours)
    # Notification
    await db.notifications.insert_one({
        'notif_id': str(uuid.uuid4()), 'title': f'🎉 لقد ربحت: {chosen["name"]}',
        'body': f'من عجلة الحظ اليومية', 'icon': 'trophy',
        'for_user_id': user['user_id'], 'created_at': now_utc(), 'read': False,
    })
    return {
        'prize_id': chosen['prize_id'], 'prize_name': chosen['name'],
        'prize_type': chosen.get('prize_type', 'points'), 'points_awarded': points,
        'rarity': chosen.get('rarity', 'common'), 'image_url': chosen.get('image_url', ''),
        'win_id': win_id, 'next_spin_at': next_at.isoformat(),
    }

# Admin prize CRUD
@api_router.get('/admin/prizes')
async def admin_prizes(authorization: Optional[str] = Header(None)):
    await require_admin(authorization)
    return await db.prizes.find({}, {'_id': 0}).to_list(100)

@api_router.post('/admin/prizes')
async def add_prize(inp: PrizeIn, authorization: Optional[str] = Header(None)):
    await require_admin(authorization)
    doc = inp.model_dump()
    doc.update({'prize_id': str(uuid.uuid4()), 'created_at': now_utc()})
    await db.prizes.insert_one(doc)
    return clean(doc)

@api_router.put('/admin/prizes/{pid}')
async def upd_prize(pid: str, inp: PrizeIn, authorization: Optional[str] = Header(None)):
    await require_admin(authorization)
    await db.prizes.update_one({'prize_id': pid}, {'$set': inp.model_dump()})
    return {'ok': True}

@api_router.delete('/admin/prizes/{pid}')
async def del_prize(pid: str, authorization: Optional[str] = Header(None)):
    await require_admin(authorization)
    await db.prizes.delete_one({'prize_id': pid})
    return {'ok': True}

# ---------------- Store ----------------
@api_router.get('/store/products')
async def store_products(category: Optional[str] = None):
    q = {'active': True}
    if category and category != 'all':
        q['category'] = category
    return await db.products.find(q, {'_id': 0}).to_list(200)

@api_router.post('/store/purchase')
async def store_purchase(inp: PurchaseIn, authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    product = await db.products.find_one({'product_id': inp.product_id, 'active': True}, {'_id': 0})
    if not product:
        raise HTTPException(404, 'Product not found')
    if product.get('stock', -1) == 0:
        raise HTTPException(400, 'Out of stock')
    price = int(product['price_points'])
    if user.get('points', 0) < price:
        raise HTTPException(400, 'Insufficient points')
    order_id = str(uuid.uuid4())
    await db.users.update_one({'user_id': user['user_id']}, {'$inc': {'points': -price}})
    await log_tx(user['user_id'], -price, 'store_purchase', {'product_id': product['product_id'], 'product_name': product['name']})
    if product.get('stock', -1) > 0:
        await db.products.update_one({'product_id': product['product_id']}, {'$inc': {'stock': -1}})
    order = {
        'order_id': order_id, 'user_id': user['user_id'],
        'product_id': product['product_id'], 'product_name': product['name'],
        'category': product['category'], 'rarity': product.get('rarity', 'common'),
        'image_url': product.get('image_url', ''), 'price_points': price,
        'pubg_id': inp.pubg_id or '', 'status': 'pending',
        'created_at': now_utc(),
    }
    await db.orders.insert_one(order)
    await db.notifications.insert_one({
        'notif_id': str(uuid.uuid4()), 'title': f'🛒 طلب جديد: {product["name"]}',
        'body': 'تمت عملية الشراء بنجاح. سيتم مراجعتها من الإدارة.',
        'icon': 'cart', 'for_user_id': user['user_id'], 'created_at': now_utc(), 'read': False,
    })
    return clean(order)

@api_router.get('/admin/products')
async def admin_products(authorization: Optional[str] = Header(None)):
    await require_admin(authorization)
    return await db.products.find({}, {'_id': 0}).to_list(200)

@api_router.post('/admin/products')
async def add_product(inp: ProductIn, authorization: Optional[str] = Header(None)):
    await require_admin(authorization)
    doc = inp.model_dump()
    doc.update({'product_id': str(uuid.uuid4()), 'created_at': now_utc()})
    await db.products.insert_one(doc)
    return clean(doc)

@api_router.put('/admin/products/{pid}')
async def upd_product(pid: str, inp: ProductIn, authorization: Optional[str] = Header(None)):
    await require_admin(authorization)
    await db.products.update_one({'product_id': pid}, {'$set': inp.model_dump()})
    return {'ok': True}

@api_router.delete('/admin/products/{pid}')
async def del_product(pid: str, authorization: Optional[str] = Header(None)):
    await require_admin(authorization)
    await db.products.delete_one({'product_id': pid})
    return {'ok': True}

# ---------------- Rewards / Orders (user) ----------------
@api_router.get('/rewards/mine')
async def my_rewards(authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    wins = await db.wins.find({'user_id': user['user_id']}, {'_id': 0}).sort('created_at', -1).to_list(200)
    orders = await db.orders.find({'user_id': user['user_id']}, {'_id': 0}).sort('created_at', -1).to_list(200)
    items = []
    for w in wins:
        items.append({
            'id': w['win_id'], 'source': 'wheel',
            'name': w['prize_name'], 'rarity': w.get('rarity', 'common'),
            'image_url': w.get('image_url', ''), 'status': w.get('status', 'delivered'),
            'created_at': w['created_at'], 'points_awarded': w.get('points_awarded', 0),
        })
    for o in orders:
        items.append({
            'id': o['order_id'], 'source': 'store',
            'name': o['product_name'], 'rarity': o.get('rarity', 'common'),
            'image_url': o.get('image_url', ''), 'status': o.get('status', 'pending'),
            'created_at': o['created_at'], 'price_points': o.get('price_points', 0),
            'pubg_id': o.get('pubg_id', ''),
        })
    items.sort(key=lambda x: x['created_at'], reverse=True)
    return items

@api_router.post('/rewards/wins/{win_id}/claim')
async def claim_win(win_id: str, inp: ClaimIn, authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    win = await db.wins.find_one({'win_id': win_id, 'user_id': user['user_id']}, {'_id': 0})
    if not win:
        raise HTTPException(404, 'Not found')
    await db.wins.update_one({'win_id': win_id}, {'$set': {'pubg_id': inp.pubg_id, 'status': 'pending'}})
    return {'ok': True}

# ---------------- Referrals ----------------
@api_router.get('/referrals/mine')
async def my_referrals(authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    refs = await db.users.find({'referred_by': user['user_id']}, {'_id': 0, 'password_hash': 0}).sort('created_at', -1).to_list(200)
    return {
        'invite_code': user.get('invite_code'),
        'invite_link': f"https://heeba.app/ref/{user.get('invite_code')}",
        'total_referrals': len(refs),
        'total_points_earned': len(refs) * 10,
        'friends': [{'name': r['name'], 'created_at': r['created_at'], 'bonus': 10} for r in refs],
    }

class RedeemIn(BaseModel):
    invite_code: str

@api_router.post('/referrals/redeem')
async def redeem_code(inp: RedeemIn, authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    if user.get('referred_by'):
        raise HTTPException(400, 'Already redeemed')
    inviter = await db.users.find_one({'invite_code': inp.invite_code.upper()})
    if not inviter or inviter['user_id'] == user['user_id']:
        raise HTTPException(400, 'Invalid code')
    await db.users.update_one({'user_id': user['user_id']}, {'$set': {'referred_by': inviter['user_id']}, '$inc': {'points': 10}})
    await db.users.update_one({'user_id': inviter['user_id']}, {'$inc': {'points': 10, 'referrals_count': 1}})
    await log_tx(user['user_id'], 10, 'referral_bonus')
    await log_tx(inviter['user_id'], 10, 'referral_bonus_inviter')
    return {'ok': True}

# ---------------- Notifications ----------------
@api_router.get('/notifications')
async def list_notifs(authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    docs = await db.notifications.find(
        {'$or': [{'for_user_id': user['user_id']}, {'for_user_id': None}]},
        {'_id': 0}
    ).sort('created_at', -1).to_list(100)
    return docs

@api_router.post('/admin/notifications')
async def push_notif(inp: NotificationIn, authorization: Optional[str] = Header(None)):
    await require_admin(authorization)
    doc = inp.model_dump()
    doc.update({'notif_id': str(uuid.uuid4()), 'created_at': now_utc(), 'read': False})
    await db.notifications.insert_one(doc)
    return clean(doc)

# ---------------- Creators ----------------
@api_router.get('/creators')
async def list_creators(platform: Optional[str] = None):
    q = {}
    if platform and platform != 'all':
        q['platforms'] = platform
    return await db.creators.find(q, {'_id': 0}).to_list(100)

@api_router.post('/admin/creators')
async def add_creator(inp: CreatorIn, authorization: Optional[str] = Header(None)):
    await require_admin(authorization)
    doc = inp.model_dump()
    doc.update({'creator_id': str(uuid.uuid4()), 'created_at': now_utc()})
    await db.creators.insert_one(doc)
    return clean(doc)

@api_router.delete('/admin/creators/{cid}')
async def del_creator(cid: str, authorization: Optional[str] = Header(None)):
    await require_admin(authorization)
    await db.creators.delete_one({'creator_id': cid})
    return {'ok': True}

# ---------------- Transactions ----------------
@api_router.get('/transactions/mine')
async def my_tx(authorization: Optional[str] = Header(None)):
    user = await require_user(authorization)
    return await db.transactions.find({'user_id': user['user_id']}, {'_id': 0}).sort('created_at', -1).to_list(200)

# ---------------- Admin: Users/Orders ----------------
@api_router.get('/admin/users')
async def admin_users(authorization: Optional[str] = Header(None)):
    await require_admin(authorization)
    return await db.users.find({}, {'_id': 0, 'password_hash': 0}).sort('created_at', -1).to_list(500)

@api_router.post('/admin/users/{uid}/points')
async def adj_points(uid: str, inp: AdjustPointsIn, authorization: Optional[str] = Header(None)):
    await require_admin(authorization)
    await db.users.update_one({'user_id': uid}, {'$inc': {'points': inp.delta}})
    await log_tx(uid, inp.delta, inp.reason)
    return {'ok': True}

@api_router.get('/admin/orders')
async def admin_orders(authorization: Optional[str] = Header(None)):
    await require_admin(authorization)
    orders = await db.orders.find({}, {'_id': 0}).sort('created_at', -1).to_list(500)
    wins = await db.wins.find({'prize_type': 'item'}, {'_id': 0}).sort('created_at', -1).to_list(500)
    return {'orders': orders, 'wins': wins}

@api_router.post('/admin/orders/{oid}/status')
async def upd_order(oid: str, inp: OrderStatusIn, authorization: Optional[str] = Header(None)):
    await require_admin(authorization)
    r = await db.orders.update_one({'order_id': oid}, {'$set': {'status': inp.status, 'admin_note': inp.admin_note}})
    if r.matched_count == 0:
        await db.wins.update_one({'win_id': oid}, {'$set': {'status': inp.status, 'admin_note': inp.admin_note}})
    return {'ok': True}

@api_router.get('/admin/stats')
async def admin_stats(authorization: Optional[str] = Header(None)):
    await require_admin(authorization)
    users_c = await db.users.count_documents({})
    prizes_c = await db.prizes.count_documents({})
    products_c = await db.products.count_documents({})
    orders_p = await db.orders.count_documents({'status': 'pending'})
    orders_t = await db.orders.count_documents({})
    return {'users': users_c, 'prizes': prizes_c, 'products': products_c, 'orders_pending': orders_p, 'orders_total': orders_t}

# ---------------- Uploads ----------------
@api_router.post('/admin/upload')
async def upload(file: UploadFile = File(...), authorization: Optional[str] = Header(None)):
    user = await require_admin(authorization)
    ext = (file.filename or 'img').split('.')[-1].lower()
    if ext not in ('jpg', 'jpeg', 'png', 'webp', 'gif'):
        ext = 'jpg'
    path = f"{APP_NAME}/uploads/{user['user_id']}/{uuid.uuid4().hex}.{ext}"
    data = await file.read()
    ct = file.content_type or f'image/{ext}'
    await run_in_threadpool(put_object, path, data, ct)
    await db.uploads.insert_one({'path': path, 'owner_id': user['user_id'], 'created_at': now_utc(), 'size': len(data), 'content_type': ct})
    # public URL served through our backend
    return {'path': path, 'url': f"/api/files/{path}"}

@api_router.get('/files/{full_path:path}')
async def get_file(full_path: str):
    rec = await db.uploads.find_one({'path': full_path}, {'_id': 0})
    if not rec:
        raise HTTPException(404, 'Not found')
    try:
        data, ct = await run_in_threadpool(get_object, full_path)
    except Exception:
        raise HTTPException(404, 'Not found')
    return Response(content=data, media_type=ct)

# ---------------- Health ----------------
@api_router.get('/')
async def root():
    return {'app': 'HEEBA — PUBG Rewards', 'ok': True}

app.include_router(api_router)
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.on_event("shutdown")
async def shutdown():
    client.close()
