# WorkspaceHub — Secure Team Collaboration Platform

Production-structured MVP with Google OAuth, workspace-based RBAC, task management, and team chat.

---

## Tech Stack

| Layer      | Technology                              |
| ---------- | --------------------------------------- |
| Frontend   | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Backend    | Next.js API Routes (no separate server) |
| Database   | MongoDB Atlas (Mongoose ODM)            |
| Auth       | Google OAuth 2.0, JWT in HTTP-only cookies |
| Validation | Zod                                     |
| Deployment | Vercel + MongoDB Atlas free tier        |

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── google/route.ts          # OAuth initiation
│   │   │   │   └── callback/route.ts    # OAuth callback
│   │   │   ├── me/route.ts              # Current user
│   │   │   └── logout/route.ts          # Session clear
│   │   └── workspaces/
│   │       ├── route.ts                 # List / Create
│   │       └── [id]/
│   │           ├── route.ts             # Get / Delete
│   │           ├── invite/route.ts      # Invite member
│   │           ├── members/route.ts     # List / Remove members
│   │           ├── tasks/
│   │           │   ├── route.ts         # List / Create tasks
│   │           │   └── [taskId]/route.ts# Update / Delete task
│   │           └── chat/route.ts        # List / Send messages
│   ├── dashboard/                       # Workspace list page
│   ├── workspace/[id]/                  # Workspace pages
│   │   ├── tasks/page.tsx
│   │   └── chat/page.tsx
│   ├── page.tsx                         # Public landing page
│   └── layout.tsx                       # Root layout
├── components/                          # React client components
├── hooks/                               # Custom React hooks
├── lib/
│   ├── auth.ts                          # JWT sign/verify, cookies, CSRF
│   ├── db.ts                            # MongoDB connection (cached)
│   ├── rbac.ts                          # Role-based access control
│   ├── validation.ts                    # Zod schemas
│   ├── api-response.ts                  # Standardized responses
│   ├── rate-limit.ts                    # In-memory rate limiter
│   ├── sanitize.ts                      # XSS prevention
│   └── client/api.ts                    # Browser fetch wrapper
├── middleware/
│   └── authMiddleware.ts                # Auth + RBAC guard for API routes
├── models/                              # Mongoose schemas
│   ├── User.ts
│   ├── Workspace.ts
│   ├── WorkspaceMember.ts
│   ├── Task.ts
│   ├── ChatMessage.ts
│   └── PendingInvite.ts
├── middleware.ts                         # Next.js Edge middleware (route protection)
└── types/index.ts                       # Shared TypeScript types
```

---

## Prerequisites

- **Node.js** ≥ 18
- **MongoDB Atlas** free cluster ([cloud.mongodb.com](https://cloud.mongodb.com))
- **Google Cloud Console** OAuth 2.0 credentials ([console.cloud.google.com](https://console.cloud.google.com/apis/credentials))

---

## Setup Instructions

### 1. Install dependencies

```bash
npm install
```

### 2. Create environment file

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and fill in:

| Variable               | Description                                    |
| ---------------------- | ---------------------------------------------- |
| `MONGODB_URI`          | MongoDB Atlas connection string                |
| `GOOGLE_CLIENT_ID`     | Google OAuth client ID                         |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret                     |
| `JWT_SECRET`           | Random string ≥ 32 chars (`openssl rand -hex 32`) |
| `NEXT_PUBLIC_APP_URL`  | `http://localhost:3000` (dev) or your domain   |

### 3. Configure Google OAuth

1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Create an **OAuth 2.0 Client ID** (Web application)
3. Add **Authorized redirect URI**: `http://localhost:3000/api/auth/google/callback`
4. For production, add your deployed URL as well

### 4. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Security Features

