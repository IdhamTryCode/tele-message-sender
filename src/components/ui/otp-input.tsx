"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  autoFocus?: boolean;
  disabled?: boolean;
  /** Fires when the final box is filled, so the form can submit itself. */
  onComplete?: (value: string) => void;
}

/**
 * Six separate boxes rather than one field — this is the control people
 * already know from every other authenticator flow, and it makes a
 * mistyped digit obvious at a glance. The whole group behaves as one
 * input: typing advances, backspace retreats, and pasting a full code
 * fills every box at once.
 */
export function OtpInput({
  value,
  onChange,
  length = 6,
  autoFocus,
  disabled,
  onComplete,
}: Props) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  function focusAt(index: number) {
    refs.current[Math.max(0, Math.min(length - 1, index))]?.focus();
  }

  function setValue(next: string) {
    onChange(next);
    if (next.length === length) onComplete?.(next);
  }

  function handleChange(index: number, raw: string) {
    const digits = raw.replace(/\D/g, "");
    if (!digits) return;

    // Writing several digits at once (a keyboard autofill or a paste that
    // lands on a single box) spreads them across the boxes from here on.
    const chars = value.padEnd(length, " ").split("");
    for (let i = 0; i < digits.length && index + i < length; i++) {
      chars[index + i] = digits[i];
    }
    setValue(chars.join("").trimEnd());
    focusAt(index + digits.length);
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace") {
      e.preventDefault();
      const chars = value.padEnd(length, " ").split("");
      // Clear this box if it has a digit, otherwise step back and clear
      // that one — matches how these inputs behave elsewhere.
      const target = chars[index]?.trim() ? index : index - 1;
      if (target < 0) return;
      chars[target] = " ";
      onChange(chars.join("").trimEnd());
      focusAt(target);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focusAt(index - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      focusAt(index + 1);
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const digits = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!digits) return;
    e.preventDefault();
    setValue(digits.slice(0, length));
    focusAt(Math.min(digits.length, length - 1));
  }

  return (
    <div className="flex gap-2">
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          // A single logical field split across boxes: only the first one
          // carries the autocomplete hint, so the browser/OS offers the
          // SMS or authenticator code once rather than six times.
          autoComplete={i === 0 ? "one-time-code" : "off"}
          aria-label={`Digit ${i + 1}`}
          inputMode="numeric"
          maxLength={length}
          disabled={disabled}
          autoFocus={autoFocus && i === 0}
          value={value[i] ?? ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          className={cn(
            "h-12 w-full min-w-0 rounded-lg border border-hairline-strong bg-canvas text-center",
            "tabular text-[18px] font-medium text-ink",
            "transition-colors focus:border-primary-focus focus:outline focus:outline-2 focus:outline-offset-[-1px] focus:outline-primary-focus",
            "disabled:cursor-not-allowed disabled:opacity-60"
          )}
        />
      ))}
    </div>
  );
}
