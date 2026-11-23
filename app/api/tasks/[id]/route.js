import { sql, json, bad } from "../../../../lib/db.js";
import { requireUser } from "../../../../lib/auth.js";

async function owned(userId, id) {
  const rows = await sql`
    select id from tasks where id = ${id} and user_id = ${userId}`;
  return rows[0];
}

async function handler(req, ctx) {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });
  let user;
  try {
    user = await requireUser(req);
  } catch (err) {
    return err;
  }
  const params = (await ctx?.params) || {};
  const id = params.id || "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return bad("Invalid task id");
  if (!(await owned(user.id, id))) return bad("Task not found", 404);

  if (req.method === "GET") {
    const task = await sql`
      select id, title, prompt, kind, model, status, steps, result, chat_id, project_id,
             created_at, updated_at
      from tasks where id = ${id}`;
    const events = await sql`
      select type, payload, created_at from task_events
      where task_id = ${id} order by id desc limit 100`;
    return json({ task: task[0], events: events.reverse() });
  }

  if (req.method === "PATCH") {
    let body;
    try {
      body = await req.json();
    } catch {
      return bad("Invalid JSON body");
    }
    const status = ["running", "paused", "completed", "failed"].includes(body.status)
      ? body.status
      : null;
    const result = body.result && typeof body.result === "object" ? body.result : null;
    const steps = Array.isArray(body.steps) ? body.steps.slice(0, 500) : null;
    const updated = await sql`
      update tasks set
        status = coalesce(${status}, status),
        result = coalesce(${result ? JSON.stringify(result) : null}::jsonb, result),
        steps  = coalesce(${steps ? JSON.stringify(steps) : null}::jsonb, steps),
        chat_id = coalesce(${body.chatId ? String(body.chatId).slice(0, 80) : null}, chat_id),
        model   = coalesce(${body.model ? String(body.model).slice(0, 120) : null}, model),
        updated_at = now()
      where id = ${id} returning id, status, updated_at`;
    if (body.event) {
      const type = body.event.type ? String(body.event.type).slice(0, 40) : ""; 
      if (type) {
        await sql`
          insert into task_events (task_id, user_id, type, payload)
          values (${id}, ${user.id}, ${type}, ${JSON.stringify(body.event.payload || {})})
          `;
      }
    }
    return json({ task: updated[0] });
  }

  return bad("Method not allowed", 405);
}

export const GET = handler;
export const PATCH = handler;
