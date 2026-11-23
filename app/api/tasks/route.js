import { sql, json, bad } from "../../../lib/db.js";
import { requireUser } from "../../../lib/auth.js";

const clip = (v, n) => (v == null ? "" : String(v).slice(0, n));

async function handler(req) {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });
  let user;
  try {
    user = await requireUser(req);
  } catch (err) {
    return err;
  }

  if (req.method === "GET") {
    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 200);
    const status = url.searchParams.get("status");
    const rows = status
      ? await sql`
          select id, title, prompt, kind, model, status, steps, result, chat_id, project_id,
                 created_at, updated_at
          from tasks where user_id = ${user.id} and status = ${status}
          order by updated_at desc limit ${limit}`
      : await sql`
          select id, title, prompt, kind, model, status, steps, result, chat_id, project_id,
                 created_at, updated_at
          from tasks where user_id = ${user.id}
          order by updated_at desc limit ${limit}`;
    return json({ tasks: rows });
  }

  if (req.method === "POST") {
    let body;
    try {
      body = await req.json();
    } catch {
      return bad("Invalid JSON body");
    }
    const prompt = body.prompt?.trim ? body.prompt.trim() : String(body.prompt || "").trim();
    if (!prompt) return bad("Task prompt is required");
    const created = await sql`
      insert into tasks (user_id, project_id, title, prompt, kind, model, status, chat_id, device_id)
      values (${user.id}, ${clip(body.projectId, 80) || null}, ${clip(body.title, 120) || clip(prompt, 80)},
              ${prompt}, ${clip(body.kind, 40) || "research"},
              ${clip(body.model, 120) || null}, 'running',
              ${clip(body.chatId, 80) || null}, ${clip(body.deviceId, 80) || null})
      returning id, title, kind, status`;
    return json({ task: created[0] }, 201);
  }

  return bad("Method not allowed", 405);
}

export const GET = handler;
export const POST = handler;
