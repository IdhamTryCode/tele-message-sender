import { TextareaHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "min-h-28 w-full rounded-lg border border-hairline-strong bg-canvas px-3 py-2.5",
      "text-[14px] leading-relaxed text-ink placeholder:text-ink-faint",
      "transition-colors focus:border-primary-focus focus:outline focus:outline-2 focus:outline-offset-[-1px] focus:outline-primary-focus",
      "disabled:cursor-not-allowed disabled:opacity-60",
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
