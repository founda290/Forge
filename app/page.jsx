"use client";
import { useEffect, useRef, useState } from "react";

const KINDS = [
  { id: "research", n: "Research", example: "Research the Nigerian AI infrastructure market and compile a brief with sources" },
  { id: "build", n: "Build an app", example: "Build a small e-commerce front page with a product grid and cart" },
  { id: "data", n: "Analyze data", example: "Analyze last quarter's CSV and summarize the three biggest trends" },
  { id: "slides", n: "Create slides", example: "Create a 6-slide deck introducing Forge Studio to investors" },
  { id: "automate", n: "Automate work", example: "Set up a nightly job that checks API status and reports changes" },
];

const DEMO_STEPS = [
  ["Analyzed the requirements", "ok"],
  ["Planned the architecture", "ok"],
  ["web_fetch · pulled 4 sources", "ok"],
  ["write_file · components/ProductGrid", "ok"],
  ["run_js · logic tests passed", "ok"],
  ["READ files for final checks", "ok"],
  ["Composed the deliverable", "done"],
];

const FEATURES = [
  ["01", "Task-first workspace", "Give Forge a prompt. It plans, streams live steps into a console, and finishes with a real deliverable — not a wall of text."],
  ["60+", "Every gateway, one studio", "OpenRouter, Groq, Mistral, Gemini, Cerebras, Together and 50+ more. Add one key or many, switch mid-thread."],
  ["MCP", "Tool directory built in", "A curated Model Context Protocol connector directory: dev tools, work apps, finance, browsing. Point at a URL, tools go live."],
  ["AGT", "Autonomous agent loop", "Plan/act modes, subagents, skills and an autonomy dial — every tool call logged in the live run console."],
  ["DB", "Neon-backed cloud", "Encrypted Postgres keeps workspace snapshots, sessions, task history and audit trails. Sign in anywhere, continue instantly."],
  ["WKR", "Cloudflare edge + cron", "Your own edge gateway wipes out CORS and rate friction; background jobs keep running after you close the tab."],
];

function useDemoLoop() {
  const [n, setN] = useState(1);
  useEffect(() => {
    const t = setInterval(() => setN((x) => (x >= DEMO_STEPS.length ? 1 : x + 1)), 1500);
    return () => clearInterval(t);
  }, []);
  return n;
}

