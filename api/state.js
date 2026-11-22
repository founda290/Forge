import { sql, json, bad } from "./_db.js";
import { requireUser } from "./_auth.js";

const MAX_BYTES = 2_000_000;

export default async function handler(req) {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });
  let user;
  try {
    user = await requireUser(req);
  } catch (err) {
    return err;
  }

  const deviceId = req.headers.get("x-forge-device") || "default";

  if (req.method === "GET") {
    const rows = await sql`
      select payload, updated_at, bytes from state_snapshots
      where user_id = ${user.id} and device_id = ${deviceId}
      order by updated_at desc limit 1
    `;
    const latest = rows[0];
    if (!latest) return json({ payload: null, updatedAt: null });
    return json({ payload: latest.payload, updatedAt: latest.updated_at, bytes: latest.bytes });
  }

  if (req.method === "PUT") {
    const text = await req.text();
    if (text.length > MAX_BYTES) return bad("Snapshot too large", 413);
    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      return bad("Invalid JSON body");
    }
    const bytes = Buffer.byteLength(text);
    await sql`
      insert into state_snapshots (user_id, device_id, payload, bytes, updated_at)
      values (${user.id}, ${deviceId}, ${JSON.stringify(payload)}, ${bytes}, now())
      on conflict (user_id, device_id)
      do update set payload = excluded.payload, bytes = excluded.bytes, updated_at = now()
      where state_snapshots.updated_at < now() - interval '2 seconds'
    `;
    return json({ ok: true, bytes, updatedAt: new Date().toISOString() });
  }

  if (req.method === "DELETE") {
    await sql`delete from state_snapshots where user_id = ${user.id} and device_id = ${deviceId}`;
    return json({ ok: true });
  }

  return bad("Method not allowed", 405);
}
