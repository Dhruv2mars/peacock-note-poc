import { NextResponse } from "next/server";
import { clientKey, setSessionCookie } from "../../../../lib/http";
import { consumeRateLimit, login } from "../../../../lib/store";
import { parseCredentials } from "../../../../lib/validation";

export async function POST(request: Request) {
  try {
    const { email, password } = parseCredentials(await request.json(), "login");
    if (!(await consumeRateLimit(`login:${clientKey(request)}:${email}`, 8, 15))) {
      return NextResponse.json({ error: "Too many attempts. Try again later" }, { status: 429 });
    }
    const result = await login(email, password);
    const response = NextResponse.json({ user: result.user });
    setSessionCookie(response, result.token);
    return response;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to sign in" }, { status: 401 });
  }
}