export default function Landing() {
  const [kind, setKind] = useState("research");
  const [prompt, setPrompt] = useState("");
  const taRef = useRef(null);
  const demoN = useDemoLoop();

  const edited = Math.min(2 + (demoN % 4), 5);
  const read = Math.min(demoN + 1, 6);

  function start() {
    const p = prompt.trim();
    try { if (p) sessionStorage.setItem("fs.seedTask", JSON.stringify({ prompt: p, kind })); } catch {}
    window.location.href = "/studio";
  }

  return (
    <main className="land">
      <style>{CSS}</style>

      <nav className="fl-nav">
        <a className="fl-logo" href="/">
          <span className="fl-mark"><svg viewBox="0 0 24 24"><path d="M8 19V5h9M8 12h6.5" /></svg></span>
          <b>Forge</b><span className="fl-sub">Studio</span>
        </a>
        <span className="fl-sp" />
        <a className="fl-link" href="/api/health"><span className="fl-dot" />Status</a>
        <a className="fl-btn" href="/signin">Sign in</a>
        <a className="fl-btn fl-pri" href="/studio">Open Studio</a>
      </nav>

      <header className="fl-hero">
        <span className="fl-kicker">Forge Studio · v2 <span className="fl-tag-new">Manus-style agent</span></span>
        <h1>Give Forge a task.<br /><em>It plans, executes and delivers.</em></h1>
        <p className="fl-lead">
          One dark room for every frontier model: chats, autonomous agents, MCP tools, skills,
          cloud sync — you bring the keys, Forge does the work.
        </p>

        <div className="fl-composer">
          <textarea
            ref={taRef}
            value={prompt}
            placeholder="Describe a task, build something, research a topic…"
            aria-label="Task description"
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (prompt.trim()) start(); } }}
          />
          <div className="fl-chips">
            {KINDS.map((k) => (
              <button key={k.id} className={`fl-chip${kind === k.id ? " on" : ""}`} aria-pressed={kind === k.id}
                onClick={() => { setKind(k.id); if (!prompt.trim()) setPrompt(k.example); }}>
                {k.n}
              </button>
            ))}
          </div>
          <div className="fl-cfoot">
            <span className="fl-hint">Enter to launch · Agent mode armed</span>
            <button className="fl-btn fl-pri fl-go" onClick={start} disabled={!prompt.trim()}>Start task →</button>
          </div>
        </div>

        <div className="fl-strip">
          {["60+ providers", "40+ MCP endpoints", "Live task console", "BYO keys · 0 lock-in"].map((t) => (
            <span className="fl-twrap" key={t}><span className="fl-tick" />{t}</span>
          ))}
        </div>
      </header>

      <section className="fl-demo-wrap">
        <div className="fl-demo">
          <div className="fl-demo-head">
            <span className={`fl-live${demoN < DEMO_STEPS.length ? " run" : ""}`}>
              <span className="fl-ring" />{demoN < DEMO_STEPS.length ? "Working" : "Delivered"}
            </span>
            <span className="fl-demo-path">forge@cloud:~/task</span>
            <span className="fl-demo-meta">Edited {edited} files · Read {read} files</span>
          </div>
          <div className="fl-demo-body">
            {DEMO_STEPS.slice(0, demoN).map(([t, s], i) => (
              <div className="fl-demo-step" key={i} style={{ animationDelay: `${i * 40}ms` }}>
                <span className="fl-num">{i + 1}</span>
                <span className="fl-st">{t}</span>
                <span className={`fl-tag${s === "done" ? " done" : ""}`}>{s === "done" ? "delivered" : "ok"}</span>
              </div>
            ))}
            {demoN < DEMO_STEPS.length && <div className="fl-caret-line"><span className="fl-caret" /></div>}
          </div>
          <div className="fl-demo-bar"><div className="fl-demo-bar-in" style={{ width: `${Math.round((demoN / DEMO_STEPS.length) * 100)}%` }} /></div>
        </div>
        <p className="fl-demo-cap">This is the actual Steps console you watch inside the studio — every tool call, every file, live.</p>
      </section>

      <section className="fl-section">
        <h2>What is inside</h2>
        <p className="fl-sub">Everything runs in one studio page — no tab juggling, no per-vendor apps.</p>
        <div className="fl-grid">
          {FEATURES.map(([ico, title, body]) => (
            <article className="fl-card" key={title}>
              <span className="fl-ico">{ico}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="fl-section fl-section-last">
        <h2>How it works</h2>
        <p className="fl-sub">Three steps, roughly a minute.</p>
        <div className="fl-steps">
          {[["01", "Create an account", "Email and password — the whole signup. Your workspace starts locally and syncs when signed in."],
            ["02", "Add a gateway key", "Paste any OpenAI-compatible key. Keys stay in your browser and proxy through your own Worker — you pay the provider rate, nothing more."],
            ["03", "Assign a task", "Forge plans, streams steps into the console, and hands back files, reports and slides you can export."]].map(([n, t, b]) => (
            <div className="fl-step" key={n}><span className="fl-n">{n}</span><div><h4>{t}</h4><p>{b}</p></div></div>
          ))}
        </div>
      </section>

      <footer className="fl-footer">
        <span className="fl-mono">FORGE STUDIO</span>
        <span className="fl-sp" />
        <a href="/signin">Sign in</a>
        <a href="/studio">Studio</a>
        <a href="/api/health">Status</a>
      </footer>
    </main>
  );
}

const CSS = `
.land{--bg:#111214;--surface:#17181B;--surface2:#1D1F23;--surface3:#25272C;--line:#2A2C31;--line2:#3B3E45;
--tx:#EDEDEB;--tx2:#A9A9A4;--tx3:#8A8A85;--ac:#79B8A9;--ac-ink:#0B1614;--ac-bg:#182523;--ac-line:#2E4441;
min-height:100vh;background:var(--bg);color:var(--tx);display:flex;flex-direction:column;overflow-x:hidden}
.land ::selection{background:var(--ac-bg)}

.fl-nav{display:flex;align-items:center;gap:18px;padding:16px clamp(16px,4vw,44px);position:sticky;top:0;z-index:10;background:color-mix(in srgb,var(--bg) 82%,transparent);backdrop-filter:blur(14px);border-bottom:1px solid var(--line)}
.fl-logo{display:flex;align-items:center;gap:9px;font-size:1rem}
.fl-logo b{font-weight:700;letter-spacing:-.01em}
.fl-sub{color:var(--tx3);font-size:.85rem;margin-left:-4px}
.fl-mark{width:30px;height:30px;border-radius:9px;background:var(--ac);color:var(--ac-ink);display:grid;place-items:center;box-shadow:0 0 22px color-mix(in srgb,var(--ac) 45%,transparent)}
.fl-mark svg{width:17px;height:17px;stroke:currentColor;stroke-width:2.3;fill:none;stroke-linecap:round;stroke-linejoin:round}
.fl-sp{flex:1}
.fl-dot{width:7px;height:7px;border-radius:50%;background:#74BE97;display:inline-block;margin-right:6px;animation:flPulse 2s infinite}
.fl-link{color:var(--tx2);font-size:.85rem}
.fl-link:hover{color:var(--tx)}
.fl-btn{border:1px solid var(--line2);background:var(--surface);color:var(--tx);border-radius:10px;padding:8px 14px;font-size:.84rem;font-weight:500;transition:transform 130ms,border-color 130ms,filter 130ms}
.fl-btn:hover{transform:translateY(-1px);border-color:var(--tx3)}
.fl-btn.pri{background:var(--ac);border-color:var(--ac);color:var(--ac-ink);font-weight:600;box-shadow:0 4px 18px color-mix(in srgb,var(--ac) 30%,transparent)}
.fl-btn.pri:hover{filter:brightness(1.08)}
.fl-btn[disabled]{opacity:.45;cursor:not-allowed;transform:none;box-shadow:none}

.fl-hero{width:100%;max-width:880px;margin:0 auto;padding:clamp(48px,9vw,92px) 20px 26px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:18px}
.fl-kicker{font-size:.72rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--tx3);display:inline-flex;gap:10px;align-items:center}
.fl-tag-new{background:var(--ac-bg);color:var(--ac);border:1px solid var(--ac-line);border-radius:999px;padding:2px 9px;letter-spacing:.06em}
.fl-hero h1{font-size:clamp(1.9rem,5.4vw,3.1rem);line-height:1.14;letter-spacing:-.03em;margin:0;font-weight:700}
.fl-hero h1 em{font-style:normal;color:var(--ac)}
.fl-lead{color:var(--tx2);font-size:clamp(.95rem,2.2vw,1.06rem);line-height:1.65;max-width:60ch;margin:0}

.fl-composer{width:100%;max-width:720px;text-align:left;background:var(--surface);border:1px solid var(--line2);border-radius:22px;padding:16px;box-shadow:0 24px 80px rgba(0,0,0,.5),0 0 0 1px rgba(121,184,169,.06),0 0 60px color-mix(in srgb,var(--ac) 12%,transparent);transition:border-color 150ms}
.fl-composer:focus-within{border-color:var(--ac-line)}
.fl-composer textarea{width:100%;min-height:84px;max-height:220px;resize:none;border:0;outline:0;background:transparent;color:var(--tx);font:inherit;font-size:1rem;line-height:1.55}
.fl-composer textarea::placeholder{color:var(--tx3)}
.fl-chips{display:flex;flex-wrap:wrap;gap:7px;margin:6px 0 12px}
.fl-chip{border:1px solid var(--line2);background:var(--surface2);color:var(--tx2);border-radius:999px;padding:6px 13px;font-size:.78rem;font-weight:500;cursor:pointer;transition:all 130ms}
.fl-chip:hover{color:var(--tx);border-color:var(--tx3)}
.fl-chip.on{background:var(--ac-bg);border-color:var(--ac-line);color:var(--ac)}
.fl-cfoot{display:flex;align-items:center;gap:10px}
.fl-hint{color:var(--tx3);font-size:.72rem}
.fl-cfoot .fl-go{margin-left:auto}

.fl-strip{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}
.fl-twrap{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--line);background:var(--surface2);border-radius:999px;padding:5px 12px;font-size:.74rem;color:var(--tx2)}
.fl-tick{width:5px;height:5px;border-radius:50%;background:var(--ac)}

.fl-demo-wrap{width:100%;max-width:880px;margin:34px auto 0;padding:0 20px;display:flex;flex-direction:column;gap:10px}
.fl-demo{background:#0D0F10;border:1px solid var(--line2);border-radius:16px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.45);font-family:var(--mono)}
.fl-demo-head{display:flex;align-items:center;gap:12px;padding:11px 16px;border-bottom:1px solid var(--line);font-size:.72rem;color:var(--tx2)}
.fl-demo-path{color:var(--tx3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.fl-demo-meta{margin-left:auto;color:var(--ac);white-space:nowrap}
.fl-live{display:inline-flex;align-items:center;gap:7px;color:var(--tx);font-weight:600;letter-spacing:.02em;white-space:nowrap}
.fl-ring{width:9px;height:9px;border-radius:50%;background:var(--ac)}
.fl-live.run .fl-ring{animation:flPulse 1s infinite}
@keyframes flPulse{50%{opacity:.25}}
.fl-demo-body{padding:14px 16px;display:flex;flex-direction:column;gap:7px;min-height:236px}
.fl-demo-step{display:flex;align-items:center;gap:10px;font-size:.76rem;color:var(--tx2);animation:flRow .3s cubic-bezier(.2,.7,.3,1) both}
@keyframes flRow{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
.fl-num{width:20px;height:20px;border-radius:6px;background:var(--surface3);color:var(--tx3);display:grid;place-items:center;font-size:.62rem;flex:none}
.fl-st{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--tx)}
.fl-tag{font-size:.6rem;color:#74BE97;background:rgba(23,40,31,.7);border:1px solid rgba(116,190,151,.28);border-radius:6px;padding:2px 7px}
.fl-tag.done{color:var(--ac);background:var(--ac-bg);border-color:var(--ac-line)}
.fl-caret-line{padding:2px 0 0 6px}
.fl-caret{display:inline-block;width:9px;height:15px;background:var(--ac);animation:flPulse .9s infinite}
.fl-demo-bar{height:3px;background:var(--surface3)}
.fl-demo-bar-in{height:100%;background:linear-gradient(90deg,var(--ac),#2E8C7B);transition:width .6s cubic-bezier(.2,.7,.3,1)}
.fl-demo-cap{color:var(--tx3);font-size:.76rem;text-align:center;margin:0}

.fl-section{width:100%;max-width:960px;margin:0 auto;padding:clamp(40px,7vw,72px) 20px 8px}
.fl-section-last{padding-bottom:clamp(48px,7vw,80px)}
.fl-section h2{font-size:clamp(1.35rem,3.4vw,1.8rem);letter-spacing:-.02em;margin:0 0 6px}
.fl-sub{color:var(--tx2);font-size:.92rem;margin:0 0 26px}
.fl-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(268px,1fr));gap:12px}
.fl-card{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:20px;transition:border-color 130ms,transform 130ms,box-shadow 130ms}
.fl-card:hover{border-color:var(--ac-line);transform:translateY(-2px);box-shadow:0 12px 34px rgba(0,0,0,.35)}
.fl-ico{display:inline-grid;place-items:center;min-width:40px;height:40px;padding:0 10px;border-radius:11px;background:var(--ac-bg);color:var(--ac);border:1px solid var(--ac-line);font-family:var(--mono);font-size:.74rem;font-weight:600;margin-bottom:12px}
.fl-card h3{margin:0 0 7px;font-size:1rem;letter-spacing:-.01em}
.fl-card p{margin:0;color:var(--tx2);font-size:.88rem;line-height:1.62}

.fl-steps{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(250px,1fr))}
.fl-step{display:flex;gap:12px;background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:18px}
.fl-n{font-family:var(--mono);font-size:.74rem;color:var(--ac);background:var(--ac-bg);border:1px solid var(--ac-line);border-radius:8px;padding:3px 8px;height:fit-content}
.fl-step h4{margin:0 0 5px;font-size:.95rem}
.fl-step p{margin:0;color:var(--tx2);font-size:.85rem;line-height:1.6}

.fl-footer{display:flex;align-items:center;gap:16px;padding:26px clamp(16px,4vw,44px);border-top:1px solid var(--line);color:var(--tx2);font-size:.82rem;margin-top:auto}
.fl-footer a:hover{color:var(--tx)}
.fl-mono{font-family:var(--mono);font-size:.72rem;letter-spacing:.05em}

@media(max-width:640px){
  .fl-nav{gap:10px;padding:12px 14px}
  .fl-link{display:none}
  .fl-demo-meta{display:none}
  .fl-demo-body{min-height:220px}
}
`;
