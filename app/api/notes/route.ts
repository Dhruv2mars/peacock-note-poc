import { NextResponse } from "next/server";
import { currentUser } from "../../../lib/auth";
import { createNote, notesFor } from "../../../lib/store";
export async function GET(){const user=await currentUser();if(!user)return NextResponse.json({error:"Sign in required"},{status:401});return NextResponse.json({items:await notesFor(user.id)});}
export async function POST(req:Request){const user=await currentUser();if(!user)return NextResponse.json({error:"Sign in required"},{status:401});try{const body=await req.json();if(!body.title||!body.content)return NextResponse.json({error:"Title and content required"},{status:400});const out=await createNote(user.id,body.title,body.content,{accessType:body.accessType,shareType:body.shareType,expiryAt:body.expiryAt||null});return NextResponse.json(out,{status:201});}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Unable to create note"},{status:400});}}
