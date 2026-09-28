import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SHINOBI — JUTSU · Your hands are the controller",
  description: "A browser game where you cast jutsu by performing ninja hand seals in front of your webcam. Real-time hand tracking, custom gesture recognition and an error mode that tells you exactly what to fix.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#07060a",
};

const FONTS =
  "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Rajdhani:wght@500;600;700&display=swap";
// Kanji font is subset to exactly the glyphs the game uses (a few KB instead of MBs).
const KANJI = "忍術寅未巳午辰申丑酉火水雷遁影鬼失";
const KANJI_FONT = `https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@900&display=swap&text=${encodeURIComponent(KANJI)}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href={FONTS} />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href={KANJI_FONT} />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body>{children}</body>
    </html>
  );
}
