import React from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant =
  | "contradiction"
  | "knowledge"
  | "thread"
  | "warning"
  | "wine"
  | "pine"
  | "subtle"
  // Legacy aliases for backward compatibility:
  | "red"
  | "amber"
  | "emerald"
  | "blue"
  | "brass"
  | "violet";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: "xs" | "sm" | "md";
  dot?: boolean;
  pulse?: boolean;
}

export function Badge({
  className,
  variant = "subtle",
  size = "sm",
  dot = false,
  pulse = false,
  children,
  ...props
}: BadgeProps) {
  const baseStyles =
    "inline-flex items-center font-medium rounded-[4px] tracking-wide uppercase transition-colors select-none";

  const sizeStyles = {
    xs: "text-[9px] px-1.5 py-0.5 gap-1 font-semibold",
    sm: "text-[10px] px-2 py-0.5 gap-1.5 font-medium leading-[14px]", // Stitch standard label-sm
    md: "text-xs px-2.5 py-1 gap-1.5",
  };

  // Normalize legacy variants
  let normalizedVariant = variant;
  if (variant === "red") normalizedVariant = "contradiction";
  if (variant === "amber" || variant === "brass") normalizedVariant = "warning";
  if (variant === "emerald") normalizedVariant = "thread";
  if (variant === "blue") normalizedVariant = "knowledge";
  if (variant === "violet") normalizedVariant = "wine";

  const variantStyles: Record<string, string> = {
    contradiction:
      "bg-severity-contradiction-bg text-severity-contradiction border border-severity-contradiction-border",
    knowledge:
      "bg-severity-knowledge-bg text-severity-knowledge border border-severity-knowledge-border",
    thread:
      "bg-severity-thread-bg text-severity-thread border border-severity-thread-border",
    warning:
      "bg-severity-warning-bg text-severity-warning border border-severity-warning-border",
    wine:
      "bg-wine-accent/15 text-wine-crimson border border-wine-accent/35",
    pine:
      "bg-pine-accent/20 text-pine-moss border border-pine-accent/40",
    subtle:
      "bg-surface-subtle text-ink-bone border border-border-subtle",
  };

  const dotColor: Record<string, string> = {
    contradiction: "bg-severity-contradiction",
    knowledge: "bg-severity-knowledge",
    thread: "bg-severity-thread",
    warning: "bg-severity-warning",
    wine: "bg-wine-crimson",
    pine: "bg-pine-moss",
    subtle: "bg-ink-ash",
  };

  return (
    <span
      className={cn(
        baseStyles,
        sizeStyles[size],
        variantStyles[normalizedVariant] || variantStyles.subtle,
        className
      )}
      {...props}
    >
      {(dot || pulse) && (
        <span className="relative flex h-1.5 w-1.5 shrink-0" aria-hidden="true">
          {pulse && (
            <span
              className={cn(
                "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                dotColor[normalizedVariant] || dotColor.subtle
              )}
            />
          )}
          <span
            className={cn(
              "relative inline-flex rounded-full h-1.5 w-1.5",
              dotColor[normalizedVariant] || dotColor.subtle
            )}
          />
        </span>
      )}
      {children}
    </span>
  );
}
