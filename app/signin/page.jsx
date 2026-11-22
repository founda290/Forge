"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignIn() {
  const router = useRouter();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const r = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: mode === "login" ? "login" : "register",
          email, password, displayName,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Something went wrong");
      localStorage.setItem(
        "fs.cloud",
        JSON.stringify({ token: j.token, email: j.user.email, uid: j.user.id })
      );
      router.push("/studio");
    } catch (e2) {
      setErr(e2.message);
      setBusy(false);
    }
  }

  return (
    <main className="authWrap">
      <div className="authCard">
        <h1 className="title" style={{ fontSize: "1.35rem", margin: "0 0 4px" }}>
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="sub">
          {mode === "login" ? "Sign in to sync your workspace." : "One account, every device. Free."}
        </p>

        <div className="tabs">
          <button className={mode === "login" ? "on" : ""} onClick={() => { setMode("login"); setErr(""); }} type="button">
            Sign in
          </button>
          <button className={mode === "register" ? "on" : ""} onClick={() => { setMode("register"); setErr(""); }} type="button">
            Create account
          </button>
        </div>

        {err ? <div className="err">{err}</div> : null}

        <form onSubmit={submit}>
          {mode === "register" ? (
            <label className="field">
              <span className="lbl">Name</span>
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                placeholder="How Forge should greet you" autoComplete="name" />
            </label>
          ) : null}
          <label className="field">
            <span className="lbl">Email</span>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com" autoComplete="email" />
          </label>
          <label className="field">
            <span className="lbl">Password</span>
            <input type="password" required minLength={8} value={password}
              onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters"
              autoComplete={mode === "login" ? "current-password" : "new-password"} />
          </label>
          <button className="btn pri wide" type="submit" disabled={busy}>
            {busy ? "Working…" : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>

        <p className="fine">
          Keys and workspace stay yours. <a href="/">← Back to forge</a>
        </p>
      </div>
    </main>
  );
}
