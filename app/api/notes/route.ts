import { NextResponse } from "next/server";
import { currentUser } from "../../../lib/auth";
import { createNote, notesFor } from "../../../lib/store";
import { parseCreateNoteInput } from "../../../lib/validation";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  return NextResponse.json({ items: await notesFor(user.id) });
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  try {
    const input = parseCreateNoteInput(await request.json());
    return NextResponse.json(await createNote(user.id, input), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create note" }, { status: 400 });
  }
}
