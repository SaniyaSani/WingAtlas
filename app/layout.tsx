import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EntoWing — Interactive Diptera Wing Atlas",
  description: "A field journal of Diptera wings: learn vein names, explore families, compare published plates and trace your own specimen. Compare prepared-wing photographs with reusable Diptera references, reconstruct SVG venation, and edit specimen-true wing maps.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-entowing-theme="journal" suppressHydrationWarning>
      <head>
        {/* Apply the saved theme before first paint so the page does not flash in the default theme. */}
        <script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('entowing-visual-theme-v1');if(t==='scientific'||t==='nocturnal'||t==='journal')document.documentElement.dataset.entowingTheme=t}catch(e){}" }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
