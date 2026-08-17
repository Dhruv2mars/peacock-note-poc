import crypto from "node:crypto";
import { promisify } from "node:util";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { getDatabase } from "../db";
import { notes, rateLimits, sessions, shares, users } from "../db/schema";
import type { CreateNoteInput } from "./validation";

const scrypt = promisify(crypto.scrypt);
const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

export type PublicUser = { id: string; name: string; email: string };
export type PublicShare = {
  id: string;
  noteId: string;
  token: string;
  accessType: "public" | "password";
  shareType: "one-time" | "time-based";
  expiryAt: string | null;
  usedAt: string | null;
  revokedAt: string | null;
  viewCount: number;
  createdAt: string;
};

function randomId() {
  return crypto.randomUUID();
}

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}

async function hashSecret(secret: string, salt = crypto.randomBytes(16).toString("hex")) {
  const derived = await scrypt(secret, salt, 32) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

async function secretMatches(secret: string, stored: string) {
  const [salt, hex] = stored.split(":");
  if (!salt || !hex) return false;
  const expected = Buffer.from(hex, "hex");
  const actual = await scrypt(secret, salt, 32) as Buffer;
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

function publicShare(row: typeof shares.$inferSelect): PublicShare {
  return {
    id: row.id,
    noteId: row.noteId,
    token: row.token,
    accessType: row.accessType as PublicShare["accessType"],
    shareType: row.shareType as PublicShare["shareType"],
    expiryAt: row.expiryAt?.toISOString() ?? null,
    usedAt: row.usedAt?.toISOString() ?? null,
    revokedAt: row.revokedAt?.toISOString() ?? null,
    viewCount: row.viewCount,
    createdAt: row.createdAt.toISOString(),
  };
}

async function createSession(userId: string) {
  const token = randomToken();
  await getDatabase().insert(sessions).values({
    token,
    userId,
    expiresAt: new Date(Date.now() + SESSION_LIFETIME_MS),
  });
  return token;
}

export async function register(name: string, email: string, password: string) {
  const database = getDatabase();
  const id = randomId();
  try {
    await database.insert(users).values({ id, name, email, passwordHash: await hashSecret(password) });
  } catch (error) {
    if ((error as { code?: string }).code === "23505" || String(error).includes("users_email_unique")) {
      throw new Error("Email already registered");
    }
    throw error;
  }
  return { user: { id, name, email } satisfies PublicUser, token: await createSession(id) };
}

export async function login(email: string, password: string) {
  const [user] = await getDatabase().select().from(users).where(eq(users.email, email)).limit(1);
  if (!user || !(await secretMatches(password, user.passwordHash))) throw new Error("Invalid email or password");
  return {
    user: { id: user.id, name: user.name, email: user.email } satisfies PublicUser,
    token: await createSession(user.id),
  };
}

export async function logout(token: string | undefined) {
  if (token) await getDatabase().delete(sessions).where(eq(sessions.token, token));
}

export async function userForToken(token: string | undefined) {
  if (!token) return null;
  const [row] = await getDatabase()
    .select({ id: users.id, name: users.name, email: users.email })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return row ?? null;
}

export async function createNote(ownerId: string, input: CreateNoteInput) {
  const database = getDatabase();
  const note = {
    id: randomId(),
    ownerId,
    title: input.title,
    content: input.content,
    createdAt: new Date(),
  };
  const accessKey = input.accessType === "password" ? randomToken(12) : null;
  const share = {
    id: randomId(),
    noteId: note.id,
    token: randomToken(24),
    accessType: input.accessType,
    shareType: input.shareType,
    expiryAt: input.expiryAt,
    accessKeyHash: accessKey ? await hashSecret(accessKey) : null,
    viewCount: 0,
    createdAt: new Date(),
  };
  await database.batch([
    database.insert(notes).values(note),
    database.insert(shares).values(share),
  ]);
  return {
    note: { ...note, createdAt: note.createdAt.toISOString() },
    share: publicShare({ ...share, usedAt: null, revokedAt: null }),
    accessKey,
  };
}

export async function notesFor(ownerId: string) {
  const rows = await getDatabase()
    .select({ note: notes, share: shares })
    .from(notes)
    .leftJoin(shares, eq(shares.noteId, notes.id))
    .where(eq(notes.ownerId, ownerId));
  const grouped = new Map<string, { note: typeof notes.$inferSelect; shares: PublicShare[] }>();
  for (const row of rows) {
    const item = grouped.get(row.note.id) ?? { note: row.note, shares: [] };
    if (row.share) item.shares.push(publicShare(row.share));
    grouped.set(row.note.id, item);
  }
  return [...grouped.values()];
}

export async function noteFor(ownerId: string, noteId: string) {
  const [note] = await getDatabase().select().from(notes).where(and(eq(notes.id, noteId), eq(notes.ownerId, ownerId))).limit(1);
  if (!note) return null;
  const noteShares = await getDatabase().select().from(shares).where(eq(shares.noteId, noteId));
  return { note, shares: noteShares.map(publicShare) };
}

export async function revokeShare(ownerId: string, token: string) {
  const [updated] = await getDatabase()
    .update(shares)
    .set({ revokedAt: new Date() })
    .where(and(
      eq(shares.token, token),
      isNull(shares.revokedAt),
      sql`exists (select 1 from ${notes} where ${notes.id} = ${shares.noteId} and ${notes.ownerId} = ${ownerId})`,
    ))
    .returning();
  if (!updated) throw new Error("Share not found");
  return publicShare(updated);
}

export async function consumeRateLimit(key: string, limit = 10, windowMinutes = 10) {
  const [result] = await getDatabase()
    .insert(rateLimits)
    .values({ key, count: 1, windowStartedAt: new Date() })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`case when ${rateLimits.windowStartedAt} < now() - make_interval(mins => ${windowMinutes}) then 1 else ${rateLimits.count} + 1 end`,
        windowStartedAt: sql`case when ${rateLimits.windowStartedAt} < now() - make_interval(mins => ${windowMinutes}) then now() else ${rateLimits.windowStartedAt} end`,
      },
    })
    .returning({ count: rateLimits.count });
  return (result?.count ?? limit + 1) <= limit;
}

