# Chimespace

A workspace app for small teams. Tasks, chat, whiteboards, and a shared image gallery. All behind Google login, in one place.

I built this because every "team collaboration platform" I tried felt like five separate products awkwardly bolted together. I wanted something where opening one workspace gets you everything, without the noise.

---

## What's in it

- **Workspaces** with role-based permissions: Owner, Admin, Member. Owners can invite people by email, transfer ownership, and delete the workspace. Admins can manage tasks and remove members but can't delete the workspace itself. Members can do everything else.
- **Tasks** on a three-column board (To Do / In Progress / Done). Inline comments per task. Optimistic UI — moves and deletes update instantly without a page refresh.
- **Chat** per workspace. Polling-based, not WebSockets, deliberately (more on that below).
- **Whiteboards** via Excalidraw. Drafts autosave every 2 seconds, published snapshots every 30 seconds. Up to 2 boards per workspace.
- **Gallery** with direct-to-Cloudinary uploads. JPG / PNG / WebP / GIF up to 10 MB. 50 images per workspace.
- **Audit log** for owners and admins to review who did what.
- **Member management**: invite by email, transfer ownership, remove members, leave a workspace.

---

## How it's built

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind CSS with a custom design system (ink/paper/accent tokens, Space Grotesk + Inter type pairing) |
| Database | MongoDB Atlas via Mongoose |
| Auth | Google OAuth 2.0, JWT in HttpOnly cookies, double-submit CSRF |
| Media uploads | Cloudinary with signed direct-from-browser uploads (the API secret never leaves the server) |
| Rate limiting | Upstash Redis sliding-window, with an in-memory fallback for local dev |
| Validation | Zod on every request body |
| Whiteboards | Excalidraw (client-only; draft/published state persisted as JSON) |
| Animation | Framer Motion, respecting `prefers-reduced-motion` everywhere |
| Hosting | Vercel free tier + weekly cron job to keep Upstash active |

---

## Security

Things I made sure to get right:

- Sessions are JWTs stored in HttpOnly + SameSite=Strict + Secure cookies. No tokens in client storage.
- CSRF protection via double-submit cookie pattern with constant-time comparison, validated on every mutating route.
- All role checks happen server-side from the database. The client never declares its own role.
- Input sanitization on every user-supplied string before it hits MongoDB.
- Cloudinary uploads use server-generated signatures that constrain folder, max file size, and allowed formats. The client cannot tamper with those parameters.
- CSP headers restricted to specific domains (Google avatars, Cloudinary, Excalidraw assets).
- The dev-only `/api/dev/login` route (used for automated UI testing) returns 404 unless **both** `NODE_ENV !== 'production'` **and** `DEV_AUTH_BYPASS === 'true'`. It's invisible in production.
- Standardized error responses — no stack traces, no internal details leaked.

---

## Setup

### Prerequisites
- Node.js 18+
- MongoDB Atlas cluster (free tier works)
- Google OAuth 2.0 credentials
- Cloudinary account (free tier works)
- Upstash Redis database (free tier works; optional for local dev)

### 1. Install

```bash
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env.local` and fill in the values:

| Variable | What it is |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | OAuth credentials from Google Cloud Console |
| `JWT_SECRET` | Random string ≥ 32 chars. Generate with `openssl rand -hex 32` |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` for dev; your domain in prod |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | From the Cloudinary dashboard |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Same cloud name as above; needs the `NEXT_PUBLIC_` prefix to be available client-side for upload URLs |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | From the Upstash console. Optional locally — the rate limiter falls back to in-memory if these are unset |
| `CRON_SECRET` | Random string used to authenticate the weekly Redis keepalive cron |
| `DEV_AUTH_BYPASS` | Leave unset or `false` everywhere. Set to `true` only for local automated testing |

### 3. Google OAuth

In Google Cloud Console, create an OAuth 2.0 client ID (Web application) and add `http://localhost:3000/api/auth/google/callback` as an authorized redirect URI. Add the production URL too when deploying.

### 4. Run

```bash
npm run dev
```

Open http://localhost:3000.

---

## Project structure

```
src/
├── app/
│   ├── api/                          # All backend routes
│   │   ├── auth/                     # Google OAuth + session
│   │   ├── workspaces/[id]/          # Workspace, tasks, chat, gallery, whiteboards, members, invites, audit log
│   │   ├── cron/redis-keepalive/     # Weekly Upstash ping
│   │   └── dev/login/                # Local-only auth bypass for testing
│   ├── workspace/[id]/               # Workspace pages: overview, tasks, chat, gallery, whiteboards
│   ├── dashboard/                    # User's workspace list
│   ├── icon.svg                      # Favicon (auto-served by Next.js 14)
│   ├── layout.tsx                    # Root layout + global metadata
│   └── page.tsx                      # Public landing page (server component)
├── components/
│   ├── motion/                       # Reveal + Parallax wrappers, reduced-motion safe
│   ├── ui/                           # Button, ConfirmDialog
│   ├── TaskBoard.tsx                 # Three-column task board
│   ├── ChatPanel.tsx                 # Polling chat with rate-limit handling
│   ├── WhiteboardEditor.tsx          # Excalidraw wrapper with draft/publish split
│   ├── GalleryGrid.tsx               # Cloudinary upload + image grid
│   └── LandingClient.tsx             # The animated landing page
├── lib/
│   ├── auth.ts                       # JWT, session cookies, CSRF
│   ├── rbac.ts                       # Role enforcement helpers
│   ├── cloudinary.ts                 # Signed upload params + destroy
│   ├── redis.ts                      # Upstash client
│   ├── rate-limit.ts                 # Hybrid limiter (Upstash + in-memory fallback)
│   ├── validation.ts                 # Zod schemas for all routes
│   └── sanitize.ts                   # XSS prevention
├── middleware.ts                     # Next.js Edge middleware (route protection)
└── models/                           # Mongoose schemas
```

