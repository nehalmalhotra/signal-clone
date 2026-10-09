import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Signal bundles Inter in 400/500/600 (design-tokens §2.1).
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  // "Signal Clone" (not "Signal") so the browser tab never reads as the real app.
  title: "Signal Clone",
  description: "A Signal Desktop clone",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
