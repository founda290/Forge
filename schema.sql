-- Forge Studio · Neon Postgres schema (MVP)
-- Applied to the Forge project · keep in sync with api/ functions

create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  email         citext unique not null,
  password_hash text not null,
  display_name  text,
  created_at    timestamptz not null default now()
);

create table if not exists sessions (
  token_hash  text primary key,
  user_id     uuid not null references users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  user_agent  text
);
create index if not exists sessions_user_idx on sessions(user_id);

-- Full-workspace snapshots per user per device (write-through from localStorage)
create table if not exists state_snapshots (
  id         bigserial primary key,
  user_id    uuid not null references users(id) on delete cascade,
  device_id  text not null,
  payload    jsonb not null,
  bytes      integer not null,
  updated_at timestamptz not null default now(),
  unique (user_id, device_id)
);
create index if not exists state_snapshots_recent on state_snapshots(user_id, updated_at desc);

-- Real token/cost accounting reported by the client
create table if not exists usage_events (
  id               bigserial primary key,
  user_id          uuid references users(id) on delete cascade,
  provider         text not null,
  model            text not null,
  chat_id          text,
  prompt_tokens    integer not null default 0,
  completion_tokens integer not null default 0,
  cost_usd         numeric(12,6) not null default 0,
  created_at       timestamptz not null default now()
);
create index if not exists usage_events_day on usage_events(user_id, created_at desc);

-- Agent run queue (populated by UI, webhooks, and later cron triggers)
create table if not exists agent_runs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references users(id) on delete cascade,
  project_id  text,
  source      text not null default 'ui',        -- ui | webhook | cron
  status      text not null default 'queued',    -- queued | running | done | error
  prompt      text not null,
  result      jsonb,
  error       text,
  started_at  timestamptz,
  finished_at timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists agent_runs_status on agent_runs(status, created_at desc);

-- Inbound webhook endpoints per project (secret key in path)
create table if not exists webhooks (
  key       text primary key,
  user_id   uuid not null references users(id) on delete cascade,
  project_id text not null,
  label     text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

-- Long-lived agent memories injected into prompts (Phase 4)
create table if not exists memories (
  id         bigserial primary key,
  user_id    uuid not null references users(id) on delete cascade,
  project_id text,
  fact       text not null,
  created_at timestamptz not null default now()
);
create index if not exists memories_lookup on memories(user_id, project_id);

-- Audit trail of security-relevant events (Phase 5)
create table if not exists audit_log (
  id         bigserial primary key,
  user_id    uuid references users(id) on delete set null,
  action     text not null,
  detail     jsonb,
  ip         text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists audit_log_user on audit_log(user_id, created_at desc);
