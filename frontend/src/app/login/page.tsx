import { Suspense } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";
import { Feather } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Sign In — NERRA Story Intelligence",
  description: "Sign in to access your manuscript workspace, epistemic knowledge tracking, and timeline verification.",
};

export default function LoginPage() {
  return (
    <main className="min-h-screen w-full flex flex-col justify-between p-6 sm:p-10 relative overflow-hidden bg-surface-void">
      {/* Background Ambience Vignette */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(122,29,57,0.22),transparent)]"
        aria-hidden="true"
      />

      {/* Top Header Bar */}
      <header className="relative z-10 w-full max-w-6xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group select-none">
          <div className="w-8 h-8 rounded-xl bg-wine-accent/20 border border-wine-accent/40 flex items-center justify-center text-wine-crimson shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)] group-hover:bg-wine-accent/30 transition-colors">
            <Feather className="w-4 h-4" />
          </div>
          <div>
            <span className="font-serif text-lg font-medium tracking-tight text-ink-parchment">
              NERRA
            </span>
            <span className="hidden sm:inline-block text-[10px] uppercase tracking-widest text-ink-ash ml-2.5 pl-2.5 border-l border-border-quiet">
              Story Operating System
            </span>
          </div>
        </Link>

        <ThemeSwitcher />
      </header>

      {/* Center Auth Card */}
      <div className="relative z-10 flex-1 flex items-center justify-center py-12">
        <Suspense fallback={<div className="text-ink-ash text-xs animate-pulse">Loading atelier...</div>}>
          <AuthCard initialMode="login" />
        </Suspense>
      </div>

      {/* Bottom Footer Quote */}
      <footer className="relative z-10 text-center py-4 select-none">
        <p className="font-serif italic text-xs text-ink-ash max-w-md mx-auto">
          &ldquo;Every truth asserted in chapter one must endure until the final page.&rdquo;
        </p>
      </footer>
    </main>
  );
}
