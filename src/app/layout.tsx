import type { Metadata, Viewport } from "next";
import "@fontsource-variable/golos-text";
import "@fontsource-variable/manrope";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ishara · Школа жестового языка",
  description: "Первые шаги в казахской дактильной азбуке. Уроки, практика с камерой и перевод на казахский, русский и английский.",
  icons: { icon: "/ishara/icon.svg" },
};

export const viewport: Viewport = { themeColor: "#f7f7f2" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="ru"><body>{children}</body></html>;
}
