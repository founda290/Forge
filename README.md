# Forge Studio

One-page agentic workspace for 60+ OpenAI-compatible LLM providers: chat, agents, tools, MCP connectors, voice, boards — now with cloud accounts, cross-device sync, and an edge gateway.

## Stack

| Layer | Service |
|---|---|
| App (Next.js 15 + React 19) | Vercel |
| Postgres (accounts · sessions · sync · usage · webhooks · audit) | Neon |
| Edge gateway (CORS-free provider proxy + KV sync) | Cloudflare Workers + KV |

## Structure

```
app/
  layout.jsx            # fonts + metadata
  globals.css           # design tokens (landing + auth)
  page.jsx              # landing page  /
  signin/page.jsx       # account gate   /signin
  api/
    auth/route.js       # POST register|login -> session token
    state/route.js      # GET/PUT/DELETE workspace snapshots (per device)
    usage/route.js      # GET roll-ups · POST events
    webhook/route.js    # PUT create hook · GET list · POST receive
    health/route.js     # GET liveness + db ping
lib/
  db.js                 # Neon serverless client + Response helpers
  auth.js               # scrypt passwords, session tokens, audit
public/
  studio.html           # the Studio app (served at /studio; sign-in required)
worker/
  worker.js             # Cloudflare forge-gateway (wrangler deploy)
schema.sql              # Neon schema
```

## API

All authenticated routes take `Authorization: Bearer <token>`; state routes take `x-forge-device: <id>`.

| Route | Methods | Purpose |
|---|---|---|
| `/api/auth` | POST `{action:'register'\|'login', email, password}` | create account / session |
| `/api/state` | GET · PUT · DELETE | per-device workspace snapshot sync |
| `/api/usage` | GET (30-day totals; `?detail=models`) · POST events | usage ledger |
| `/api/webhook` | PUT create · GET list · POST `?key=` | inbound run queue + management |
| `/api/health` | GET | liveness, `db:up` check |

## Worker gateway (`forge-gateway`)

Routes: `/` info · `/v1/chat/completions` (OpenAI + Anthropic adapter) · `/models` · `/mcp` · `/fetch` · `/exec` · `/sync`.
Auth: send `x-forge-token: <FORGE_TOKEN>`. Rate limiting: 600/min on chat + fetch only.

```bash
cd worker && npx wrangler deploy && npx wrangler secret put FORGE_TOKEN
```

Then set the gateway URL + token in Studio → Worker proxy.

## Dev

```bash
npm install
npm run dev            # http://localhost:3000
npm run build && npm start
```

Requires `DATABASE_URL` (Neon pooled connection string) in `.env.local`.

## Roadmap

- [x] Accounts + sessions (Neon)
- [x] Workspace snapshot sync per device
- [x] Usage ledger + 30-day roll-ups
- [x] Inbound webhooks → agent_runs queue
- [x] Cloudflare gateway with KV sync
- [x] Landing page + sign-in gate (Next.js)
- [x] Studio runtime layer (run strip, badges, slash commands, chat export)
- [ ] Provider-side spend caps and alerts
- [ ] Team workspaces / shared boards
- [ ] Scheduled agent runs
