import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

export type SurfaceDepth = 0 | 1 | 2 | 3;
export type SurfaceBorder =
  | "none"
  | "quiet"
  | "subtle"
  | "prominent"
  | "focus"
  | "contradiction"
  | "knowledge"
  | "thread"
  | "warning";
export type SurfaceGlow = "none" | "wine" | "pine" | "contradiction";
export type SurfaceRounded = "none" | "sm" | "md" | "lg" | "full";

export interface SurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  depth?: SurfaceDepth;
  border?: SurfaceBorder;
  innerHighlight?: boolean;
  interactive?: boolean;
  glow?: SurfaceGlow;
  rounded?: SurfaceRounded;
  as?: React.ElementType;
}

export const Surface = forwardRef<HTMLDivElement, SurfaceProps>(
  (
    {
      depth = 2,
      border = "subtle",
      innerHighlight,
      interactive = false,
      glow = "none",
      rounded = "sm",
      as: Component = "div",
      className,
      children,
      ...props
    },
    ref
  ) => {
    // Default innerHighlight to true for depth 2 and 3
    const shouldHighlight = innerHighlight !== undefined ? innerHighlight : depth >= 2;

    const depthClasses: Record<SurfaceDepth, string> = {
      0: "bg-surface-void",
      1: "bg-surface-subtle",
      2: "bg-surface-card",
      3: "bg-surface-elevated shadow-2xl",
    };

    const borderClasses: Record<SurfaceBorder, string> = {
      none: "border-0",
      quiet: "border border-border-quiet",
      subtle: "border border-border-subtle",
      prominent: "border border-border-prominent",
      focus: "border border-border-focus",
      contradiction: "border border-severity-contradiction/40",
      knowledge: "border border-severity-knowledge/40",
      thread: "border border-severity-thread/40",
      warning: "border border-severity-warning/40",
    };

    const roundedClasses: Record<SurfaceRounded, string> = {
      none: "rounded-none",
      sm: "rounded-[4px]", // Stitch standard ROUND_FOUR
      md: "rounded-[6px]",
      lg: "rounded-[8px]",
      full: "rounded-full",
    };

    const glowClasses: Record<SurfaceGlow, string> = {
      none: "",
      wine: "shadow-[0_0_24px_-4px_rgba(122,29,57,0.4)]",
      pine: "shadow-[0_0_24px_-4px_rgba(23,61,47,0.4)]",
      contradiction: "shadow-[0_0_24px_-4px_rgba(224,49,84,0.35)]",
    };

    const highlightClass = shouldHighlight
      ? "shadow-[inset_0_1px_0_0_var(--edge-highlight)]"
      : "";

    const interactiveClasses = interactive
      ? "cursor-pointer transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-border-prominent hover:shadow-[0_8px_24px_-4px_rgba(0,0,0,0.5),inset_0_1px_0_0_var(--edge-highlight-prominent)] active:translate-y-0 active:scale-[0.995]"
      : "transition-colors duration-200";

    return (
      <Component
        ref={ref}
        className={cn(
          depthClasses[depth],
          borderClasses[border],
          roundedClasses[rounded],
          glowClasses[glow],
          highlightClass,
          interactiveClasses,
          className
        )}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

Surface.displayName = "Surface";

/** Alias Box for convenience */
export const Box = Surface;
