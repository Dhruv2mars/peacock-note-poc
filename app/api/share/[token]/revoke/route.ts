import { NextResponse } from "next/server";
import { currentUser } from "../../../../../lib/auth";
import { revokeShare } from "../../../../../lib/store";
export async function POST(_:Request,{params}:{params:Promise<{token:string}>}){const user=await currentUser();if(!user)return NextResponse.json({error:"Sign in required"},{status:401});try{const {token}=await params;await revokeShare(user.id,token);return NextResponse.json({ok:true});}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Unable to revoke"},{status:404});}}
