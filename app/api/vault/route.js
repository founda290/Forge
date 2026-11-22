import { sql, json, bad } from "../../../lib/db.js";
import { requireUser } from "../../../lib/auth.js";
import { enc, dec } from "../../../lib/vault.js";

async function handler(req) {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });
  let user;
  try {
    user = await requireUser(req);
  } catch (err) {
    return err;
  }

  if (req.method === "GET") {
    const rows = await sql`select skey, sval_enc from secrets where user_id = ${user.id}`;
    const values = {};
    for (const r of rows) values[r.skey] = dec(r.sval_enc);
    return json({ values });
  }

  if (req.method === "PUT") {
    let body;
    try {
      body = await req.json();
    } catch {
      return bad("Invalid JSON body");
    }
    const k = String(body.k || body.key || "").slice(0, 120);
    const v = String(body.v ?? body.value ?? "");
    if (!k || !v) return bad("k and v required");
    if (v.length > 20000) return bad("Value too large", 413);
    await sql`
      insert into secrets (user_id, skey, sval_enc) values (${user.id}, ${k}, ${enc(v)})
      on conflict (user_id, skey) do update set sval_enc = excluded.sval_enc, updated_at = now()
    `;
    return json({ ok: true });
  }

  if (req.method === "DELETE") {
    const k = new URL(req.url).searchParams.get("k");
    if (!k) return bad("k required");
    await sql`delete from secrets where user_id = ${user.id} and skey = ${k}`;
    return json({ ok: true });
  }

  return bad("Method not allowed", 405);
}
export const GET = handler;
export const PUT = handler;
export const DELETE = handler;
export const OPTIONS = handler;
export const dynamic = "force-dynamic";
