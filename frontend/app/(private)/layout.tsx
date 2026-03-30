import BottomNav from "@/components/BottomNav";
import { OnboardingGuard } from "@/components/OnboardingGuard";
import { TimerPill } from "@/components/TimerPill";
import { TimerProvider } from "@/contexts/TimerContext";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import "../globals.css";

export const metadata: Metadata = {
  title: "Fit Check",
  description: "Gym performance tracking and analysis",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token");
  if (!token) {
    redirect("/login");
  }

  return (
    <TimerProvider>
      <div
        className="antialiased font-sans text-foreground flex min-h-screen flex-col relative"
      >
        <OnboardingGuard>
          <TimerPill />
          <div className="flex-1 relative z-10">{children}</div>
          <BottomNav className="" />
        </OnboardingGuard>
      </div>
    </TimerProvider>
  );
}
