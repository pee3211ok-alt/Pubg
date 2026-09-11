"""HEEBA backend API test suite - covers auth, wheel, store, rewards, referrals, notifications, channels, admin CRUD."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://gaming-wheel-pubg.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@heeba.app"
ADMIN_PASSWORD = "Heeba@Admin2026"


# ---------------- Fixtures ----------------
@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/admin/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return r.json()["session_token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="module")
def fake_user():
    """Directly create a Google-style user in DB via inserting a session bypass isn't available;
    we use a workaround: create a user_session row by mocking via /auth/session is not possible.
    Instead, create a regular user through mongo? Not allowed here.
    We'll skip user-token tests requiring Google user by using admin token for admin flows,
    and creating a synthetic test user via direct mongo isn't available.
    Simplest: use admin as the acting user for user-level endpoints (admin is also a user)."""
    return None


# ---------------- Auth ----------------
class TestAuth:
    def test_admin_login_success(self):
        r = requests.post(f"{API}/auth/admin/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        data = r.json()
        assert "session_token" in data
        assert data["user"]["email"] == ADMIN_EMAIL
        assert data["user"]["is_admin"] is True

    def test_admin_login_wrong_password(self):
        r = requests.post(f"{API}/auth/admin/login", json={"email": ADMIN_EMAIL, "password": "WRONG"})
        assert r.status_code == 401

    def test_admin_login_wrong_email(self):
        r = requests.post(f"{API}/auth/admin/login", json={"email": "nope@x.com", "password": "WRONG"})
        assert r.status_code == 401

    def test_auth_me(self, admin_headers):
        r = requests.get(f"{API}/auth/me", headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        assert data["email"] == ADMIN_EMAIL
        assert data["is_admin"] is True
        assert "password_hash" not in data

    def test_auth_me_no_token(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401


# ---------------- Wheel ----------------
class TestWheel:
    def test_prizes_seeded(self):
        r = requests.get(f"{API}/wheel/prizes")
        assert r.status_code == 200
        prizes = r.json()
        assert isinstance(prizes, list)
        assert len(prizes) >= 7, f"Expected 7 prizes, got {len(prizes)}"
        for p in prizes:
            assert "prize_id" in p
            assert "name" in p
            assert "rarity" in p
            assert "weight" in p

    def test_wheel_status(self, admin_headers):
        r = requests.get(f"{API}/wheel/status", headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        assert "can_spin" in data
        assert "cooldown_hours" in data

    def test_wheel_spin_and_cooldown(self, admin_headers):
        # get status first
        s = requests.get(f"{API}/wheel/status", headers=admin_headers).json()
        if not s.get("can_spin"):
            pytest.skip("Admin already on cooldown; cannot test fresh spin")
        r = requests.post(f"{API}/wheel/spin", headers=admin_headers)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "prize_id" in d
        assert "prize_name" in d
        assert "rarity" in d
        # second spin within 24h should 429
        r2 = requests.post(f"{API}/wheel/spin", headers=admin_headers)
        assert r2.status_code == 429


# ---------------- Store ----------------
class TestStore:
    def test_products_seeded(self):
        r = requests.get(f"{API}/store/products")
        assert r.status_code == 200
        products = r.json()
        assert len(products) >= 7, f"Expected 7 products, got {len(products)}"

    def test_products_filter_uc(self):
        r = requests.get(f"{API}/store/products?category=uc")
        assert r.status_code == 200
        products = r.json()
        assert len(products) >= 1
        for p in products:
            assert p["category"] == "uc"

    def test_purchase_insufficient(self, admin_headers):
        # admin has 0 points typically, buy an expensive product
        products = requests.get(f"{API}/store/products").json()
        # pick most expensive
        prod = max(products, key=lambda x: x["price_points"])
        # ensure admin has less than that
        me = requests.get(f"{API}/auth/me", headers=admin_headers).json()
        if me.get("points", 0) >= prod["price_points"]:
            pytest.skip("Admin has too many points to test insufficient")
        r = requests.post(f"{API}/store/purchase", headers=admin_headers, json={"product_id": prod["product_id"], "pubg_id": "12345"})
        assert r.status_code == 400

    def test_purchase_success(self, admin_headers):
        # give admin points and buy cheapest
        products = requests.get(f"{API}/store/products").json()
        cheapest = min(products, key=lambda x: x["price_points"])
        me = requests.get(f"{API}/auth/me", headers=admin_headers).json()
        if me.get("points", 0) < cheapest["price_points"]:
            # top up via admin adjust-points
            r = requests.post(f"{API}/admin/users/{me['user_id']}/points", headers=admin_headers,
                              json={"delta": cheapest["price_points"] + 100, "reason": "TEST_topup"})
            assert r.status_code == 200
        r = requests.post(f"{API}/store/purchase", headers=admin_headers,
                          json={"product_id": cheapest["product_id"], "pubg_id": "TEST_PUBG"})
        assert r.status_code == 200, r.text
        order = r.json()
        assert order["status"] == "pending"
        assert order["product_id"] == cheapest["product_id"]


# ---------------- Rewards ----------------
class TestRewards:
    def test_my_rewards(self, admin_headers):
        r = requests.get(f"{API}/rewards/mine", headers=admin_headers)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        # After previous wheel spin + purchase, should have items
        sources = {i["source"] for i in items}
        assert "wheel" in sources or "store" in sources


# ---------------- Referrals ----------------
class TestReferrals:
    def test_referrals_mine(self, admin_headers):
        r = requests.get(f"{API}/referrals/mine", headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        assert "invite_code" in data
        assert "invite_link" in data
        assert "friends" in data

    def test_referrals_self_rejected(self, admin_headers):
        me = requests.get(f"{API}/auth/me", headers=admin_headers).json()
        own_code = me.get("invite_code")
        r = requests.post(f"{API}/referrals/redeem", headers=admin_headers, json={"invite_code": own_code})
        # already redeemed OR self -> both 400
        assert r.status_code == 400

    def test_referrals_invalid_code(self, admin_headers):
        r = requests.post(f"{API}/referrals/redeem", headers=admin_headers, json={"invite_code": "NOPE99"})
        assert r.status_code == 400


# ---------------- Notifications ----------------
class TestNotifications:
    def test_notifications_list(self, admin_headers):
        r = requests.get(f"{API}/notifications", headers=admin_headers)
        assert r.status_code == 200
        n = r.json()
        assert isinstance(n, list)


# ---------------- Channels ----------------
class TestChannels:
    def test_list_channels(self):
        r = requests.get(f"{API}/channels")
        assert r.status_code == 200
        ch = r.json()
        assert len(ch) >= 3

    def test_confirm_subscription(self, admin_headers):
        r = requests.post(f"{API}/channels/confirm", headers=admin_headers)
        assert r.status_code == 200


# ---------------- Admin CRUD ----------------
class TestAdminCRUD:
    def test_admin_prizes_crud(self, admin_headers):
        # create
        payload = {"name": "TEST_PRIZE", "rarity": "rare", "weight": 5, "prize_type": "points", "points_value": 25}
        r = requests.post(f"{API}/admin/prizes", headers=admin_headers, json=payload)
        assert r.status_code == 200
        pid = r.json()["prize_id"]
        # get
        r = requests.get(f"{API}/admin/prizes", headers=admin_headers)
        assert r.status_code == 200
        assert any(p["prize_id"] == pid for p in r.json())
        # update
        payload["name"] = "TEST_PRIZE_UPD"
        r = requests.put(f"{API}/admin/prizes/{pid}", headers=admin_headers, json=payload)
        assert r.status_code == 200
        # delete
        r = requests.delete(f"{API}/admin/prizes/{pid}", headers=admin_headers)
        assert r.status_code == 200

    def test_admin_products_crud(self, admin_headers):
        payload = {"name": "TEST_PRODUCT", "category": "items", "price_points": 100}
        r = requests.post(f"{API}/admin/products", headers=admin_headers, json=payload)
        assert r.status_code == 200
        pid = r.json()["product_id"]
        r = requests.put(f"{API}/admin/products/{pid}", headers=admin_headers, json={**payload, "name": "TEST_PRODUCT_UPD"})
        assert r.status_code == 200
        r = requests.delete(f"{API}/admin/products/{pid}", headers=admin_headers)
        assert r.status_code == 200

    def test_admin_channels_crud(self, admin_headers):
        payload = {"name": "TEST_CHAN", "platform": "telegram", "url": "https://t.me/test", "mandatory": False}
        r = requests.post(f"{API}/admin/channels", headers=admin_headers, json=payload)
        assert r.status_code == 200
        cid = r.json()["channel_id"]
        r = requests.delete(f"{API}/admin/channels/{cid}", headers=admin_headers)
        assert r.status_code == 200

    def test_admin_creators_crud(self, admin_headers):
        payload = {"name": "TEST_CREATOR", "platforms": ["youtube"], "url": "https://youtube.com/@x"}
        r = requests.post(f"{API}/admin/creators", headers=admin_headers, json=payload)
        assert r.status_code == 200
        cid = r.json()["creator_id"]
        r = requests.delete(f"{API}/admin/creators/{cid}", headers=admin_headers)
        assert r.status_code == 200

    def test_admin_wheel_config(self, admin_headers):
        r = requests.post(f"{API}/admin/config/wheel", headers=admin_headers, json={"cooldown_hours": 24, "spin_cost_points": 0})
        assert r.status_code == 200

    def test_admin_users_points(self, admin_headers):
        me = requests.get(f"{API}/auth/me", headers=admin_headers).json()
        r = requests.post(f"{API}/admin/users/{me['user_id']}/points", headers=admin_headers,
                          json={"delta": 1, "reason": "TEST_adjust"})
        assert r.status_code == 200
        # verify persisted
        me2 = requests.get(f"{API}/auth/me", headers=admin_headers).json()
        assert me2["points"] == me["points"] + 1

    def test_admin_orders_list(self, admin_headers):
        r = requests.get(f"{API}/admin/orders", headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        assert "orders" in data and "wins" in data

    def test_admin_order_status_update(self, admin_headers):
        r = requests.get(f"{API}/admin/orders", headers=admin_headers)
        orders = r.json().get("orders", [])
        if not orders:
            pytest.skip("no orders to update")
        oid = orders[0]["order_id"]
        r = requests.post(f"{API}/admin/orders/{oid}/status", headers=admin_headers,
                          json={"status": "approved", "admin_note": "TEST_ok"})
        assert r.status_code == 200


# ---------------- Non-admin gating ----------------
class TestAdminGating:
    def test_no_token_admin_endpoint(self):
        r = requests.get(f"{API}/admin/prizes")
        assert r.status_code == 401

    def test_bad_token_admin_endpoint(self):
        r = requests.get(f"{API}/admin/prizes", headers={"Authorization": "Bearer nonsense"})
        assert r.status_code == 401
