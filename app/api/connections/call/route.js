import { sql, json, bad } from "../../../../lib/db.js";
import { requireUser } from "../../../../lib/auth.js";
import { dec } from "../../../../lib/vault.js";
import { catalogFor } from "../../../../lib/connectors-catalog.js";
import { tokenHeaders } from "../../../../lib/connectors-registry.js";

const hostAllowed = (provider, host) => {
  const c = catalogFor(provider) || { h: [] };
  return (c.h || []).some((w) => (w.startsWith(".") ? host.endsWith(w) : host === w));
};

async function handler(req) {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });
  let user;
  try {
    user = await requireUser(req);
  } catch (err) {
    return err;
  }
  if (req.method !== "POST") return bad("Method not allowed", 405);

  let body;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }
  const provider = String(body.provider || "").trim();
  let target;
  try {
    target = new URL(String(body.url || ""));
  } catch {
    return bad("Valid url required");
  }
  if (target.protocol !== "https:") return bad("Only https urls allowed");
  if (!hostAllowed(provider, target.host)) return bad(`Host not allow-listed for ${provider}`, 403);

  const rows = await sql`select access_enc from connections where user_id = ${user.id} and provider = ${provider} and status = 'connected'`;
  if (!rows.length) return bad(`Connect ${provider} first`, 409);
  const token = dec(rows[0].access_enc);
  if (!token) return bad("Stored token undecryptable — reconnect", 409);

  const headers = { ...tokenHeaders(provider, token) };
  for (const [k, v] of Object.entries(body.headers || {})) {
    const lk = String(k).toLowerCase();
    if (lk.includes("authorization") || lk.includes("token") || lk === "x-api-key") continue;
    headers[k] = v;
  }

  const up = await fetch(target, {
    method: (body.method || "GET").toUpperCase(),
    headers,
    body: body.body || undefined,
    signal: AbortSignal.timeout(45000),
  });
  const text = await up.text();
  return json({ status: up.status, body: text.slice(0, 60000) });
}
export const POST = handler;
export const OPTIONS = handler;
export const dynamic = "force-dynamic";
