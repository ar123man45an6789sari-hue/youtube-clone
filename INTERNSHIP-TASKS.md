# Internship Tasks — Implementation Notes

Project: YouTube Clone (Next.js 16 + Express 5 + MongoDB Atlas)
Author: Arman Ansari

Live frontend: https://youtube-clone-alpha-navy-45.vercel.app
Live backend API: https://youtube-clone-fx5u.onrender.com

This document maps every requirement of the six internship tasks to the place
where it is implemented, so the work can be reviewed quickly.

---

## Task 1 — Real-time video calling (`/meet`)

Signalling uses PeerJS; media flows peer-to-peer over WebRTC with STUN and a
public TURN relay for mobile networks.

| Requirement | Implementation |
|---|---|
| One-to-one and group calls | Mesh topology, up to 4 participants (`MAX_PEOPLE`) |
| Unique meeting link and room ID | Lobby with "Start a new meeting" and "Join with a room ID"; `Copy Room Link` shares `/meet?room=<id>` |
| Mute / unmute microphone | Audio track toggle, state broadcast to every peer |
| Enable / disable camera | Video track toggle; remote tiles show a "camera is off" placeholder |
| Front / rear camera switch | `facingMode` re-capture plus `RTCRtpSender.replaceTrack`; button appears only when the device has more than one camera |
| Screen sharing | `getDisplayMedia` with track replacement, auto-restore of the camera when sharing stops |
| Leave / end call | Guests leave; the host broadcasts a session-ended message to everyone |
| Participant list | "People" panel listing every participant with their status and host controls |
| Raise hand | Broadcast flag with a badge on the tile and in the list |
| In-call chat (messages, emojis, files) | Data-channel chat, emoji picker, file transfer up to 2 MB rebuilt as a download link |
| Participant names | Taken from the signed-in account |
| Speaking indicator | Web Audio analyser per stream, green ring and dot |
| Microphone / camera status | Icons on each tile and in the participant list |
| Connection quality | `RTCPeerConnection.getStats()` packet loss and round-trip time mapped to good / fair / poor |
| Call duration | Live timer in the header and the control bar |
| Host: mute a participant / mute everyone | Per-user mute button and a mute-all control |
| Host: remove a user | Remove button; a co-host sends a removal request to the host |
| Host: lock the meeting | Locked rooms reject new data and media connections with a reason |
| Host: assign co-host | One co-host at a time, with mute and remove rights |
| Host: manage permissions | Chat and screen-share can be allowed or blocked per participant |
| Call recording (optional) | `MediaRecorder` mixing the local video with every microphone; the file stays on the recorder's device |
| Reconnection after network loss | PeerJS `disconnected` handler calls `reconnect()`, plus a manual "Rejoin Room" button |
| Browser refresh | Room id is kept in `sessionStorage` and the invite link rejoins the same room |
| Device switching during a call | Track replacement keeps the call alive when the camera or source changes |
| Microphone / camera permission denial | Dedicated error panel with the exact cause and a Retry button |
| Background noise suppression | `noiseSuppression`, `echoCancellation` and `autoGainControl` constraints |
| Low-bandwidth adaptation | Encoder bitrate and resolution are reduced automatically on poor links, plus a manual data-saver button |
| Maximum participants | Fourth join attempt is rejected with a clear message |
| Secure meeting authentication | Only authenticated users can create or join a room |
| End-to-end encryption | WebRTC DTLS-SRTP, stated in the interface |

## Task 2 — Controlled video download management (`/downloads`)

Daily limits: Free 1, Bronze 3, Silver 5, Gold 10.
Monthly limits: Free 5, Bronze 40, Silver 90, Gold 250.

- Every request validates the user, the active subscription (an expired paid plan is
  downgraded to Free first), the video, the device and both quotas before the file is served.
- The Downloads page shows the title, thumbnail, date and time, status, file size, plan used,
  device, browser, location, IP, remaining daily and monthly quota, device count and the
  next quota reset time.
- Each attempt is stored for auditing: user id, video id, timestamp, IP address, city, state,
  country, browser with version, operating system, device type and model, device token,
  subscription plan, file size, status and a note.
- Misuse protection: a repeat download of the same video within 24 hours does not consume
  quota again; Free users cannot exceed one video per day; downloads stop after a subscription
  expires; a maximum of three registered devices per account; blocked attempts are recorded;
  interrupted or failed downloads are marked and do not consume quota; quotas reset at the
  start of each day and month.

