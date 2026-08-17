import { NextResponse } from "next/server";
import { accessShare } from "../../../../lib/store";
export async function POST(req:Request,{params}:{params:Promise<{token:string}>}){const {token}=await params;const body=await req.json().catch(()=>({}));const out=await accessShare(token,body.password);return NextResponse.json(out,out.status===200?undefined:{status:out.status});}
