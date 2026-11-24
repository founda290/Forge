const html = () => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Forge · finishing sign-in</title></head><body style="font-family:system-ui;background:#0d0f0e;color:#e8ede9;display:grid;place-items:center;height:100vh;margin:0"><p>Finishing sign-in — returning to Forge…</p><script>
try {
  var q = new URLSearchParams(location.search);
  localStorage.setItem('forgeOauth', JSON.stringify({ state: q.get('state') || '', code: q.get('code') || '', error: q.get('error') || '' }));
} catch (e) {}
location.replace('/studio');
<\/script></body></html>`;

function handler() {
  return new Response(html(), {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export { handler as GET, handler as POST };
