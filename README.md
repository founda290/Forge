# Forge Studio

Agentic LLM workspace — 60+ OpenAI-compatible providers, real remote MCP connectors, agent console, projects, skills, subagents, voice I/O. Single-file app (`index.html`) with a serverless backend.

## Stack

| Layer | Service | Where |
|---|---|---|
| App (static) | **Vercel** | `index.html` — zero-build, auto-deploys on push to `main` |
| API | **Vercel Functions** | `api/*.js` — auth, state sync, usage, webhooks, health |
| Database | **Neon Postgres** | schema in `schema.sql`, project `Forge` |
| Gateway / proxy | **Cloudflare Worker** | `worker/worker.js` (`forge-gateway`) — CORS, provider adapters, rate limiting, KV sync |
| KV | **Cloudflare KV** | namespace bound as `FORGE_KV` in the Worker |

## API (Vercel Functions)

| Endpoint | Notes |
|---|---|
| `GET  /api/health` | DB ping + latency |
| `POST /api/auth` | `{action:"register"\|"login", email, password, displayName?}` → `{token, user}`. scrypt hashes, 30-day session tokens (sha256-stored) |
| `GET\|PUT\|DELETE /api/state` | Full workspace sync. `x-forge-device` header scopes snapshots per device. Payload = `{state, prefs}` matching `fs.state`/`fs.prefs` in localStorage |
| `GET\|POST /api/usage` | Token/cost accounting. `POST` accepts a batch of `{provider, model, chatId, promptTokens, completionTokens, costUsd}`; `GET ?detail=models` for per-model rollups |
| `GET\|PUT /api/webhook` | Create/list inbound webhook keys (auth: session token) |
| `POST /api/webhook?key=…` | Queue an agent run: `{"prompt":"…"}` (auth: webhook key) |

## Cloudflare Worker (`forge-gateway`)

Routes: `/v1/chat/completions` (incl. Anthropic adapter + SSE translation), `/models`, `/mcp`, `/fetch`, `/exec`, `/sync` (KV). Auth via `x-forge-token` against the `FORGE_TOKEN` secret; 180 req/min/IP rate limit; CORS wide because all sensitive keys stay client-side and proxy calls are token-gated.

Deploy: `wrangler.toml` + `worker/worker.js`, or copy from the app itself (⚙ menu → Cloudflare Worker → `worker.js` tab).

## Client: Forge Cloud add-on

The floating **☁ Sync** button (bottom-left) opens Forge Cloud:

- **Account** — register/login against `/api/auth`
- **Sync** — push/pull the entire workspace to Neon; optional auto-push on page leave
- **Usage** — real token + cost rollups for the last 30 days (recorded automatically by a `fetch` wrapper on every chat completion, incl. streamed responses)
- **Webhooks** — create inbound keys per project
- **Worker** — one-paste setup for the deployed `forge-gateway` URL + token

## Local development

Static: open `index.html` (cloud features need a deployed `/api`).

```bash
npm install                 # @neondatabase/serverless
vercel dev                  # runs static app + /api functions with DATABASE_URL from .env.local
```

Schema changes: edit `schema.sql`, apply to Neon.

## Roadmap

- [x] P1 — Cloudflare `forge-gateway` Worker, token auth, KV
- [x] P2 — Neon project + schema + workspace sync
- [x] P3 — Vercel headers/hardening, accounts, session auth
- [x] P4 — Real usage accounting, run queue, memories table (RAG vector search next)
- [x] P5 — Inbound webhooks; teams + scheduled cron-run execution next
- [ ] P6 — split `index.html` into modules (Vite), CI
