import { NextResponse } from "next/server";
import { currentUser } from "../../../../lib/auth";
import { noteFor } from "../../../../lib/store";
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){const user=await currentUser();if(!user)return NextResponse.json({error:"Sign in required"},{status:401});const {id}=await params;const out=await noteFor(user.id,id);return out?NextResponse.json(out):NextResponse.json({error:"Not found"},{status:404});}
