"use client";

import { use, useEffect, useState } from "react";
import Nav from "../../components/Nav";

type Share = {
  token: string;
  accessType: "public" | "password";
  shareType: "one-time" | "time-based";
  viewCount: number;
  usedAt: string | null;
  revokedAt: string | null;
};
type NoteDetails = { note: { title: string; content: string }; shares: Share[] };

export default function NotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<NoteDetails | null>(null);
  const [error, setError] = useState("");
  const [revoking, setRevoking] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/notes/${id}`).then(async (response) => {
      const result = await response.json() as NoteDetails & { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Unable to load note");
      setData(result);
    }).catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to load note"));
  }, [id]);

  async function revoke(token: string) {
    setRevoking(token);
    setError("");
    try {
      const response = await fetch(`/api/share/${token}/revoke`, { method: "POST" });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Unable to revoke link");
      setData((current) => current ? { ...current, shares: current.shares.map((share) => share.token === token ? { ...share, revokedAt: new Date().toISOString() } : share) } : current);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to revoke link");
    } finally {
      setRevoking(null);
    }
  }

  return (
    <main className="shell">
      <Nav />
      {error && <div className="error" role="alert">{error}</div>}
      {!data && !error && <p className="muted">Loading…</p>}
      {data && <div className="main-grid">
        <section className="stack">
          <div><div className="eyebrow">NOTE CONTROL</div><h2>{data.note.title}</h2><p className="muted">{data.note.content}</p></div>
          <div className="stat-row">
            <div className="stat"><strong>{data.shares.reduce((count, share) => count + share.viewCount, 0)}</strong><span>successful views</span></div>
            <div className="stat"><strong>{data.shares.length}</strong><span>issued links</span></div>
            <div className="stat"><strong>{data.shares.filter((share) => !share.revokedAt && !share.usedAt).length}</strong><span>active links</span></div>
          </div>
        </section>
        <aside className="stack"><div className="card"><h3>Share controls</h3>{data.shares.map((share) => <div className="link-box" key={share.token}><span className="pill">{share.accessType} · {share.shareType}</span><code>{window.location.origin}/share/{share.token}</code><span className="muted small">Views: {share.viewCount}{share.usedAt ? " · consumed" : ""}{share.revokedAt ? " · revoked" : ""}</span>{!share.revokedAt && !share.usedAt && <button className="button danger small" disabled={revoking === share.token} onClick={() => revoke(share.token)}>{revoking === share.token ? "Revoking…" : "Revoke link"}</button>}</div>)}</div></aside>
      </div>}
    </main>
  );
}
