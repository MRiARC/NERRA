import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, type = "text", ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={id} className="block text-xs font-medium text-ink-bone tracking-wide">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          type={type}
          className={cn(
            "w-full rounded-xl bg-surface-field border border-border-subtle px-3.5 py-2.5 text-xs text-ink-parchment placeholder:text-ink-faint transition-all duration-150 outline-none focus:border-border-focus focus:ring-1 focus:ring-wine-accent/30 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] disabled:opacity-40",
            error && "border-severity-contradiction focus:border-severity-contradiction focus:ring-severity-contradiction/20",
            className
          )}
          {...props}
        />
        {hint && !error && <p className="text-[11px] text-ink-ash">{hint}</p>}
        {error && <p className="text-[11px] text-severity-contradiction">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
