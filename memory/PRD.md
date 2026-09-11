# HEEBA — PUBG Rewards & Lucky Wheel

## Overview
Arabic-first, RTL, Battle-Royale-themed rewards platform. Users log in with Google, subscribe to mandatory channels, spin a daily lucky wheel, buy PUBG-themed rewards from a points-based store, invite friends, follow content creators, and receive notifications. Admin controls everything from an in-app dashboard.

## Tech Stack
- Backend: FastAPI + MongoDB (motor)
- Frontend: Expo React Native (SDK 57), Expo Router, react-native-reanimated, react-native-svg
- Auth: Emergent Google OAuth (users) + Admin Email/Password (JWT)
- Storage: Emergent Managed Object Storage for admin-uploaded prize/product images
- Theme: Dark PUBG palette (gold #F5A623, orange #FF5722, military green touches). Rarity tiers: Common, Rare, Epic, Legendary

## Main Features
- Google login screen with hero + admin fallback
- Mandatory channel subscription gate (Telegram/YouTube/etc.)
- Home Lobby (player card, wheel CTA, referral CTA, quick tiles, admin panel)
- Lucky Wheel with 24h cooldown, weighted probabilities, animated SVG wheel with pointer & result overlay
- HEEBA PUBG Rewards Store (categories: UC/Skins/Boxes/Items, rarity badges, buy with points)
- My Rewards (wheel wins + store orders, status: pending/approved/delivered/rejected)
- PUBG-style Player Profile (avatar, level bar, stats, points log)
- Referrals (invite link, share, redeem code, +10 pts per friend)
- Content Creators directory with platform filters
- Notifications feed
- Admin Dashboard: Prizes CRUD (name, image, rarity, weight, points, stock, active), Products CRUD, Users (adjust points), Orders (change status), Channels CRUD, Creators CRUD, Wheel settings (cooldown/cost)

## Admin Credentials
- Email: `admin@heeba.app`
- Password: `Heeba@Admin2026`

## Env Variables (backend)
- MONGO_URL, DB_NAME
- EMERGENT_LLM_KEY (for Object Storage)
- ADMIN_EMAIL, ADMIN_PASSWORD, JWT_SECRET
