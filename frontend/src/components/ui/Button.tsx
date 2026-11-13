import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export type ButtonVariant =
  | "primary"
  | "wine"
  | "outline"
  | "secondary"
  | "ghost"
  | "forest"
  | "danger"
  | "subtle"
  // Legacy alias:
  | "brass";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "xs" | "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium rounded-[4px] tracking-wide select-none transition-all duration-150 ease-out disabled:opacity-40 disabled:pointer-events-none active:scale-[0.985]";

    const sizeStyles = {
      xs: "text-[11px] px-2 py-1 gap-1",
      sm: "text-xs px-3 py-1.5 gap-1.5",
      md: "text-xs px-4 py-2 gap-2",
      lg: "text-sm px-5 py-2.5 gap-2.5",
      icon: "p-2 w-8 h-8",
    };

    let normalizedVariant = variant;
    if (variant === "brass") normalizedVariant = "primary";

    const variantStyles: Record<string, string> = {
      primary:
        "bg-wine-accent hover:bg-wine-crimson text-ink-parchment border border-wine-crimson/60 shadow-[0_2px_8px_rgba(122,29,57,0.3)]",
      wine:
        "bg-wine-accent hover:bg-wine-crimson text-ink-parchment border border-wine-crimson/60 shadow-[0_2px_8px_rgba(122,29,57,0.3)]",
      outline:
        "bg-surface-subtle hover:bg-surface-card text-ink-bone hover:text-ink-parchment border border-border-subtle hover:border-border-prominent",
      secondary:
        "bg-surface-subtle hover:bg-surface-card text-ink-bone hover:text-ink-parchment border border-border-subtle hover:border-border-prominent",
      ghost:
        "text-ink-bone hover:text-ink-parchment hover:bg-surface-subtle border border-transparent",
      forest:
        "bg-pine-accent hover:bg-pine-moss text-ink-parchment border border-pine-moss/60 shadow-[0_2px_8px_rgba(23,61,47,0.3)]",
      danger:
        "bg-severity-contradiction-bg text-severity-contradiction hover:bg-severity-contradiction/20 border border-severity-contradiction-border",
      subtle:
        "bg-surface-card hover:bg-surface-elevated text-ink-parchment border border-border-subtle",
    };

    return (
      <button
        ref={ref}
        className={cn(
          baseStyles,
          sizeStyles[size],
          variantStyles[normalizedVariant] || variantStyles.primary,
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Processing...</span>
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
