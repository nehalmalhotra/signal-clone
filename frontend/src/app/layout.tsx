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

// Runs before paint, on every page (not just inside the app shell), so a saved dark/light choice
// never flashes the wrong theme first. Keep in sync with store/theme.ts's STORAGE_KEY/logic.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var saved = localStorage.getItem("signal-clone.theme") || "system";
    var dark = saved === "dark" || (saved === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
