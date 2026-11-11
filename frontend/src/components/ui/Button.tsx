import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "wine" | "forest" | "brass" | "ghost" | "outline" | "subtle";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "wine",
      size = "md",
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 select-none disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]";

    const sizeStyles = {
      sm: "text-xs px-3 py-1.5 gap-1.5",
      md: "text-sm px-4 py-2 gap-2",
      lg: "text-base px-5 py-2.5 gap-2.5",
      icon: "p-2 w-9 h-9",
    };

    const variantStyles = {
      wine: "bg-[#9B2242] hover:bg-[#B52B50] text-[#EDE6D6] shadow-[0_0_15px_rgba(155,34,66,0.3)] border border-[#C43D65]/40",
      forest: "bg-[#1B8A5A] hover:bg-[#23A56D] text-[#EDE6D6] shadow-[0_0_15px_rgba(27,138,90,0.3)] border border-[#2DD4BF]/30",
      brass: "bg-[#C5A059] hover:bg-[#D9B46E] text-[#08090B] font-semibold shadow-[0_0_15px_rgba(197,160,89,0.3)] border border-[#E5C384]/50",
      outline: "border border-white/10 hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.05] text-[#EDE6D6]",
      ghost: "text-[#B5ACA0] hover:text-[#EDE6D6] hover:bg-white/[0.05]",
      subtle: "bg-[#181217] hover:bg-[#221820] text-[#EDE6D6] border border-white/[0.07]",
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, sizeStyles[size], variantStyles[variant], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
