# YouTube Clone — Full Stack Internship Project

A YouTube-style video platform built during training and extended with
internship tasks (video calling, subscriptions, downloads, security,
multilingual comments and a custom video player).

## Live Demo
- Frontend (Vercel): https://youtube-clone-alpha-navy-45.vercel.app
- Backend API (Render): https://youtube-clone-fx5u.onrender.com

## Tech Stack
- Frontend: Next.js 16 (App Router), TypeScript, React 19, Tailwind CSS v4, PeerJS
- Backend: Node.js, Express 5, Mongoose (ES Modules)
- Database: MongoDB Atlas
- Media storage: Cloudinary
- Payments: Razorpay (test mode)
- Emails: Nodemailer (Gmail app password)
- Deployment: Vercel (frontend) + Render (backend)

## Features
### Core platform
- Video upload with Cloudinary storage and thumbnails
- Home feed, channel pages, search, history, liked videos, watch later
- Custom HTML5 video player: keyboard shortcuts, speeds, theater mode,
  picture-in-picture, resume playback, buffered bar, hover time preview,
  captions demo (WebVTT) and autoplay-next countdown
- Comments with replies, likes/dislikes, edit window, delete and sorting
- Authentication: signup, login, forgot/reset password, session context

### Internship tasks
- Task 1 — Real-time video calling (PeerJS mesh, WebRTC DTLS-SRTP encryption,
  up to 4 participants). Sign-in required, lobby with "new meeting" or
  "join with room ID"/invite link, mute/unmute, camera on/off, front/rear
  camera switch, screen share, raise hand, participant list, speaking
  indicator, per-participant mic/camera status, connection-quality meter,
  call duration, in-call chat with emojis and file sharing, local call
  recording, data-saver (low bandwidth) mode, noise suppression, reconnect
  after network drops/refresh, permission-denied handling, max participant
  limit, and host moderation: mute one/all, remove, lock room, assign
  co-host, allow or block chat and screen share per participant
- Task 2 — Controlled downloads: plan-based daily AND monthly quota,
  duplicate (24h) re-downloads that do not consume quota, blocked/failed/
  interrupted download records, registered-device limit, expiry downgrade,
  full audit log (user, video, time, IP, city, browser, OS, device, plan)
  and a downloads library page with the remaining quota meter
- Task 3 — Subscription plans (Free/Bronze/Silver/Gold) with monthly,
  quarterly and yearly billing cycles, feature comparison table, Razorpay
  test payments with signature verification, duplicate-payment protection,
  failed/cancelled payment records, renewal that extends the remaining days,
  cancel (stop renewal or downgrade now), billing history with invoice,
  order and payment ids, invoice confirmation email and automatic expiry
  downgrade to Free with data preserved
- Task 4 — Custom HTML5 player: play/pause, draggable volume, mute, speeds
  (0.5x-2x) with a menu, 10s seek, theater, fullscreen, PiP, captions,
  buffered bar, remaining time, quality info, loading spinner, resume from
  last position, periodic progress saving, completion marking, autoplay
  countdown with cancel, timeline frame previews, auto-hiding controls,
  only one video can play at a time, and full keyboard shortcuts
- Task 5 — Security: IST time-based theme (5 AM-12 PM light, else dark) saved
  in the profile with manual override, OTP over real Gmail on a new device,
  browser, IP address, city or state, trusted devices for 7 days, login
  history with public IP, browser + version, OS, device type/model, city,
  state, country, failed password and failed OTP records, and a security
  page with session management
- Task 6 — Comments: multilingual translation (12 languages), username,
  avatar, location, time and edited status, likes/dislikes, replies,
  @mention suggestions, edit window with conflict detection, soft delete
  that keeps replies, sorting, profanity filter, duplicate and spam
  rate-limiting with captcha, emoji/symbol flood and link blocking,
  reporting with reasons and an admin moderation queue with action logs

## Project Structure
- `youtube/` — Next.js frontend (app router pages, components, context, lib)
- `server/` — Express backend (models, controllers, routes, db.js, index.js)

## Local Setup
Backend:
1. `cd server` and `npm install`
2. Create `.env` with: MONGO_URI, MAIL_USER, MAIL_PASS, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
3. `npm run dev` (runs on http://localhost:5000)

Frontend:
1. `cd youtube` and `npm install`
2. Create `.env.local` with: NEXT_PUBLIC_API_URL=http://localhost:5000
3. `npm run dev` (runs on http://localhost:3000)

## Notes
- Razorpay is used in TEST mode only; signature verification happens on the backend.
- PeerJS public cloud is used for call signaling; media flows peer-to-peer.
- Translation uses the free MyMemory API and falls back gracefully on failure.

## Internship
Elevance Skills internship project — day-wise progress is visible in the
git commit history (Day 1 to Day 30).