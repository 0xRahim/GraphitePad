import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./landing.css";

export const metadata: Metadata = {
  title: "GraphitePad — Sketch & Pixel Studios",
  description:
    "A paper-feel sketch canvas and an infinite pixel grid, built for the trackpad. Layer, guide, animate, and export without leaving the page.",
  applicationName: "GraphitePad",
  keywords: [
    "drawing app",
    "sketch",
    "pixel art",
    "pixel editor",
    "animation",
    "trackpad drawing",
  ],
  openGraph: {
    title: "GraphitePad — Sketch & Pixel Studios",
    description:
      "Think in graphite. Build in pixels. Two focused studios, one pad.",
    siteName: "GraphitePad",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e9e6df" },
    { media: "(prefers-color-scheme: dark)", color: "#1b1b1e" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full">
        <script
          dangerouslySetInnerHTML={{
            __html:
              'try{var t=localStorage.getItem("gp-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}',
          }}
        />
        <noscript>
          <style>{`.reveal{opacity:1;transform:none}.trail-fallback{display:block}`}</style>
        </noscript>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
