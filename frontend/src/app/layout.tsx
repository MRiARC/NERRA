import type { Metadata } from "next";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { Toaster } from "sonner";
import "./globals.css";

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
    <html lang="en" className="h-full antialiased dark">
      <body className="min-h-full flex flex-col bg-[#08090B] text-[#EDE6D6]">
        <QueryProvider>
          {children}
          <Toaster
            theme="dark"
            position="bottom-right"
            toastOptions={{
              style: {
                background: "#140E13",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#EDE6D6",
              },
            }}
          />
        </QueryProvider>
      </body>
    </html>
  );
}
