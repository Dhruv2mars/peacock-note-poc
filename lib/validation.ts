export type AccessType = "public" | "password";
export type ShareType = "one-time" | "time-based";

export type CreateNoteInput = {
  title: string;
  content: string;
  accessType: AccessType;
  shareType: ShareType;
  expiryAt: Date | null;
};

export function parseCreateNoteInput(value: unknown): CreateNoteInput {
  if (!value || typeof value !== "object") throw new Error("Invalid request body");
  const body = value as Record<string, unknown>;
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (!title || title.length > 120) throw new Error("Title must be 1–120 characters");
  if (!content || content.length > 20_000) throw new Error("Content must be 1–20,000 characters");
  if (body.accessType !== "public" && body.accessType !== "password") throw new Error("Invalid access type");
  if (body.shareType !== "one-time" && body.shareType !== "time-based") throw new Error("Invalid share type");

  let expiryAt: Date | null = null;
  if (body.shareType === "time-based") {
    if (typeof body.expiryAt !== "string") throw new Error("Expiry is required");
    expiryAt = new Date(body.expiryAt);
    if (!Number.isFinite(expiryAt.getTime())) throw new Error("Invalid expiry date");
    if (expiryAt.getTime() <= Date.now()) throw new Error("Expiry must be in the future");
  }

  return { title, content, accessType: body.accessType, shareType: body.shareType, expiryAt };
}

export function parseCredentials(value: unknown, mode: "login" | "register") {
  if (!value || typeof value !== "object") throw new Error("Invalid request body");
  const body = value as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (mode === "register" && (!name || name.length > 80)) throw new Error("Name must be 1–80 characters");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new Error("Valid email required");
  if (password.length < 8 || password.length > 200) throw new Error("Password must be 8–200 characters");
  return { name, email, password };
}
