// app/layout.tsx
import { DotBackground } from "@/components/DotBackground";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { Toaster } from "@/components/ui/sonner";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-inter",
  display: "swap",
});

const faviconPngUrl = "/favicon.png?v=tuff-20260531";
const faviconIcoUrl = "/favicon.ico?v=tuff-20260531";

export const metadata: Metadata = {
  applicationName: "TUFF",
  title: "TUFF",
  description: "Gym performance tracking and analysis",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TUFF",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: faviconPngUrl, sizes: "1024x1024", type: "image/png" },
      {
        url: "/icons/icon-192.png?v=tuff-20260531",
        sizes: "192x192",
        type: "image/png",
      },
      { url: faviconIcoUrl, type: "image/x-icon" },
    ],
    shortcut: [{ url: faviconIcoUrl, type: "image/x-icon" }],
    apple: [{ url: "/apple-touch-icon.png?v=tuff-20260531", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#020617",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className="antialiased font-sans bg-background text-foreground overflow-x-hidden">
        <ServiceWorkerRegister />
        <DotBackground />
        <Toaster position="top-right" />
        <Providers>
          <div className="relative z-10 min-h-screen">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
