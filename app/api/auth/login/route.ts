import { NextResponse } from "next/server";
import { login } from "../../../../lib/store";
export async function POST(req:Request){try{const {email,password}=await req.json();const out=await login(email,password);const res=NextResponse.json({user:out.user});res.cookies.set("session",out.token,{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",maxAge:60*60*24*30,path:"/"});return res;}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Unable to sign in"},{status:401});}}
