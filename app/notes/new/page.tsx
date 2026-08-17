"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Nav from "../../components/Nav";

type CreatedNote = {
  note: { id: string; title: string };
  share: { token: string; accessType: "public" | "password"; shareType: "one-time" | "time-based"; expiryAt: string | null; viewCount: number };
  accessKey: string | null;
};

export default function NewNote() {
  const router = useRouter();
  const [form, setForm] = useState({ title: "", content: "", accessType: "public", shareType: "one-time", expiryAt: "" });
  const [result, setResult] = useState<CreatedNote | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me").then((response) => response.json()).then((data: { user: unknown }) => {
      if (!data.user) router.replace("/login");
    }).catch(() => router.replace("/login"));
  }, [router]);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const expiryAt = form.shareType === "time-based" ? new Date(form.expiryAt) : null;
      if (expiryAt && !Number.isFinite(expiryAt.getTime())) throw new Error("Choose a valid expiry date");
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, expiryAt: expiryAt?.toISOString() ?? null }),
      });
      const data = await response.json() as CreatedNote & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not create note");
      setResult(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create note");
    } finally {
      setBusy(false);
    }
  }

  const shareUrl = result ? `${window.location.origin}/share/${result.share.token}` : "";
  return (
    <main className="shell">
      <Nav />
      <div className="main-grid">
        <section className="stack">
          <div><div className="eyebrow">NEW NOTE</div><h2>Issue a controlled share link</h2><p className="muted">The note is private until someone proves access through its generated link.</p></div>
          <form className="card" onSubmit={create}>
            <div className="field"><label htmlFor="title">Title</label><input id="title" required maxLength={120} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Release notes" /></div>
            <div className="field"><label htmlFor="content">Content</label><textarea id="content" required maxLength={20_000} value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} placeholder="Write something worth sharing…" /></div>
            <div className="row">
              <div className="field"><label htmlFor="access">Access type</label><select id="access" value={form.accessType} onChange={(event) => setForm({ ...form, accessType: event.target.value })}><option value="public">Public</option><option value="password">Password protected</option></select></div>
              <div className="field"><label htmlFor="share">Share type</label><select id="share" value={form.shareType} onChange={(event) => setForm({ ...form, shareType: event.target.value })}><option value="one-time">One-time</option><option value="time-based">Time-based expiry</option></select></div>
            </div>
            {form.shareType === "time-based" && <div className="field"><label htmlFor="expiry">Expires at</label><input id="expiry" type="datetime-local" required value={form.expiryAt} onChange={(event) => setForm({ ...form, expiryAt: event.target.value })} /></div>}
            {error && <div className="error" role="alert">{error}</div>}
            <button className="button primary" type="submit" disabled={busy}>{busy ? "Issuing…" : "Create secure link"}</button>
          </form>
        </section>
        <aside className="stack">
          <div className="card"><h3>What gets enforced</h3><p className="muted small">One-time links use an atomic database claim. Wrong keys return 401 without increasing views. Expired and revoked links return 410.</p></div>
          {result && <div className="card"><div className="eyebrow">LINK READY</div><h3>{result.note.title}</h3><span className="pill">{result.share.accessType} · {result.share.shareType}</span><div className="link-box"><span className="small">Share URL</span><code>{shareUrl}</code>{result.accessKey && <><span className="small">Generated access key — shown once</span><code>{result.accessKey}</code></>}<Link className="button secondary small" href={`/share/${result.share.token}`}>Open share flow</Link><Link className="button secondary small" href={`/notes/${result.note.id}`}>View controls</Link></div></div>}
        </aside>
      </div>
    </main>
  );
}
