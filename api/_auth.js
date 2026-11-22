import crypto from "node:crypto";
import { sql, bad } from "./_db.js";

export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  const [salt, expected] = String(stored).split(":");
  if (!salt || !expected) return false;
  const actual = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(actual, "hex"));
}

export function bearerToken(req) {
  const header = req.headers.get("authorization") || "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

const SESSION_DAYS = 30;

export async function requireUser(req) {
  const token = bearerToken(req);
  if (!token) throw bad("Authentication required", 401);
  const rows = await sql`
    select u.id, u.email, u.display_name, s.expires_at
    from sessions s join users u on u.id = s.user_id
    where s.token_hash = ${hashToken(token)}
  `;
  const row = rows[0];
  if (!row) throw bad("Invalid session", 401);
  if (new Date(row.expires_at) < new Date()) throw bad("Session expired", 401);
  return { id: row.id, email: row.email, displayName: row.display_name };
}

export async function createSession(userId, userAgent) {
  const token = crypto.randomBytes(32).toString("base64url");
  await sql`
    insert into sessions (token_hash, user_id, expires_at, user_agent)
    values (${hashToken(token)}, ${userId},
            ${new Date(Date.now() + SESSION_DAYS * 864e5).toISOString()},
            ${userAgent || null})
  `;
  await sql`delete from sessions where expires_at < now()`;
  return token;
}

export async function audit(userId, action, detail, req) {
  await sql`
    insert into audit_log (user_id, action, detail, ip, user_agent)
    values (${userId}, ${action}, ${detail ? JSON.stringify(detail) : null},
            ${req?.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() || null},
            ${req?.headers?.get("user-agent") || null})
  `;
}
