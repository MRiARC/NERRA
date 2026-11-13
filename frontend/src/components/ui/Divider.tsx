import React from "react";
import { cn } from "@/lib/utils";

export interface DividerProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  orientation?: "horizontal" | "vertical";
}

export function Divider({
  label,
  orientation = "horizontal",
  className,
  ...props
}: DividerProps) {
  if (orientation === "vertical") {
    return (
      <div
        className={cn("w-px h-full bg-border-quiet self-stretch shrink-0", className)}
        role="separator"
        {...props}
      />
    );
  }

  if (label) {
    return (
      <div
        className={cn("flex items-center gap-3 w-full my-4 select-none", className)}
        role="separator"
        {...props}
      >
        <div className="flex-1 h-px bg-border-quiet" />
        <span className="text-[10px] tracking-wider uppercase font-semibold text-ink-ash">
          {label}
        </span>
        <div className="flex-1 h-px bg-border-quiet" />
      </div>
    );
  }

  return (
    <hr
      className={cn("w-full border-0 h-px bg-border-quiet my-3 shrink-0", className)}
      {...props}
    />
  );
}
