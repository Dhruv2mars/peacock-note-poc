import type { Metadata } from "next";
export const metadata: Metadata = { title: "Sign in · Linknote" };
export default function LoginLayout({ children }: LayoutProps<"/login">) { return children; }
