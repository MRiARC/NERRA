import type { Metadata } from "next";
import { Newsreader, Literata, Plus_Jakarta_Sans } from "next/font/google";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { Toaster } from "sonner";
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
      className={`h-full antialiased ${newsreader.variable} ${literata.variable} ${plusJakartaSans.variable}`}
      data-theme="literary-obsidian"
    >
      <body className="min-h-full flex flex-col bg-surface-void text-ink-parchment selection:bg-wine-accent selection:text-ink-parchment">
        <QueryProvider>
          <ThemeProvider>
            {children}
            <Toaster
              theme="dark"
              position="bottom-right"
              toastOptions={{
                className:
                  "!bg-surface-elevated !border !border-border-prominent !text-ink-parchment !shadow-2xl",
              }}
            />
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
