import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NARUTO JUTSU · Hand seals are the controller",
  description: "A browser game where you cast jutsu by performing ninja hand seals in front of your webcam. Real-time hand tracking, custom gesture recognition and an error mode that tells you exactly what to fix.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#07060a",
};

import { KANJI } from "./kanji";

// Display + UI fonts with full Cyrillic support (the game is Russian-first).
const FONTS =
  "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Oswald:wght@500;600;700&family=Exo+2:ital,wght@0,500;0,600;0,700;0,800;1,700&display=swap";
// Kanji font is subset to exactly the glyphs the game uses (see scripts/kanji.mjs).
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
