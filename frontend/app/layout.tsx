// app/layout.tsx
import type { Metadata } from "next";
import { Balsamiq_Sans, DM_Mono, Lora } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import Providers from "./providers";

const balsamiqSans = Balsamiq_Sans({
  variable: "--font-balsamiq-sans",
  subsets: ["latin"],
  weight: ["400", "700"], // Bebas Neue only has 400 weight
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"], // Add weights you need
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400"], // Add weights you need
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
    <html lang="en">
      <body
        className={`${balsamiqSans.variable} ${lora.variable} ${dmMono.variable} antialiased`}
      >
        <Toaster position="top-right" richColors />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
