import { NextResponse } from "next/server";
import { clientKey } from "../../../../lib/http";
import { accessShare } from "../../../../lib/store";

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const body = await request.json().catch(() => ({})) as { password?: unknown };
  const password = typeof body.password === "string" ? body.password : undefined;
  const result = await accessShare(token, password, clientKey(request));
  return NextResponse.json(result, result.status === 200 ? undefined : { status: result.status });
}