| Feature                   | Implementation                                         |
| ------------------------- | ------------------------------------------------------ |
| Session storage           | JWT in HTTP-only, SameSite=Strict, Secure cookies      |
| CSRF protection           | Double-submit cookie pattern + constant-time comparison |
| RBAC enforcement          | Server-side role check on every API route               |
| Input validation          | Zod schemas on all request bodies                      |
| XSS prevention            | Server-side HTML entity escaping                       |
| Rate limiting             | In-memory limiter (ready for Redis swap)               |
| Security headers          | X-Content-Type-Options, X-Frame-Options, CSP-ready     |
| OAuth state verification  | Random state token in cookie, validated on callback    |
| No frontend role trust    | Roles always resolved server-side from DB              |
| Standardized errors       | No stack traces or internal details leaked             |

---

## Database Collections & Indexes

| Collection         | Key Indexes                                          |
| ------------------ | ---------------------------------------------------- |
| `users`            | `email` (unique), `googleId` (unique)                |
| `workspaces`       | `ownerId`                                            |
| `workspacemembers`  | `{ workspaceId, userId }` (compound unique)          |
| `tasks`            | `workspaceId`                                        |
| `chatmessages`     | `workspaceId`                                        |
| `pendinginvites`   | `{ email, workspaceId }` (compound unique), TTL 30d  |

---

## API Routes Summary

| Method   | Route                                | Auth | Role       | Description          |
| -------- | ------------------------------------ | ---- | ---------- | -------------------- |
| `GET`    | `/api/auth/google`                   | No   | —          | Start OAuth flow     |
| `GET`    | `/api/auth/google/callback`          | No   | —          | OAuth callback       |
| `GET`    | `/api/auth/me`                       | Yes  | —          | Current user         |
| `POST`   | `/api/auth/logout`                   | No   | —          | Clear session        |
| `GET`    | `/api/workspaces`                    | Yes  | —          | List my workspaces   |
| `POST`   | `/api/workspaces`                    | Yes  | —          | Create workspace     |
| `GET`    | `/api/workspaces/[id]`               | Yes  | Any member | Workspace details    |
| `DELETE` | `/api/workspaces/[id]`               | Yes  | OWNER      | Delete workspace     |
| `POST`   | `/api/workspaces/[id]/invite`        | Yes  | OWNER      | Invite user          |
| `GET`    | `/api/workspaces/[id]/members`       | Yes  | Any member | List members         |
| `DELETE` | `/api/workspaces/[id]/members`       | Yes  | OWNER      | Remove member        |
| `GET`    | `/api/workspaces/[id]/tasks`         | Yes  | Any member | List tasks           |
| `POST`   | `/api/workspaces/[id]/tasks`         | Yes  | Any member | Create task          |
| `PATCH`  | `/api/workspaces/[id]/tasks/[taskId]`| Yes  | Any member | Update task          |
| `DELETE` | `/api/workspaces/[id]/tasks/[taskId]`| Yes  | OWNER/ADMIN| Delete task          |
| `GET`    | `/api/workspaces/[id]/chat`          | Yes  | Any member | Get messages         |
| `POST`   | `/api/workspaces/[id]/chat`          | Yes  | Any member | Send message (5/10s) |

---

## RBAC Roles

| Role     | Invite | Remove Members | Manage Tasks | Delete Tasks | Delete Workspace | Chat |
| -------- | ------ | -------------- | ------------ | ------------ | ---------------- | ---- |
| OWNER    | ✅      | ✅              | ✅            | ✅            | ✅                | ✅    |
| ADMIN    | ❌      | ❌              | ✅            | ✅            | ❌                | ✅    |
| MEMBER   | ❌      | ❌              | ✅            | ❌            | ❌                | ✅    |

---

## Deployment (Vercel)

1. Push to GitHub
2. Import project in [vercel.com](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Update `NEXT_PUBLIC_APP_URL` to your Vercel domain
5. Add the production callback URL to Google Cloud Console

---

## Future Expansion (Phase 2+)

This codebase is designed for easy addition of:

- [ ] Redis-backed rate limiting (swap `rate-limit.ts` store)
- [ ] WebSocket real-time chat (add alongside polling)
- [ ] Email verification / magic links
- [ ] File attachments (S3 / R2 integration)
- [ ] Audit logging middleware
- [ ] Custom role definitions
- [ ] Workspace settings and branding
