# Chimespace

It is a workspace app for small teams featuring Tasks, chat, whiteboards, and a shared image gallery. All behind Google Oauth login and in one place.

I built this because whenever I made collaborative project with friends, I used discord which was really unorganized and not focused for productive tasks. Few of the  "team collaboration platform" I tried felt like awkwardly bolted seperate projects. I wanted something where we can easily share a workspace with a small team ensuring efficient teamwork. 


## Some features in Chimespace:

- **Workspaces** The central place where everyone engages. It has roles: Owner, Admin, Member. Workspace owners can invite people by email, transfer ownership, and delete the workspace. Admins can manage tasks and remove members but can't delete the workspace itself. Members can do everything else.
- **Tasks** on a three-column board i.e To Do / In Progress / Done. along with inline comments per task to better organize tasks. 
- **Chat** For general chat between members or storing something relevant information related to the project.
- **Whiteboards** Made via Excalidraw in which each workspace has up to 2 whiteboard. Members can draw their thinking and share with team through visual representation (great for someone with visual learning)
- **Gallery** Features direct-to-Cloudinary uploads. JPG / PNG / WebP / GIF files are supported. 50 images per workspace has been allocated. (once uploaded image can be deleted too)
- **Audit log** for owners and admins to review who did what.
- **Member management**: members can be invited by their email, transfer ownership available through email, remove members, leave a workspace.


## Security

Things I made sure to have secure application:

- Every sessions are JWTs stored in HttpOnly + SameSite=Strict + Secure cookies.
- CSRF protection via double-submit cookie pattern with constant-time comparison, validated on every mutating route.
- All role checks happen server-side from the database.
- Input sanitization on every user-supplied string before it hits MongoDB.
- Cloudinary uploads use server-generated signatures in which client cannot tamper with parameters like max file size, and allowed formats.
- CSP headers restricted to specific domains (like Google avatars, Cloudinary, Excalidraw assets).


## What I'd build next, given more time

- WebSockets (or SSE) for chat
- Per-task assignees and due dates
- Markdown rendering in chat messages
- Custom granular roles beyond the flat Owner/Admin/Member hierarchy
- Perform a lot of Tests.


## AI assistance

I used AI tools throughout this project and want to be straightforward about how, because I think honesty about it matters more than pretending I didn't.

**Claude (Anthropic):-** I used Claude for planning the architecture and data model before writing code; debugging things I got stuck on (like when the whiteboard not rendering was a CSS-import + CSP issue Claude helped me track down); reviewing security choices like the CSRF pattern; Most of my Claude conversations were shaped as "here's what I'm trying to do, here's where I'm stuck. what would you change?" I went through the suggestions and made the final calls. There were several times I rejected suggestions like: over-animation on the landing page, certain icon choices, features I didn't want to ship.

**GitHub Copilot:-** I had Copilot enabled in VS Code throughout development for inline autocomplete. It was most useful for boilerplate: repetitive Mongoose schema fields, long Tailwind class strings, the shape of API route handlers that all looked similar. I read every suggestion before accepting it and rejected or edited the ones that didn't fit. Aside from inline autocomplete, I used copilot for animations, page layout, and repetitive boring work, 

**What I did myself:-** every architectural choice and trade-off (chat polling vs WebSockets, draft/publish split for whiteboards, when to use signed Cloudinary uploads vs proxying, the env-gated dev-login bypass design); using correct library (Upstash for Redis-backed rate limiting, Cloudinary for image storage, Excalidraw for the whiteboard, Framer Motion for landing-page animations); the integration work to wire pieces together; debugging deployment issues; testing every flow manually in the browser; the production environment configuration; and the writing in this README. I understand every line of code in the repository.

If you have questions about why something is the way it is, I can answer them.