## Task 3 — Subscription management (`/pricing`, `/subscription`)

- Four plans — Free, Bronze, Silver, Gold — with progressive streaming quality, download
  limits, watch time, advertisement policy and premium access, shown both as cards and as a
  full comparison table.
- Billing cycles: monthly, quarterly (10% discount) and yearly (20% discount).
- Razorpay test integration: order creation on the server, checkout on the client, signature
  verification with HMAC SHA-256 before anything is activated.
- Payment edge cases: successful payment, failed payment, dismissed checkout, duplicate order
  creation (an open order is reused), duplicate verification of the same payment id, and
  network interruption during verification.
- Each transaction stores the payment id, order id, invoice number, amount, currency, billing
  cycle, status, subscription start date, expiry date and the renewal type.
- The dashboard shows the current plan, status, days remaining, billing cycle, start date, next
  renewal date, auto-renewal state, the unlocked premium features and the complete billing
  history.
- Users can upgrade, downgrade, renew (remaining days are added to the new period), cancel the
  renewal only, or cancel and downgrade immediately. Expired subscriptions fall back to Free
  automatically while watch history and user data are preserved.
- A confirmation email with the invoice, payment details, validity and support contact is sent
  immediately after a verified payment.

## Task 4 — Custom HTML5 video player

Native controls are disabled; the entire interface is custom.

Play and pause, draggable volume slider, mute, playback speeds 0.5×, 1×, 1.25×, 1.5× and 2×
from a menu, ten-second seeking, theater mode, full screen, Picture-in-Picture and subtitles.
The player displays current time, total duration, remaining time, buffered progress, playback
progress, a loading indicator, the video quality and an autoplay countdown with a cancel
option. Playback position is restored on return, progress is saved every five seconds, the
video is marked complete after a configurable percentage (90% by default) and only one video
can play on the site at a time.

Keyboard shortcuts: Space or K play and pause, arrow left and right or J and L seek ten
seconds, Shift with the arrows seeks thirty seconds, arrow up and down change the volume,
M mutes, C toggles subtitles, F toggles full screen, T toggles theater mode, P toggles
Picture-in-Picture, N plays the next video, and `<` and `>` change the playback speed.
Hovering the timeline shows a frame preview with the timestamp, and the controls hide after
three seconds of inactivity and return on mouse movement.

## Task 5 — Login-time personalisation and account security (`/security`)

- A login between 05:00 and 12:00 IST switches the interface to the light theme; any other time
  uses the dark theme. The result is stored on the user profile (`theme`, `themeAuto`) so a
  manual choice overrides the rule and follows the user to other sessions and devices.
- Every login records the public IP address (taken from `x-forwarded-for`), browser name and
  version, operating system, device type, device model where available, timestamp, city, state
  and country.
- One-time password verification by email is required for a new device, a new browser, a new IP
  address, a new city or a new state. A verified browser is trusted for seven days.
- Successful logins, OTP requests, failed OTP attempts, wrong password attempts and the reason
  for each verification are available on the account security page, together with the trusted
  device list, individual removal and a "sign out from all devices" action.
- Passwords are hashed with bcrypt (accounts created before the change are re-hashed on their
  next successful login) and the API never returns password hashes or OTP codes.

## Task 6 — Multilingual commenting system

- Translation into twelve languages through a per-comment Translate button, with a graceful
  message when the translation service is unavailable.
- Each comment shows the username, avatar, location, posted date and time and an edited badge.
- Likes, dislikes, replies, @mention suggestions and highlighting, editing within ten minutes
  with detection of a simultaneous edit, deletion that keeps existing replies through a
  placeholder, and sorting by newest, oldest, most liked or most relevant.
- Safety: profanity filter, duplicate comment detection, rate limiting of three comments per
  minute with a captcha after repeated posting, emoji and special-character flood blocking and
  link blocking.
- Reporting with predefined reasons (spam, harassment, offensive content); duplicate reports by
  the same user are rejected and reported comments are queued for an administrator instead of
  being deleted automatically.
- The moderation queue at `/admin/reports` lists the reports with their reasons and times and
  allows an administrator to hide, unhide or dismiss, with every action kept in a moderation log.

---

## Local setup

Backend

```bash
cd server
npm install
# .env : MONGO_URI, MAIL_USER, MAIL_PASS, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
npm run dev          # http://localhost:5000
```

Frontend

```bash
cd youtube
npm install
# .env.local : NEXT_PUBLIC_API_URL=http://localhost:5000
npm run dev          # http://localhost:3000
```
