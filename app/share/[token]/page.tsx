"use client";

import Link from "next/link";
import { use, useState } from "react";

type AccessedNote = {
  note: { title: string; content: string };
  share: { viewCount: number; accessType: string; shareType: string; expiryAt: string | null };
};

export default function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [password, setPassword] = useState("");
  const [data, setData] = useState<AccessedNote | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function unlock(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/share/${token}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = await response.json() as AccessedNote & { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Unable to open link");
      setData(result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to open link");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell auth">
      <div className="eyebrow">LINKNOTE SHARE</div>
      <div className="card">
        {data ? <><div className="pill">ACCESS GRANTED · {data.share.viewCount} view{data.share.viewCount === 1 ? "" : "s"}</div><h2>{data.note.title}</h2><p className="muted" style={{ whiteSpace: "pre-wrap" }}>{data.note.content}</p><p className="muted small">This view was counted only after access succeeded.</p></> : <><h2>Open shared note</h2><p className="muted">Access is checked server-side. One-time links become unusable after this successful view.</p><form onSubmit={unlock}><div className="field"><label htmlFor="key">{error ? "Try access key again" : "Access key (only for password-protected links)"}</label><input id="key" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Leave blank for public link" /></div>{error && <div className="error" role="alert">{error}</div>}<button className="button primary" disabled={busy}>{busy ? "Checking…" : "Open note"}</button></form></>}
        <p className="muted small"><Link href="/" className="brand">Create your own linknote →</Link></p>
      </div>
    </main>
  );
}
