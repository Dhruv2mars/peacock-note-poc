import { cookies } from "next/headers";
import { userForToken } from "./store";

export async function currentSessionToken() {
  return (await cookies()).get("session")?.value;
}

export async function currentUser() {
  return userForToken(await currentSessionToken());
}
