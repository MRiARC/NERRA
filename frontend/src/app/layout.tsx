import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NERRA — Story Intelligence Engine",
  description: "Deterministic Story Intelligence, Contradiction Detection, and RAG Story Chat",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body className="min-h-full flex flex-col bg-[#090b10] text-[#e2e8f0]">{children}</body>
    </html>
  );
}
