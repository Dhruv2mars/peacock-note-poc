import { NextResponse } from "next/server";
import { setSessionCookie } from "../../../../lib/http";
import { register } from "../../../../lib/store";
import { parseCredentials } from "../../../../lib/validation";

export async function POST(request: Request) {
  try {
    const { name, email, password } = parseCredentials(await request.json(), "register");
    const result = await register(name, email, password);
    const response = NextResponse.json({ user: result.user });
    setSessionCookie(response, result.token);
    return response;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to register" }, { status: 400 });
  }
}
