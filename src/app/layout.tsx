import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

/**
 * IBM Plex Sans + IBM Plex Mono adalah satu superfamily: perancang sama,
 * metrik dan bentuk angka sepadan. Itu penting di sini karena antarmukanya
 * terus-menerus menyandingkan label sans dengan angka mono di tabel yang sama.
 * Sebelumnya Inter dipasangkan dengan Plex Mono, dua keluarga dari asal
 * rancangan berbeda, dan angkanya tidak pernah benar-benar sepadan.
 *
 * Lisensinya SIL OFL dan cakupan Latin-nya penuh untuk bahasa Indonesia.
 */
const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "DEWA-PBJ · Digital Early Warning Analytics",
  description: "Dashboard untuk memonitor proyek PBJ Kemnaker",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" data-theme="light" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                let theme = localStorage.getItem('theme');
                if (!theme) {
                  theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                }
                document.documentElement.setAttribute('data-theme', theme);
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className={`${plexSans.variable} ${plexMono.variable}`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
