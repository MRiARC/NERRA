import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Surface, type SurfaceDepth, type SurfaceBorder } from "./Surface";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  depth?: SurfaceDepth;
  border?: SurfaceBorder;
  hoverEffect?: boolean;
  /** Legacy variant prop for backward compatibility */
  variant?: "burgundy" | "forest" | "void" | "subtle" | string;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      depth = 2,
      border = "subtle",
      hoverEffect = false,
      variant,
      children,
      ...props
    },
    ref
  ) => {
    // Map legacy variants
    let resolvedDepth = depth;
    let resolvedBorder = border;

    if (variant === "void") {
      resolvedDepth = 0;
      resolvedBorder = "quiet";
    } else if (variant === "subtle") {
      resolvedDepth = 1;
      resolvedBorder = "quiet";
    } else if (variant === "burgundy") {
      resolvedDepth = 2;
      resolvedBorder = "subtle";
    } else if (variant === "forest") {
      resolvedDepth = 2;
      resolvedBorder = "thread";
    }

    return (
      <Surface
        ref={ref}
        depth={resolvedDepth}
        border={resolvedBorder}
        interactive={hoverEffect}
        rounded="sm"
        className={cn("p-5 text-ink-parchment", className)}
        {...props}
      >
        {children}
      </Surface>
    );
  }
);

Card.displayName = "Card";
