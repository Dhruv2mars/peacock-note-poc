# Linknote — Peacock India assessment

A secure expiring note-sharing app built with Next.js 16, TypeScript, Tailwind CSS, Neon PostgreSQL, and Drizzle ORM.

## Submission

- Live app: https://peacock-note-poc.vercel.app
- Repository: https://github.com/Dhruv2mars/peacock-note-poc
- Demo video: https://github.com/Dhruv2mars/peacock-note-poc/releases/download/v0.1.0/peacock-poc-demo.webm
- Review account: `reviewer.e2e.20260817@example.com` / `PeacockDemo!2026`

The review account and production deployment were exercised with real browser E2E flows on August 17, 2026.

## Features

- Registration, sign-in, expiring database sessions, sign-out, and protected owner routes
- Private notes with public or generated-key access
- One-time links with an atomic claim and time-based links with server-enforced expiry
- Owner controls, successful-view counts, and immediate revocation
- Salted asynchronous scrypt hashes for passwords and access keys; raw access keys are shown once
- PostgreSQL-backed rate limiting for login and protected-link attempts
- Strict request validation and sanitized responses that never expose hashes

## Run locally

```bash
bun install
cp .env.example .env.local
bun run db:push
bun dev
```

Set `DATABASE_URL` in `.env.local` to a PostgreSQL connection string. Open `http://localhost:3000`.

## Verification

```bash
bun run lint
bun run build
bun run test:e2e
```

The API suite covers malformed input, secret non-disclosure, logout invalidation, wrong-key counting, one-time replay, eight concurrent claims, revocation, expiry, and brute-force throttling. It can target production with:

```bash
E2E_BASE_URL=https://peacock-note-poc.vercel.app bun run test:e2e
```

## Assessment answers

### How do you prevent simultaneous use of a one-time link?

The claim is one conditional PostgreSQL update: `UPDATE shares ... WHERE used_at IS NULL AND revoked_at IS NULL ... RETURNING`. Only one concurrent request can receive a returned row. The production test sends eight simultaneous requests and asserts exactly one `200`; every other request receives `410`.

### How is the view count updated safely?

The successful view increment happens in the same conditional update as the one-time claim. Authentication, expiry, and revocation checks happen first, and the update repeats the mutable guards. Wrong keys, expired links, revoked links, invalid tokens, and consumed links never increment the counter.

### How would this handle one million opens?

Tokens and ownership columns are indexed. Stateless Vercel functions can scale horizontally while Neon remains the source of truth. Public note payloads can be cached or read-replicated, but claim, revocation, and exact-count writes stay on the primary. At sustained high write volume, partition shares by token hash and stream non-critical aggregate analytics separately; one-time claims remain synchronous and strongly consistent.

### How is brute force prevented?

Access keys are 96-bit cryptographically random values. Only salted scrypt hashes are stored and comparisons are timing-safe. Attempts are rate-limited in PostgreSQL by share token and client IP; login attempts are also throttled. Production should additionally place equivalent limits at the edge and alert on abnormal bursts.

## Data model and security boundaries

`users`, `sessions`, `notes`, `shares`, and `rate_limits` are persisted in PostgreSQL with foreign keys, uniqueness constraints, checks, and indexes. Session cookies are random, `httpOnly`, `sameSite=lax`, secure in production, and expire after 30 days. Owner APIs derive identity from the server-side session; callers cannot choose an owner ID.
