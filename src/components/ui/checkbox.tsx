import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, id, className, ...props }, ref) => (
    <label
      htmlFor={id}
      className="flex cursor-pointer select-none items-center gap-2.5 py-1"
    >
      <input
        ref={ref}
        id={id}
        type="checkbox"
        className={cn(
          "size-4 shrink-0 cursor-pointer rounded border-hairline-strong accent-primary",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-focus",
          className
        )}
        {...props}
      />
      <span className="text-[14px] text-ink">{label}</span>
    </label>
  )
);
Checkbox.displayName = "Checkbox";

interface TargetCardProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  sublabel: string;
}

/**
 * Target picker tile — a checkbox styled as a selectable card, since
 * choosing the wrong target is the costliest mistake in this form (a
 * Telegram message can't be recalled). Bigger hit area and a visible
 * selected state make the choice harder to get wrong than a bare
 * checkbox row.
 */
export const TargetCard = forwardRef<HTMLInputElement, TargetCardProps>(
  ({ label, sublabel, id, className, ...props }, ref) => (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer select-none items-start gap-2.5 rounded-lg border p-3 transition-colors",
        "border-hairline-strong bg-canvas hover:bg-canvas-parchment",
        "has-checked:border-primary has-checked:bg-primary/[0.04]",
        className
      )}
    >
      <input
        ref={ref}
        id={id}
        type="checkbox"
        className="mt-0.5 size-4 shrink-0 cursor-pointer rounded border-hairline-strong accent-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-focus"
        {...props}
      />
      <span className="min-w-0">
        <span className="block truncate text-[14px] font-medium text-ink">
          {label}
        </span>
        <span className="block truncate text-[12px] text-ink-muted-48">
          {sublabel}
        </span>
      </span>
    </label>
  )
);
TargetCard.displayName = "TargetCard";
