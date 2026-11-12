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
export type SurfaceRounded = "none" | "sm" | "md" | "lg" | "xl" | "full";

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
      rounded = "md",
      as: Component = "div",
      className,
      children,
      ...props
    },
    ref
  ) => {
    // Top specular rim light for depth 2 and 3
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
      contradiction: "border border-severity-contradiction/30",
      knowledge: "border border-severity-knowledge/30",
      thread: "border border-severity-thread/30",
      warning: "border border-severity-warning/30",
    };

    const roundedClasses: Record<SurfaceRounded, string> = {
      none: "rounded-none",
      sm: "rounded-lg",         // 8px
      md: "rounded-xl",         // 12px (Antigravity standard card)
      lg: "rounded-2xl",        // 16px (Prominent containers / modals)
      xl: "rounded-[20px]",     // 20px (Floating prompt docks)
      full: "rounded-full",     // Pills & tokens
    };

    const glowClasses: Record<SurfaceGlow, string> = {
      none: "",
      wine: "shadow-[0_0_24px_-4px_rgba(140,34,66,0.35)]",
      pine: "shadow-[0_0_24px_-4px_rgba(23,61,47,0.35)]",
      contradiction: "shadow-[0_0_24px_-4px_rgba(244,63,94,0.25)]",
    };

    // The physical 1px top-edge specular rim light
    const highlightClass = shouldHighlight
      ? "shadow-[inset_0_1px_0_0_var(--edge-highlight),0_8px_32px_-4px_rgba(0,0,0,0.45)]"
      : "";

    const interactiveClasses = interactive
      ? "cursor-pointer transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-border-prominent hover:shadow-[0_12px_36px_-4px_rgba(0,0,0,0.55),inset_0_1px_0_0_var(--edge-highlight-prominent)] active:translate-y-0 active:scale-[0.995]"
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
