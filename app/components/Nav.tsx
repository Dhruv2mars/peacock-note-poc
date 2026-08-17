"use client";
import Link from "next/link";
export default function Nav(){return <div className="topbar"><Link href="/" className="brand">link<span>note</span></Link><div className="top-actions"><Link className="button secondary small" href="/notes/new">New note</Link><Link className="button secondary small" href="/login">Sign out / switch</Link></div></div>}
