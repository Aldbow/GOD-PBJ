import type { Metadata } from "next";
import { Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

import { Shell } from "@/components/layout/Shell";

export const metadata: Metadata = {
  title: "DEWA-PBJ — Early warning pengadaan",
  description: "Dashboard untuk memonitor proyek PBJ Kemnaker",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" data-theme="light" suppressHydrationWarning>
      <body className={`${inter.variable} ${plexMono.variable}`}>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
