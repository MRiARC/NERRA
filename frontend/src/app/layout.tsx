import type { Metadata } from "next";
import { Newsreader, Literata, Plus_Jakarta_Sans } from "next/font/google";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { StudioToaster } from "@/components/providers/StudioToaster";
import "./globals.css";

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  display: "swap",
});

const literata = Literata({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-literata",
  display: "swap",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "NERRA — Story Intelligence Operating System",
  description:
    "Deterministic Story Intelligence, Epistemic Knowledge Tracking, Dual Timelines & Real-time Author Studio.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`h-full antialiased ${newsreader.variable} ${literata.variable} ${plusJakartaSans.variable}`}
      data-theme="literary-obsidian"
    >
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col bg-surface-void text-ink-parchment selection:bg-wine-accent selection:text-ink-parchment"
      >
        {/* Apply the persisted theme before hydration to avoid a dark flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              '(function(){try{var raw=localStorage.getItem("nerra_theme_preference");if(!raw)return;var parsed=JSON.parse(raw);var theme=(parsed.state||parsed).theme;if(theme){document.documentElement.setAttribute("data-theme",theme);}}catch(e){}})();',
          }}
        />
        <QueryProvider>
          <ThemeProvider>
            {children}
            <StudioToaster />
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
