import { sql, json, bad } from "./_db.js";
import { hashPassword, verifyPassword, createSession, audit } from "./_auth.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req) {
  if (req.method !== "POST") return bad("Method not allowed", 405);
  let body;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }
  const { action, email, password, displayName } = body || {};
  const mail = String(email || "").trim().toLowerCase();

  if (!EMAIL_RE.test(mail)) return bad("Valid email required");
  if (!password || String(password).length < 8) return bad("Password must be at least 8 characters", 400);

  if (action === "register") {
    const existing = await sql`select 1 from users where email = ${mail}`;
    if (existing.length) return bad("Account already exists", 409);
    const inserted = await sql`
      insert into users (email, password_hash, display_name)
      values (${mail}, ${hashPassword(password)}, ${displayName ? String(displayName).slice(0, 80) : mail})
      returning id, email, display_name
    `;
    const user = inserted[0];
    await audit(user.id, "register", null, req);
    const token = await createSession(user.id, req.headers.get("user-agent"));
    return json({ token, user: { id: user.id, email: user.email, displayName: user.display_name } }, 201);
  }

  if (action === "login") {
    const rows = await sql`select id, email, display_name, password_hash from users where email = ${mail}`;
    const user = rows[0];
    if (!user || !verifyPassword(password, user.password_hash)) return bad("Invalid email or password", 401);
    const token = await createSession(user.id, req.headers.get("user-agent"));
    await audit(user.id, "login", null, req);
    return json({ token, user: { id: user.id, email: user.email, displayName: user.display_name } });
  }

  return bad("Unknown action");
}
