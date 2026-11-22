import crypto from "node:crypto";
import { sql, json, bad } from "../../../lib/db.js";
import { requireUser } from "../../../lib/auth.js";
import { enc } from "../../../lib/vault.js";
import { catalogFor } from "../../../lib/connectors-catalog.js";

async function handler(req) {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });
  let user;
  try {
    user = await requireUser(req);
  } catch (err) {
    return err;
  }

  if (req.method === "GET") {
    const rows = await sql`
      select provider, status, account_label, scopes, expires_at, updated_at
      from connections where user_id = ${user.id} order by updated_at desc
    `;
    return json({
      connections: rows.map((r) => ({
        provider: r.provider,
        status: r.status,
        accountLabel: r.account_label,
        scopes: r.scopes,
        expiresAt: r.expires_at,
        updatedAt: r.updated_at,
      })),
    });
  }

  if (req.method === "POST") {
    let body;
    try {
      body = await req.json();
    } catch {
      return bad("Invalid JSON body");
    }
    const provider = String(body.provider || "").trim();
    const token = String(body.accessToken || "").trim();
    const app = catalogFor(provider);
    if (!app || app.a === "mcp") return bad("Unknown provider", 404);
    if (!token) return bad("accessToken required");
    if (token.length > 20000) return bad("Token too large", 413);
    await sql`
      insert into connections (user_id, provider, status, scopes, account_label, access_enc)
      values (${user.id}, ${provider}, 'connected', ${String(body.scopes || app.n)}, ${body.accountLabel ? String(body.accountLabel).slice(0, 120) : null}, ${enc(token)})
      on conflict (user_id, provider)
      do update set status = 'connected', access_enc = excluded.access_enc,
        account_label = excluded.account_label, updated_at = now()
    `;
    await sql`insert into connector_events (user_id, provider, action) values (${user.id}, ${provider}, 'token_connect')`;
    return json({ ok: true, provider }, 201);
  }

  if (req.method === "DELETE") {
    const provider = new URL(req.url).searchParams.get("provider");
    if (!provider) return bad("provider required");
    const gone = await sql`delete from connections where user_id = ${user.id} and provider = ${provider} returning provider`;
    await sql`insert into connector_events (user_id, provider, action) values (${user.id}, ${provider}, 'revoke')`;
    return json({ ok: true, removed: gone.length });
  }

  return bad("Method not allowed", 405);
}
export const GET = handler;
export const POST = handler;
export const DELETE = handler;
export const OPTIONS = handler;
export const dynamic = "force-dynamic";