export async function accessShare(token: string, password: string | undefined, clientKey: string) {
  const database = getDatabase();
  const [row] = await database
    .select({ share: shares, note: notes })
    .from(shares)
    .innerJoin(notes, eq(notes.id, shares.noteId))
    .where(eq(shares.token, token))
    .limit(1);
  if (!row) return { status: 404 as const, error: "Invalid share link" };
  if (row.share.revokedAt) return { status: 410 as const, error: "This link was revoked" };
  if (row.share.expiryAt && row.share.expiryAt.getTime() <= Date.now()) return { status: 410 as const, error: "This link has expired" };
  if (row.share.accessType === "password") {
    if (!(await consumeRateLimit(`share:${token}:${clientKey}`))) return { status: 429 as const, error: "Too many attempts. Try again later" };
    if (!password || !row.share.accessKeyHash || !(await secretMatches(password, row.share.accessKeyHash))) {
      return { status: 401 as const, error: "Incorrect password/key" };
    }
  }

  const baseConditions = [eq(shares.id, row.share.id), isNull(shares.revokedAt)];
  if (row.share.expiryAt) baseConditions.push(gt(shares.expiryAt, new Date()));
  if (row.share.shareType === "one-time") baseConditions.push(isNull(shares.usedAt));
  const [claimed] = await database
    .update(shares)
    .set({
      viewCount: sql`${shares.viewCount} + 1`,
      ...(row.share.shareType === "one-time" ? { usedAt: new Date() } : {}),
    })
    .where(and(...baseConditions))
    .returning({ viewCount: shares.viewCount });
  if (!claimed) {
    const [latest] = await database.select().from(shares).where(eq(shares.id, row.share.id)).limit(1);
    if (latest?.revokedAt) return { status: 410 as const, error: "This link was revoked" };
    if (latest?.expiryAt && latest.expiryAt.getTime() <= Date.now()) return { status: 410 as const, error: "This link has expired" };
    return { status: 410 as const, error: "This one-time link was already used" };
  }
  return {
    status: 200 as const,
    note: { title: row.note.title, content: row.note.content },
    share: {
      accessType: row.share.accessType,
      shareType: row.share.shareType,
      viewCount: claimed.viewCount,
      expiryAt: row.share.expiryAt?.toISOString() ?? null,
    },
  };
}
