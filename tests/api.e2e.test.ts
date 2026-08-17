import { describe, expect, test } from "bun:test";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";

async function register() {
  const email = `e2e-${crypto.randomUUID()}@example.com`;
  const response = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "E2E User", email, password: "correct-horse-battery" }),
  });
  expect(response.status).toBe(200);
  const cookie = response.headers.get("set-cookie")?.split(";", 1)[0];
  expect(cookie).toBeTruthy();
  return { cookie: cookie!, email };
}

async function createNote(
  cookie: string,
  overrides: Record<string, unknown> = {},
) {
  return fetch(`${baseUrl}/api/notes`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({
      title: "E2E note",
      content: "Secret payload",
      accessType: "public",
      shareType: "one-time",
      expiryAt: null,
      ...overrides,
    }),
  });
}

describe("Linknote public API", () => {
  test("rejects malformed access, share, and expiry values", async () => {
    const { cookie } = await register();
    const invalidAccess = await createNote(cookie, { accessType: "unexpected" });
    const invalidShare = await createNote(cookie, { shareType: "forever" });
    const invalidExpiry = await createNote(cookie, {
      shareType: "time-based",
      expiryAt: "not-a-date",
    });
    expect(invalidAccess.status).toBe(400);
    expect(invalidShare.status).toBe(400);
    expect(invalidExpiry.status).toBe(400);
  });

  test("never returns password or access-key hashes", async () => {
    const { cookie } = await register();
    const response = await createNote(cookie, { accessType: "password" });
    expect(response.status).toBe(201);
    const body = JSON.stringify(await response.json());
    expect(body).not.toContain("passwordHash");
    expect(body).not.toContain("accessKeyHash");
  });

  test("logout invalidates the server session", async () => {
    const { cookie } = await register();
    const logout = await fetch(`${baseUrl}/api/auth/logout`, {
      method: "POST",
      headers: { cookie },
    });
    expect(logout.status).toBe(200);
    const after = await createNote(cookie);
    expect(after.status).toBe(401);
  });

  test("wrong password does not count; one-time link succeeds once", async () => {
    const { cookie } = await register();
    const created = await createNote(cookie, { accessType: "password" });
    const body = await created.json() as { share: { token: string }; accessKey: string };
    const url = `${baseUrl}/api/share/${body.share.token}`;
    const wrong = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: "wrong" }) });
    const success = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: body.accessKey }) });
    const replay = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: body.accessKey }) });
    expect(wrong.status).toBe(401);
    expect(success.status).toBe(200);
    expect((await success.json()).share.viewCount).toBe(1);
    expect(replay.status).toBe(410);
  }, 30_000);

  test("only one concurrent request consumes a one-time link", async () => {
    const { cookie } = await register();
    const created = await createNote(cookie);
    const body = await created.json() as { share: { token: string } };
    const url = `${baseUrl}/api/share/${body.share.token}`;
    const responses = await Promise.all(
      Array.from({ length: 8 }, () => fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })),
    );
    expect(responses.filter((response) => response.status === 200)).toHaveLength(1);
    expect(responses.filter((response) => response.status === 410)).toHaveLength(7);
  });

  test("revoked and expired links never open", async () => {
    const { cookie } = await register();
    const revokedCreated = await createNote(cookie, { shareType: "time-based", expiryAt: new Date(Date.now() + 60_000).toISOString() });
    const revoked = await revokedCreated.json() as { share: { token: string } };
    expect((await fetch(`${baseUrl}/api/share/${revoked.share.token}/revoke`, { method: "POST", headers: { cookie } })).status).toBe(200);
    expect((await fetch(`${baseUrl}/api/share/${revoked.share.token}`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })).status).toBe(410);

    const expiredCreated = await createNote(cookie, { shareType: "time-based", expiryAt: new Date(Date.now() - 60_000).toISOString() });
    expect(expiredCreated.status).toBe(400);

    const timedCreated = await createNote(cookie, {
      shareType: "time-based",
      expiryAt: new Date(Date.now() + 2_500).toISOString(),
    });
    const timed = await timedCreated.json() as { share: { token: string } };
    const timedUrl = `${baseUrl}/api/share/${timed.share.token}`;
    expect((await fetch(timedUrl, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })).status).toBe(200);
    await Bun.sleep(3_000);
    expect((await fetch(timedUrl, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })).status).toBe(410);
  }, 30_000);

  test("password links rate-limit brute-force attempts", async () => {
    const { cookie } = await register();
    const created = await createNote(cookie, { accessType: "password" });
    const body = await created.json() as { share: { token: string } };
    const url = `${baseUrl}/api/share/${body.share.token}`;
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 11; attempt += 1) {
      const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": "198.51.100.42" }, body: JSON.stringify({ password: "wrong" }) });
      statuses.push(response.status);
    }
    expect(statuses.slice(0, 10)).toEqual(Array(10).fill(401));
    expect(statuses[10]).toBe(429);
  }, 30_000);
});
