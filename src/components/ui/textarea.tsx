import { TextareaHTMLAttributes, forwardRef } from "react";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className = "", ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={[
        "w-full rounded-lg border border-hairline bg-canvas px-4 py-2.5",
        "text-[17px] text-ink placeholder:text-ink-muted-48",
        "focus:outline focus:outline-2 focus:outline-primary-focus focus:border-primary-focus",
        "resize-y min-h-32",
        className,
      ].join(" ")}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";
