// app/(public)/layout.tsx
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Fit Check - Sign In",
  description: "Sign in to your Fit Check account",
};

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check if user is already authenticated
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token");

  // If authenticated, redirect to dashboard
  if (token) {
    redirect("/dashboard");
  }

  // If not authenticated, show the public page (login/register)
  return <>{children}</>;
}
