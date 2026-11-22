import crypto from "node:crypto";

const KEY = crypto.scryptSync(
  process.env.CONNECTOR_SECRET || process.env.DATABASE_URL || "forge-dev",
  "forge-connector-vault",
  32
);

export function enc(plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const ct = Buffer.concat([cipher.update(String(plaintext), "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), ct].map((b) => b.toString("base64url")).join(".");
}

export function dec(blob) {
  if (!blob) return null;
  const [iv, tag, ct] = String(blob).split(".").map((x) => Buffer.from(x, "base64url"));
  const d = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
  d.setAuthTag(tag);
  const out = Buffer.concat([d.update(ct), d.final()]);
  return out.toString("utf8");
}
