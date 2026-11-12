import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "burgundy" | "forest" | "void" | "subtle";
  hoverEffect?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "burgundy", hoverEffect = false, children, ...props }, ref) => {
    const variantStyles = {
      burgundy:
        "bg-[#130D12] border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.4)]",
      forest:
        "bg-[#0C1310] border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.4)]",
      void: "bg-[#08090B] border border-white/[0.06]",
      subtle: "bg-white/[0.02] border border-white/[0.06]",
    };

    const hoverStyles = hoverEffect
      ? "hover:border-white/20 hover:shadow-[0_8px_32px_rgba(0,0,0,0.6)] hover:-translate-y-0.5 transition-all duration-300"
      : "";

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-xl p-5 text-[#EDE6D6]",
          variantStyles[variant],
          hoverStyles,
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";
