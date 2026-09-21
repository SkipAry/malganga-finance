import type { Metadata, Viewport } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Malganga Finance",
    template: "%s · Malganga Finance",
  },
  description: "Loan management and financing platform for Malganga Finance.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f6f9" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0e14" },
  ],
};

/** Applies the stored theme before first paint so there is no flash. */
const themeScript = `(function(){try{var t=localStorage.getItem('mg-theme');if(t==='dark'||t==='light'){document.documentElement.dataset.theme=t}}catch(e){}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" suppressHydrationWarning>
      <head>
        {/*
         * Google Sans, open-licensed (SIL OFL) since November 2025. Loaded from
         * the Google Fonts API rather than next/font because the font data
         * bundled with this Next version predates the release.
         *
         * No `subset` parameter on purpose: the rupee sign (U+20B9) is absent
         * from the latin subset and only ships in the Indic ones, so the API is
         * left to serve every subset and the browser fetches the slices its
         * content actually needs. Restricting to latin would render every
         * amount's ₹ in a fallback face.
         */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Google+Sans:ital,wght@0,400..700;1,400..700&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
