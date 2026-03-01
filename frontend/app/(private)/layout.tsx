import BottomNav from "@/components/BottomNav";
import { OnboardingGuard } from "@/components/OnboardingGuard";
import { TimerPill } from "@/components/TimerPill";
import { TimerProvider } from "@/contexts/TimerContext";
import type { Metadata } from "next";
import { Cinzel, Roboto, Roboto_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import "../globals.css";

const roboto = Roboto({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const cinzel = Cinzel({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

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
        className={`${roboto.variable} ${robotoMono.variable} ${cinzel.variable} antialiased font-sans text-foreground flex min-h-screen flex-col relative`}
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
