// app/layout.tsx
import { DeerMark } from "@/components/DeerMark";
import { DotBackground } from "@/components/DotBackground";
import type { Metadata } from "next";
import { Cinzel, Roboto, Roboto_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import Providers from "./providers";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${roboto.variable} ${robotoMono.variable} ${cinzel.variable} antialiased font-sans bg-background text-foreground overflow-x-hidden`}
      >
        <DotBackground />
        <DeerMark className="pointer-events-none fixed -right-16 -bottom-20 h-[560px] w-[560px] opacity-2.5 z-0" />
        <Toaster position="top-right" richColors />
        <Providers>
          <div className="relative z-10 min-h-screen">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
