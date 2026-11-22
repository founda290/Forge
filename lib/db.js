import { neon } from "@neondatabase/serverless";

export const sql = neon(process.env.DATABASE_URL);

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });

export const bad = (error, status = 400) => json({ error }, status);
