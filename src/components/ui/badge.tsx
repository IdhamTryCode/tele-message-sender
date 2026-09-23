import { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-[12px] font-medium whitespace-nowrap",
  {
    variants: {
      variant: {
        neutral: "bg-canvas-parchment text-ink-muted-80",
        outline: "border border-hairline-strong bg-canvas text-ink-muted-80",
        success: "bg-success-soft text-success",
        danger: "bg-danger-soft text-danger",
        warning: "bg-warning-soft text-warning",
      },
    },
    defaultVariants: { variant: "neutral" },
  }
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  /** Renders a small filled circle before the label, for status pills. */
  dot?: boolean;
}

export function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
