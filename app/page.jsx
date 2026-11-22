const FEATURES = [
  ["60+", "Every gateway, one studio", "OpenRouter, Groq, Mistral, Gemini, Cerebras, Together and 50+ more — add one key or many, switch mid-thread."],
  ["MCP", "Tool directory built in", "A curated Model Context Protocol connector directory: dev tools, work apps, finance, browsing. Point at a URL, tools go live."],
  ["AGT", "Runs that finish the job", "Multi-step agent loop with plan/act modes, subagents, skills and an autonomy dial — plus a live run console with every tool call."],
  ["DB", "Neon-backed cloud", "Encrypted-at-rest Postgres keeps your workspace snapshots, sessions and audit trail. Sign in anywhere, pick up where you left off."],
  ["WKR", "Cloudflare edge gateway", "A single edge gateway wipes out CORS and rate friction: chat, model listing and MCP calls fly through your own Worker."],
  ["USD", "Costs you can see", "Per-day token and spend roll-ups recorded per model — plus webhooks so external systems can queue runs into Forge."],
];

export default function Landing() {
  return (
    <main>
      <nav className="nav">
        <a className="logo" href="/"><span className="mark">▚</span>Forge</a>
        <span className="sp" />
        <a className="btn" href="/signin">Sign in</a>
        <a className="btn pri" href="/studio">Launch Studio →</a>
      </nav>

      <header className="hero">
        <span className="kicker">Forge Studio · v2</span>
        <h1>One workspace for <em>every frontier model</em>.</h1>
        <p className="lead">
          Bring your own keys. Chat, run agents, wire up tools and MCP connectors, sync the whole
          workspace to the cloud, and pay exactly what the providers charge — nothing more.
        </p>
        <div className="ctaRow">
          <a className="btn pri" href="/signin">Create your account</a>
          <a className="btn" href="/studio">Open Studio</a>
          <span className="monoNote">60+ providers · 40+ MCP endpoints · 0 lock-in</span>
        </div>
        <div className="strip">
          {["Neon Postgres", "Cloudflare edge gateway", "Vercel runtime", "MCP native", "Voice I/O", "Usage dashboard"].map((t) => (
            <span className="tag" key={t}>{t}</span>
          ))}
        </div>
      </header>

      <section className="section">
        <h2>What is inside</h2>
        <p className="sub">Everything runs in one studio page — no tab juggling, no per-vendor apps.</p>
        <div className="grid">
          {FEATURES.map(([ico, title, body]) => (
            <article className="card" key={title}>
              <span className="ico">{ico}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>How it works</h2>
        <p className="sub">Three steps, roughly a minute.</p>
        <div className="steps">
          <div className="step"><span className="n">01</span>
            <div><h4>Create an account</h4>
              <p>Email and password — that is the whole signup. Your workspace starts locally and syncs whenever you are signed in.</p></div>
          </div>
          <div className="step"><span className="n">02</span>
            <div><h4>Add a gateway key</h4>
              <p>Paste any OpenAI-compatible key (OpenRouter is the fastest route to dozens of models). Keys live in your browser and are proxied through your own Worker.</p></div>
          </div>
          <div className="step"><span className="n">03</span>
            <div><h4>Work with the agent</h4>
              <p>Chat, plan, execute tools, attach images and audio, fork threads, export anything. Use /help inside the studio to see slash commands.</p></div>
          </div>
        </div>
      </section>

      <footer className="footer">
        <span className="mono">FORGE STUDIO</span>
        <span className="sp" />
        <a href="/signin">Sign in</a>
        <a href="/studio">Studio</a>
        <a href="/api/health">Status</a>
      </footer>
    </main>
  );
}
