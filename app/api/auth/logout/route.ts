import { NextResponse } from "next/server";
import { currentSessionToken } from "../../../../lib/auth";
import { clearSessionCookie } from "../../../../lib/http";
import { logout } from "../../../../lib/store";

export async function POST() {
  await logout(await currentSessionToken());
  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}
