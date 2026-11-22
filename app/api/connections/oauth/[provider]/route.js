import crypto from "node:crypto";
import { sql, json, bad } from "../../../../../lib/db.js";
import { requireUser } from "../../../../../lib/auth.js";
import { enc } from "../../../../../lib/vault.js";
import { appFor, tokenHeaders } from "../../../../../lib/connectors-registry.js";

const base = (req) => {
  const u = new URL(req.url);
  const upstream = req.headers.get("x-forwarded-host");
  const host = upstream || req.headers.get("host") || u.host;
  const proto = req.headers.get("x-forwarded-proto") || u.protocol.replace(":", "");
  return `${proto}://${host}`;
};

const configured = (app) =>
  Boolean(process.env[app.clientIdEnv] && process.env[app.clientSecretEnv]);

async function handler(req, ctx) {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });
  let params = {};
  try {
    params = await (ctx?.params || Promise.resolve({}));
  } catch {
    params = {};
  }
  const provider = String(params.provider || "");
  const app = appFor(provider);
  if (!app) return bad("Unknown provider", 404);

  const action = new URL(req.url).searchParams.get("action") || "start";
  if (action !== "callback") {
    let user;
    try {
      user = await requireUser(req);
    } catch (err) {
      return err;
    }
    const redirectUri = `${base(req)}/api/connections/oauth/${provider}?action=callback`;
    if (!configured(app)) {
      return json({
        configured: false,
        setup: {
          envVars: [app.clientIdEnv, app.clientSecretEnv],
          redirectUri,
          docs: "Register an OAuth app with the provider, set both env vars on Vercel, then retry.",
        },
      });
    }
    const state = crypto.randomBytes(24).toString("base64url");
    const verifier = app.pkce ? crypto.randomBytes(48).toString("base64url") : null;
    await sql`delete from oauth_states where created_at < now() - interval '15 minutes'`;
    await sql`insert into oauth_states (state, user_id, verifier) values (${state}, ${user.id}, ${verifier})`;
    const clientId = process.env[app.clientIdEnv];
    const u = new URL(app.authorizeUrl);
    u.searchParams.set("client_id", clientId);
    u.searchParams.set("redirect_uri", redirectUri);
    u.searchParams.set("response_type", "code");
    if (app.scope) u.searchParams.set("scope", app.scope);
    u.searchParams.set("state", state);
    if (app.pkce) {
      u.searchParams.set("code_challenge", crypto.createHash("sha256").update(verifier).digest("base64url"));
      u.searchParams.set("code_challenge_method", "S256");
    }
    return json({ configured: true, authorizeUrl: u.toString() });
  }

  if (action === "callback") {
    const q = new URL(req.url).searchParams;
    const code = q.get("code");
    const state = q.get("state");
    const errQ = q.get("error");
    const fail = (msg, status = 302) =>
      Response.redirect(`${base(req)}/studio.html#connections?oauth=${encodeURIComponent(msg)}`, status);
    if (errQ || !code || !state) {
      return new Response(
        `<!doctype html><meta charset="utf-8"><script>opener?.postMessage({forgeOauth:'${errQ || "denied"}'},'*');close()</script>`,
        { headers: { "content-type": "text/html; charset=utf-8" } }
      );
    }
    const rows = await sql`
      delete from oauth_states where state = ${state}
      and created_at > now() - interval '15 minutes'
      returning user_id, verifier
    `;
    if (!rows.length) return new Response("Expired or invalid state. Restart from the connector page.", { status: 400 });
    const { user_id: uid, verifier } = rows[0];
    const body = new URLSearchParams({
      client_id: process.env[app.clientIdEnv] || "",
      client_secret: process.env[app.clientSecretEnv] || "",
      code,
      grant_type: "authorization_code",
      redirect_uri: `${base(req)}/api/connections/oauth/${provider}?action=callback`,
    });
    if (verifier) body.set("code_verifier", verifier);
    let tokenData;
    try {
      const r = await fetch(app.tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
        body,
        signal: AbortSignal.timeout(30000),
      });
      tokenData = await r.json();
    } catch {
      return new Response("Token exchange failed - try again.", { status: 502 });
    }
    if (!tokenData?.access_token) {
      return new Response(`Provider rejected the exchange: ${JSON.stringify(tokenData).slice(0, 300)}`, { status: 400 });
    }
    let label = null;
    try {
      const host = app.apiHosts?.[0];
      if (host && (provider === "github" || provider === "google")) {
        const meUrl =
          provider === "github"
            ? "https://api.github.com/user"
            : "https://www.googleapis.com/oauth2/v3/userinfo";
        const me = await fetch(meUrl, { headers: { ...tokenHeaders(provider, tokenData.access_token) }, signal: AbortSignal.timeout(15000) });
        const mj = await me.json();
        label = mj.login || mj.email || null;
      }
    } catch {}
    const scopes = tokenData.scope || app.scope || "";
    await sql`
      insert into connections (user_id, provider, status, scopes, account_label, access_enc, refresh_enc, expires_at)
      values (${uid}, ${provider}, 'connected', ${String(scopes).slice(0, 500)}, ${label},
        ${enc(tokenData.access_token)}, ${tokenData.refresh_token ? enc(tokenData.refresh_token) : null},
        ${tokenData.expires_in ? new Date(Date.now() + (tokenData.expires_in - 60) * 1000).toISOString() : null})
      on conflict (user_id, provider)
      do update set status = 'connected', access_enc = excluded.access_enc,
        refresh_enc = excluded.refresh_enc, expires_at = excluded.expires_at,
        scopes = excluded.scopes, account_label = excluded.account_label, updated_at = now()
    `;
    await sql`insert into connector_events (user_id, provider, action, detail) values (${uid}, ${provider}, 'oauth_connect', ${label})`;
    return new Response(
      `<!doctype html><meta charset="utf-8"><script>opener?.postMessage({forgeOauth:'ok',provider:'${provider}'},'*');close()</script>`,
      { headers: { "content-type": "text/html; charset=utf-8" } }
    );
  }
  return bad("Method not allowed", 405);
}
export const GET = handler;
export const POST = handler;
export const OPTIONS = handler;
export const dynamic = "force-dynamic";
