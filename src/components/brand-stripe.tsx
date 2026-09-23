import { cn } from "@/lib/utils";

/**
 * The three brand colours as one 4px rule, weighted 6:2:1 so navy leads
 * and red/yellow read as accents rather than equal thirds. Flat segments,
 * no gradient — it echoes the logo's flag, and a gradient would muddy
 * the exact brand values.
 */
export function BrandStripe({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("flex h-1 w-full shrink-0 overflow-hidden", className)}
    >
      <span className="flex-[6] bg-brand-navy" />
      <span className="flex-[2] bg-brand-red" />
      <span className="flex-[1] bg-brand-yellow" />
    </div>
  );
}
