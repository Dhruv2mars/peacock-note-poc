import { cookies } from "next/headers";
import { userForToken } from "./store";
export async function currentUser() { return userForToken((await cookies()).get("session")?.value); }
