import { InputHTMLAttributes, forwardRef } from "react";

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(({ className = "", ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={[
        "w-full rounded-lg border border-hairline bg-canvas px-4 py-2.5",
        "text-[17px] text-ink placeholder:text-ink-muted-48",
        "focus:outline focus:outline-2 focus:outline-primary-focus focus:border-primary-focus",
        className,
      ].join(" ")}
      {...props}
    />
  );
});
Input.displayName = "Input";
