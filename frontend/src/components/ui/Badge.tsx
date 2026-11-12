import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "red" | "amber" | "emerald" | "blue" | "violet" | "brass" | "subtle";
  size?: "sm" | "md";
}

export function Badge({
  className,
  variant = "subtle",
  size = "md",
  children,
  ...props
}: BadgeProps) {
  const baseStyles =
    "inline-flex items-center font-medium rounded-full transition-colors select-none";

  const sizeStyles = {
    sm: "text-[11px] px-2 py-0.5 gap-1",
    md: "text-xs px-2.5 py-1 gap-1.5",
  };

  const variantStyles = {
    red: "bg-[#9B2242]/15 text-[#F87171] border border-[#9B2242]/30",
    amber: "bg-[#C5A059]/15 text-[#FBBF24] border border-[#C5A059]/30",
    emerald: "bg-[#1B8A5A]/15 text-[#34D399] border border-[#1B8A5A]/30",
    blue: "bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30",
    violet: "bg-[#8B5CF6]/15 text-[#C4B5FD] border border-[#8B5CF6]/30",
    brass: "bg-[#C5A059]/15 text-[#E5C384] border border-[#C5A059]/30",
    subtle: "bg-white/[0.04] text-[#B5ACA0] border border-white/[0.08]",
  };

  return (
    <span className={cn(baseStyles, sizeStyles[size], variantStyles[variant], className)} {...props}>
      {children}
    </span>
  );
}
