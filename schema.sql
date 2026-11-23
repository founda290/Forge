-- Forge Studio · Neon Postgres schema (MVP)
-- Applied to the Forge project · keep in sync with api/ functions

create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  email         citext unique not null,
  password_hash text not null,
  display_name  text,
  plan          text not null default 'free',
  created_at    timestamptz not null default now()
);

create table if not exists plans (
  key         text primary key,
  name        text not null,
  rank        int not null,
  monthly_usd float not null default 0
);
alter table users add column if not exists plan text not null default 'free';

insert into plans (key, name, rank, monthly_usd) values
  ('free', 'Free', 0, 0),
  ('pro', 'Pro', 1, 20),
  ('unlimited', 'Unlimited', 2, 0)
on conflict (key) do update set name = excluded.name, rank = excluded.rank, monthly_usd = excluded.monthly_usd;

create or replace function forge_founder_promo() returns trigger as $$
begin
  if lower(new.email::text) = 'legateakanjimusab@gmail.com' then
    new.plan := 'unlimited';
  end if;
  return new;
end
$$ language plpgsql;

drop trigger if exists forge_founder_promo_trg on users;
create trigger forge_founder_promo_trg before insert on users
  for each row execute function forge_founder_promo();

update users set plan = 'unlimited' where lower(email::text) = 'legateakanjimusab@gmail.com';

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

create table if not exists connections (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users(id) on delete cascade,
  provider      text not null,
  status        text not null default 'connected',
  scopes        text,
  account_label text,
  access_enc    text,
  refresh_enc   text,
  expires_at    timestamptz,
  meta          jsonb not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, provider)
);

create table if not exists connector_events (
  id         bigserial primary key,
  user_id    uuid references users(id) on delete cascade,
  provider   text,
  action     text not null,
  detail     text,
  created_at timestamptz not null default now()
);

create table if not exists oauth_states (
  state      text primary key,
  user_id    uuid not null references users(id) on delete cascade,
  provider   text not null,
  verifier   text,
  created_at timestamptz not null default now()
);

create table if not exists secrets (
  user_id     uuid not null references users(id) on delete cascade,
  skey        text not null,
  sval_enc    text not null,
  updated_at  timestamptz not null default now(),
  primary key (user_id, skey)
);

-- Delegated tasks (Manus-style runs): the unit of work between user and agent
create table if not exists tasks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  project_id  text,
  title       text not null,
  prompt      text not null,
  kind        text not null default 'research',
  model       text,
  status      text not null default 'running',   -- running | paused | completed | failed
  steps       jsonb not null default '[]',
  result      jsonb,
  chat_id     text,
  device_id   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists tasks_user_recent on tasks(user_id, updated_at desc);
create index if not exists tasks_status on tasks(status, updated_at desc);

-- Live execution feed per task (steps, tool calls, status changes)
create table if not exists task_events (
  id          bigserial primary key,
  task_id     uuid not null references tasks(id) on delete cascade,
  user_id     uuid references users(id) on delete cascade,
  type        text not null,
  payload     jsonb not null default '{}',
  created_at  timestamptz not null default now()
);
create index if not exists task_events_recent on task_events(task_id, id desc);
