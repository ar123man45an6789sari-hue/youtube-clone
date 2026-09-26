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
- Task 1 — Group video calling (PeerJS mesh, up to 4 participants) with host
  controls: lock room, remove user, mute/unmute-all, co-host assignment,
  room chat, raise hand, screen share and session-end broadcast
- Task 2 — Controlled downloads: plan-based daily quota, download records
  and a downloads library page
- Task 3 — Subscription plans (Free/Bronze/Silver/Gold), Razorpay test
  payments with signature verification, billing history, confirmation
  emails and automatic expiry downgrade
- Task 4 — Custom video player (see above)
- Task 5 — Security: new-device OTP login over real Gmail, trusted devices,
  login history with IP/location/browser, security page, IST-based automatic
  theme with manual override
- Task 6 — Comment safety and translation: MyMemory translation button,
  profanity filter, spam rate-limit with captcha, link/emoji-flood blocking,
  reporting with admin moderation list

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