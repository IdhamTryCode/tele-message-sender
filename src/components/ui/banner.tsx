import { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "success" | "danger" | "info";

const VARIANT_CLASSES: Record<Variant, string> = {
  success: "bg-brand-navy text-white",
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
        "flex items-start gap-2.5 rounded-lg px-4 py-3 text-[14px]",
        VARIANT_CLASSES[variant],
        className
      )}
    >
      {variant === "success" && (
        <span
          aria-hidden
          className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-brand-yellow"
        >
          <Check className="size-3 text-brand-navy" strokeWidth={3} />
        </span>
      )}
      <span className="min-w-0">{children}</span>
    </div>
  );
}
