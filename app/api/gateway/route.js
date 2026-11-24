import { json, bad } from "../../../lib/db.js";
import { requireUser } from "../../../lib/auth.js";

async function handler(req) {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });
  let user;
  try {
    user = await requireUser(req);
  } catch (err) {
    return err;
  }
  if (req.method !== "GET") return bad("method not allowed", 405);
  const url = process.env.WORKER_URL || "https://forge-gateway.legateakanjimusab.workers.dev";
  const token = process.env.CONNECTOR_SECRET || "";
  return json({ url, token });
}

export { handler as GET, handler as POST };
