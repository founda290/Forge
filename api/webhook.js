import { randomBytes, randomUUID } from "node:crypto";
import { sql, json, bad } from "./_db.js";
import { requireUser } from "./_auth.js";

async function handler(req) {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });

  if (req.method === "POST") {
    const key = new URL(req.url).searchParams.get("key") || "";
    if (!key) return bad("Missing webhook key", 401);
    const rows = await sql`
      select user_id, project_id, label from webhooks where key = ${key}
    `;
    const hook = rows[0];
    if (!hook) return bad("Unknown webhook key", 404);

    let body;
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    const prompt = String(body.prompt || body.text || "").trim();
    if (!prompt) return bad("Missing prompt", 400);

    const inserted = await sql`
      insert into agent_runs (user_id, project_id, source, prompt)
      values (${hook.user_id}, ${hook.project_id}, 'webhook', ${prompt.slice(0, 8000)})
      returning id, created_at
    `;
    await sql`update webhooks set last_used_at = now() where key = ${key}`;
    return json({ ok: true, runId: inserted[0].id, queuedAt: inserted[0].created_at }, 202);
  }

  if (req.method === "GET") {
    const user = await requireUser(req);
    const hooks = await sql`
      select key, project_id, label, created_at, last_used_at
      from webhooks where user_id = ${user.id} order by created_at desc limit 50
    `;
    return json({ webhooks: hooks });
  }

  if (req.method === "PUT") {
    const user = await requireUser(req);
    let body;
    try {
      body = await req.json();
    } catch {
      return bad("Invalid JSON body");
    }
    if (!body.projectId) return bad("projectId required");
    const key = (await randomUUID?.()) || randomBytes(24).toString("hex");
    const inserted = await sql`
      insert into webhooks (key, user_id, project_id, label)
      values (${key}, ${user.id}, ${String(body.projectId).slice(0, 64)}, ${body.label ? String(body.label).slice(0, 80) : null})
      returning key
    `;
    return json({ ok: true, key: inserted[0].key }, 201);
  }

  return bad("Method not allowed", 405);
}
export const PUT = handler;
export const POST = handler;
export const OPTIONS = handler;

export default { fetch: handler };
