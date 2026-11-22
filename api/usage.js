import { sql, json, bad } from "./_db.js";
import { requireUser } from "./_auth.js";

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
};

export default async function handler(req) {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });
  let user;
  try {
    user = await requireUser(req);
  } catch (err) {
    return err;
  }

  if (req.method === "POST") {
    let body;
    try {
      body = await req.json();
    } catch {
      return bad("Invalid JSON body");
    }
    const events = Array.isArray(body) ? body : [body];
    for (const event of events.slice(0, 100)) {
      await sql`
        insert into usage_events
          (user_id, provider, model, chat_id, prompt_tokens, completion_tokens, cost_usd)
        values (${user.id}, ${String(event.provider || "unknown").slice(0, 60)},
                ${String(event.model || "unknown").slice(0, 120)},
                ${event.chatId ? String(event.chatId).slice(0, 64) : null},
                ${num(event.promptTokens)}, ${num(event.completionTokens)},
                ${Number.isFinite(Number(event.costUsd)) ? Number(event.costUsd) : 0})
      `;
    }
    return json({ ok: true, recorded: events.slice(0, 100).length });
  }

  if (req.method === "GET") {
    if (new URL(req.url).searchParams.get("detail") === "models") {
      const rows = await sql`
        select provider, model,
               count(*)::int as calls,
               coalesce(sum(prompt_tokens), 0)::int as prompt_tokens,
               coalesce(sum(completion_tokens), 0)::int as completion_tokens,
               coalesce(sum(cost_usd), 0)::float as cost_usd
        from usage_events where user_id = ${user.id}
        group by provider, model order by 6 desc limit 50
      `;
      return json({ byModel: rows });
    }
    const rows = await sql`
      select date_trunc('day', created_at)::date as day,
             count(*)::int as calls,
             coalesce(sum(prompt_tokens), 0)::int as prompt_tokens,
             coalesce(sum(completion_tokens), 0)::int as completion_tokens,
             coalesce(sum(cost_usd), 0)::float as cost_usd
      from usage_events where user_id = ${user.id}
        and created_at > now() - interval '30 days'
      group by 1 order by 1 desc
    `;
    const totals = rows.reduce(
      (acc, row) => ({
        calls: acc.calls + row.calls,
        promptTokens: acc.promptTokens + row.prompt_tokens,
        completionTokens: acc.completionTokens + row.completion_tokens,
        costUsd: acc.costUsd + row.cost_usd,
      }),
      { calls: 0, promptTokens: 0, completionTokens: 0, costUsd: 0 }
    );
    return json({ totals, daily: rows });
  }

  return bad("Method not allowed", 405);
}

export const GET = handler;
export const POST = handler;
export const OPTIONS = handler;
