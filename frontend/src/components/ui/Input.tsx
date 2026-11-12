import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, type = "text", ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={id} className="block text-xs font-medium text-[#B5ACA0]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          type={type}
          className={cn(
            "w-full rounded-lg bg-[#0A0B0E] border border-white/10 px-3.5 py-2 text-sm text-[#EDE6D6] placeholder:text-[#7D756C] transition-all duration-200 outline-none focus:border-[#C5A059]/60 focus:ring-2 focus:ring-[#C5A059]/15 disabled:opacity-50",
            error && "border-[#9B2242] focus:border-[#9B2242] focus:ring-[#9B2242]/20",
            className
          )}
          {...props}
        />
        {error && <p className="text-[11px] text-[#F87171]">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
