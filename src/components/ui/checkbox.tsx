import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

/*
 * `accent-color` paints the box and the tick from a single value, but the
 * brand wants a navy box with a yellow tick — so the control is drawn
 * here instead: appearance-none for the box, an inlined SVG tick as the
 * checked background. Keeping it a real <input type="checkbox"> preserves
 * keyboard, label and form behaviour.
 */
const BOX = cn(
  "size-4 shrink-0 cursor-pointer appearance-none rounded-[4px] border border-hairline-strong bg-canvas",
  "transition-colors checked:border-brand-navy checked:bg-brand-navy",
  "checked:bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2016%2016%22%3E%3Cpath%20fill%3D%22none%22%20stroke%3D%22%23F6B300%22%20stroke-width%3D%222.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M3.5%208.5l3%203%206-6%22%2F%3E%3C%2Fsvg%3E')] checked:bg-[length:100%_100%] checked:bg-center checked:bg-no-repeat",
  "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-yellow/40"
);

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
        className={cn(BOX, className)}
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
        "border-hairline-strong bg-canvas hover:bg-brand-navy-soft",
        "has-checked:border-brand-navy has-checked:bg-brand-navy-soft",
        className
      )}
    >
      <input
        ref={ref}
        id={id}
        type="checkbox"
        className={cn(BOX, "mt-0.5")}
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
