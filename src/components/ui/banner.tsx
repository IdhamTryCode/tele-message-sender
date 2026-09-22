import { ReactNode } from "react";

type Variant = "success" | "danger" | "info";

const VARIANT_CLASSES: Record<Variant, string> = {
  success: "bg-success/10 text-success border-success/30",
  danger: "bg-danger/10 text-danger border-danger/30",
  info: "bg-primary/10 text-primary border-primary/30",
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
export function Banner({ variant, children, className = "" }: BannerProps) {
  return (
    <div
      role={variant === "danger" ? "alert" : "status"}
      className={[
        "rounded-lg border px-4 py-3 text-[14px]",
        VARIANT_CLASSES[variant],
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}
