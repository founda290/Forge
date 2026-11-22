import { sql, json } from "../../../lib/db.js";

async function handler() {
  const started = Date.now();
  const rows = await sql`select 1 as ping`;
  return json({
    ok: true,
    service: "forge-api",
    db: rows[0]?.ping === 1 ? "up" : "unknown",
    latencems: Date.now() - started,
    time: new Date().toISOString(),
  });
}

export const GET = handler;

export const dynamic = "force-dynamic";