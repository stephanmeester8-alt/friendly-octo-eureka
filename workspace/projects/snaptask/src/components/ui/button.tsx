import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-[var(--snap)] text-[var(--ink)] hover:bg-[var(--snap-hot)] shadow-[0_1px_0_rgba(10,46,42,0.12)]",
  secondary:
    "bg-[var(--ink)] text-[var(--paper)] hover:bg-[var(--ink-soft)]",
  ghost:
    "bg-transparent text-[var(--ink)] hover:bg-[var(--ink)]/5 border border-[var(--ink)]/15",
  danger: "bg-[var(--coral)] text-white hover:opacity-90",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-7 text-base",
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold tracking-tight transition-all duration-200 disabled:pointer-events-none disabled:opacity-45 active:scale-[0.98]",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
