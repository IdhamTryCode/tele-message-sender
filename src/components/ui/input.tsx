import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-10 w-full rounded-lg border border-hairline-strong bg-canvas px-3",
      "text-[14px] text-ink placeholder:text-ink-faint",
      "transition-colors focus:border-brand-navy focus:outline-none focus:ring-4 focus:ring-brand-yellow/30",
      "disabled:cursor-not-allowed disabled:opacity-60",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";