---

## A few design decisions worth explaining

**Polling for chat, not WebSockets.** Real-time WebSockets are technically the right answer for chat, but they add meaningful complexity on serverless platforms (Vercel doesn't support persistent connections without an extra service). Polling at a reasonable interval gives an acceptable experience for small-team chat and keeps the deployment story simple. If this app got serious traction, WebSockets (or Server-Sent Events) would be the first thing to revisit.

**Direct-to-Cloudinary uploads.** The browser uploads images straight to Cloudinary using a signature my server generates. This is more secure than proxying through my API (the API secret never leaves the server) and avoids my serverless functions handling large file payloads. The trade-off is that the client does three requests instead of one — request a signature, upload to Cloudinary, then save metadata to my API.

**Draft/published split on whiteboards.** Excalidraw state is persisted in two slots: a constantly-updating `draftState` (autosaved every 2 seconds) and a `publishedState` (snapshotted every 30 seconds or on manual publish). This means viewers see a stable board even while someone else is actively drawing.

**Hybrid rate limiter.** A single `rateLimiter.check()` interface routes to Upstash when its env vars are set and falls back to an in-process Map when they aren't. This lets me develop locally without needing Redis, while still being accurate across serverless instances in production.

**Restraint on UI chrome.** No analytics popups, no upgrade prompts, no "are you sure you want to leave?" dialogs, no emoji. One accent color, a paper/ink palette, and animations only where they communicate something — modal entrances, the interactive landing-page preview, list updates. Everything respects `prefers-reduced-motion`. The default look is supposed to feel like a tool, not a marketing surface.

---

## Deployment

Deploys to Vercel as-is. After connecting the repo:

1. Add all env vars from `.env.example` to the Vercel project settings.
2. **Confirm `DEV_AUTH_BYPASS` is unset or `false` in production.** This is the only env var with security implications.
3. Update the Google OAuth client to include your production callback URL.
4. `vercel.json` schedules a weekly cron at `/api/cron/redis-keepalive` to keep the Upstash database from going idle on the free tier. Vercel auto-authenticates this with the `CRON_SECRET` env var.

---

## What I'd build next, given more time

- WebSockets (or SSE) for chat
- Per-task assignees and due dates
- Markdown rendering in chat messages
- A real account-deletion flow (currently only workspaces can be deleted)
- Custom granular roles beyond the flat Owner/Admin/Member hierarchy
- Tests. Honest answer: I didn't write any. The project was scoped to be functional and visually complete rather than CI-green. Tests would be the first thing I'd add before extending features further.

---

## AI assistance

I used AI tools throughout this project and want to be straightforward about how, because I think honesty about it matters more than pretending I didn't.

**Claude (Anthropic)** — I used Claude for: planning the architecture and data model before writing code; debugging things I got stuck on (the whiteboard not rendering was a CSS-import + CSP issue Claude helped me track down); reviewing security choices like the CSRF pattern and the Cloudinary signed-upload flow; Most of my Claude conversations were shaped as "here's what I'm trying to do, here's where I'm stuck — what would you change?" I went through the suggestions and made the final calls. There were several times I rejected suggestions: over-animation on the landing page, certain icon choices, features I didn't want to ship.

**GitHub Copilot** — I had Copilot enabled in VS Code throughout development for inline autocomplete. It was most useful for boilerplate: repetitive Mongoose schema fields, long Tailwind class strings, the shape of API route handlers that all looked similar. I read every suggestion before accepting it and rejected or edited the ones that didn't fit. Aside from inline autocomplete, I used copilot for animations, page layout, and repetitive boring work, 

**What I did myself:** every architectural choice and trade-off (chat polling vs WebSockets, draft/publish split for whiteboards, when to use signed Cloudinary uploads vs proxying, the env-gated dev-login bypass design); using correct library (Upstash for Redis-backed rate limiting, Cloudinary for image storage, Excalidraw for the whiteboard, Framer Motion for landing-page motion); the integration work to wire pieces together; debugging deployment issues; testing every flow manually in the browser; the production environment configuration; and the writing in this README. I understand every line of code in the repository — if you have questions about why something is the way it is, I can answer them.