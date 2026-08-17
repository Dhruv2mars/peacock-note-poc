"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Nav() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <nav className="topbar" aria-label="Primary">
      <Link href="/" className="brand">link<span>note</span></Link>
      <div className="top-actions">
        <Link className="button secondary small" href="/notes/new">New note</Link>
        <button className="button secondary small" onClick={signOut} disabled={busy}>{busy ? "Signing out…" : "Sign out"}</button>
      </div>
    </nav>
  );
}
