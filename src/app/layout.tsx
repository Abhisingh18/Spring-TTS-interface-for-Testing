import type { Metadata, Viewport } from "next";

import { CommandPalette } from "@/components/CommandPalette";
import { StudioShell } from "@/components/StudioShell";
import { ListenerBoot } from "@/components/SignIn";
import { NowPlayingBar } from "@/components/NowPlayingBar";
import { ShortcutsOverlay } from "@/components/ShortcutsOverlay";
import { branding } from "@/config/branding";
import { getBundle } from "@/lib/bundle";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: branding.name,
    template: `%s · ${branding.name}`,
  },
  description: branding.description,
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0f1a" },
  ],
};

/** Applies the saved theme before first paint so there is no flash. */
const THEME_SCRIPT = `
(function () {
  try {
    var saved = localStorage.getItem("vc-listening-studio.theme");
    var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.dataset.theme = saved || (prefersDark ? "dark" : "light");
  } catch (_) {
    document.documentElement.dataset.theme = "dark";
  }
})();
`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { pairs, stats } = await getBundle();
  const navPairs = pairs.map((pair) => ({
    slug: pair.slug,
    name: pair.name,
    index: pair.index,
    models: pair.models.length,
  }));

  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="antialiased">
        <ListenerBoot />
        <StudioShell pairs={navPairs} stats={stats}>
          {children}
        </StudioShell>
        <NowPlayingBar />
        <ShortcutsOverlay />
        <CommandPalette
          pairs={navPairs.map(({ slug, name, index }) => ({ slug, name, index }))}
        />
      </body>
    </html>
  );
}
