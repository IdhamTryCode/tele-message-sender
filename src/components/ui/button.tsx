import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-primary text-white hover:bg-primary-focus focus-visible:outline-primary-focus",
  secondary:
    "bg-canvas text-primary border border-primary hover:bg-canvas-parchment focus-visible:outline-primary-focus",
  danger:
    "bg-canvas text-danger border border-danger hover:bg-canvas-parchment focus-visible:outline-danger",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", className = "", disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={[
          "inline-flex items-center justify-center rounded-pill px-6 py-2.5",
          "text-[17px] font-normal transition active:scale-95",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
          "disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100",
          VARIANT_CLASSES[variant],
          className,
        ].join(" ")}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
