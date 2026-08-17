# Linknote — Peacock India MERN/PERN POC

Secure expiring note-sharing app built with Next.js App Router, TypeScript, Tailwind CSS, and server route handlers.

## Run locally

```bash
bun install
bun dev
```

Open `http://localhost:3000`. Register with any email and an 8+ character password. Demo state is written to `.data/store.json` (ignored from git) so the POC runs without external credentials. A production deployment should replace `lib/store.ts` with a PostgreSQL adapter and keep the same transaction boundaries.

## Flow

1. Register or sign in.
2. Create a note and select public/password access plus one-time/time-based sharing.
3. Password links generate a high-entropy access key. Only its salted scrypt hash is stored; the raw key is shown once.
4. Share URL opens `/share/[token]`. The server validates revoke/expiry, verifies the key, atomically consumes one-time links, and increments view count only on success.
5. Note controls show links and counts. Owners can revoke active links.

## Security decisions

- Session tokens are random, httpOnly, same-site cookies.
- Passwords and access keys use Node `scryptSync` with random salts; comparisons use `timingSafeEqual`.
- All share state changes run through one serialized transaction queue. The one-time `usedAt` check and write happen in the same critical section, so concurrent requests cannot both succeed.
- Wrong key, expired, revoked, invalid, or already-consumed links never increment `viewCount`.
- For production scale: use PostgreSQL row locks/conditional updates for the one-time claim, a rate limiter keyed by token/IP for brute-force protection, and a cache/CDN for immutable public note payloads while keeping claim/count writes strongly consistent.

## Required assessment answers

**How prevent two users using one-time link simultaneously?** Perform `usedAt IS NULL` check plus claim in one database transaction/conditional update. This POC serializes that critical section; PostgreSQL should use `UPDATE ... WHERE used_at IS NULL RETURNING`.

**How update view count safely?** Increment only after all checks pass, inside the same transaction as the one-time claim. Never increment on failed password, expiry, revoke, or invalid-token paths.

**How handle 1 million opens?** Cache/read-replicate note payloads, keep token metadata indexed by token, route writes to a primary, and use an atomic claim endpoint with rate limiting. Counts can be sharded or queued for non-one-time links if exact synchronous counts are not required.

**How prevent brute force?** Store only a hash, rate-limit by token and IP, add exponential backoff/temporary lockout, alert on bursts, and use a long random key (this POC uses 64 bits of random key material plus a salted hash).

## Verification

```bash
bun run build
```

Manual API smoke test covered: wrong key → `401` with count `0`; correct key → `200` with count `1`; second one-time open → `410` with count unchanged.

## Submission package

- Live demo URL: deploy this app to a host with a PostgreSQL adapter and `NODE_ENV=production`.
- GitHub repository: this directory is ready to push as `peacock-note-poc`.
- Demo video: record the flow in the order listed in the assessment: create note, public link, password link, wrong key, one-time reuse, time expiry, revoke, and view count.
- Test account: create one through `/register`; do not commit credentials.
