import { InputHTMLAttributes, forwardRef } from "react";

interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, id, className = "", ...props }, ref) => {
    return (
      <label
        htmlFor={id}
        className="flex items-center gap-2.5 cursor-pointer select-none py-1"
      >
        <input
          ref={ref}
          id={id}
          type="checkbox"
          className={[
            "h-5 w-5 shrink-0 rounded-[5px] border border-hairline",
            "accent-primary cursor-pointer",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-focus",
            className,
          ].join(" ")}
          {...props}
        />
        <span className="text-[14px] text-ink">{label}</span>
      </label>
    );
  }
);
Checkbox.displayName = "Checkbox";
