"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Request failed");
      router.push("/notes/new");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Request failed");
      setBusy(false);
    }
  }

  return (
    <main className="shell auth">
      <div className="eyebrow">LINKNOTE</div>
      <div className="card">
        <h2>{mode === "login" ? "Welcome back" : "Create your workspace"}</h2>
        <p className="muted">{mode === "login" ? "Sign in to manage your private notes." : "Build a note, issue a secure link, test every edge case."}</p>
        <form onSubmit={submit}>
          {mode === "register" && <div className="field"><label htmlFor="name">Name</label><input id="name" required maxLength={80} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></div>}
          <div className="field"><label htmlFor="email">Email</label><input id="email" type="email" required maxLength={254} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></div>
          <div className="field"><label htmlFor="password">Password</label><input id="password" type="password" minLength={8} maxLength={200} required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></div>
          {error && <div className="error" role="alert">{error}</div>}
          <button className="button primary" disabled={busy} type="submit">{busy ? "Working…" : mode === "login" ? "Sign in" : "Create account"}</button>
        </form>
        <p className="muted small">{mode === "login" ? <>New here? <Link href="/register" className="brand">Create account</Link></> : <>Already registered? <Link href="/login" className="brand">Sign in</Link></>}</p>
      </div>
    </main>
  );
}
