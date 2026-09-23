import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "success" | "danger" | "info";

const VARIANT_CLASSES: Record<Variant, string> = {
  success: "bg-success-soft text-success",
  danger: "bg-danger-soft text-danger",
  info: "bg-warning-soft text-warning",
};

interface BannerProps {
  variant: Variant;
  children: ReactNode;
  className?: string;
}

/**
 * Lightweight inline status message — used instead of a toast library,
 * which isn't worth pulling in as a dependency for a 2-3 page app. Reused
 * for post-submit feedback and anywhere else a transient status is needed.
 */
export function Banner({ variant, children, className }: BannerProps) {
  return (
    <div
      role={variant === "danger" ? "alert" : "status"}
      className={cn(
        "rounded-lg px-4 py-3 text-[14px]",
        VARIANT_CLASSES[variant],
        className
      )}
    >
      {children}
    </div>
  );
}
