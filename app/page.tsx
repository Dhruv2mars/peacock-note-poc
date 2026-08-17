import Link from "next/link";

export default function Home() {
  return (
    <main className="shell hero">
      <div className="eyebrow">PEACOCK INDIA · MERN/PERN POC</div>
      <h1>Share notes with links that know when to stop.</h1>
      <p className="lede">Create private notes, choose public or password access, and issue one-time or expiring links. Every successful view is counted safely.</p>
      <div className="actions">
        <Link className="button primary" href="/register">Create account</Link>
        <Link className="button secondary" href="/login">Sign in</Link>
      </div>
      <div className="feature-grid">
        {[
          ["One-time links", "Atomic claim prevents two simultaneous viewers from consuming the same link."],
          ["Password access", "Dynamic keys are hashed at rest and wrong attempts never increment views."],
          ["Honest telemetry", "Only successful public views or password unlocks count."],
        ].map(([title, copy]) => <div className="feature" key={title}><strong>{title}</strong><span>{copy}</span></div>)}
      </div>
    </main>
  );
}
