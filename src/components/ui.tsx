/** Small design-system primitives reused across the app. */
import Link from "next/link";
import { cn } from "@/lib/format";

export function Button({
  children,
  as = "button",
  variant = "primary",
  size = "md",
  href,
  type,
  className,
  ...rest
}: {
  children: React.ReactNode;
  as?: "button" | "link";
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  href?: string;
  type?: "button" | "submit" | "reset";
  className?: string;
} & React.HTMLAttributes<HTMLButtonElement | HTMLAnchorElement>) {
  const base =
    "inline-flex items-center justify-center font-semibold rounded-full transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed";
  const sizes = {
    sm: "text-xs px-3 py-1.5",
    md: "text-sm px-5 py-2.5",
    lg: "text-base px-7 py-3.5",
  }[size];
  const variants = {
    primary:
      "bg-gradient-to-br from-ember-400 to-rose-500 text-ink-950 hover:brightness-110 shadow-lg shadow-ember-500/20",
    secondary:
      "bg-ink-800 text-ink-50 hover:bg-ink-700 border border-ink-700",
    ghost: "text-ink-200 hover:text-white hover:bg-ink-800/60",
    danger: "bg-rose-500 text-white hover:bg-rose-600",
  }[variant];
  const classes = cn(base, sizes, variants, className);

  if (as === "link" && href) {
    return (
      <Link href={href} className={classes} {...(rest as any)}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type ?? "button"} className={classes} {...(rest as any)}>
      {children}
    </button>
  );
}

export function Card({
  children,
  className,
  shimmer,
}: {
  children: React.ReactNode;
  className?: string;
  shimmer?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-ink-800 bg-ink-900/60 backdrop-blur-sm p-6",
        shimmer && "shimmer-border",
        className
      )}
    >
      {children}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-2xl bg-ink-900/60 border border-ink-800 p-5">
      <div className="text-xs uppercase tracking-wider text-ink-400">{label}</div>
      <div className="mt-2 text-2xl md:text-3xl font-display italic">{value}</div>
      {hint && <div className="mt-1 text-xs text-ink-400">{hint}</div>}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warn" | "danger" | "accent";
  className?: string;
}) {
  const tones = {
    neutral: "bg-ink-800 text-ink-200 border-ink-700",
    success: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    warn: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    danger: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    accent: "bg-ember-500/15 text-ember-300 border-ember-500/30",
  }[tone];
  return (
    <span className={cn("inline-flex items-center text-xs px-2.5 py-1 rounded-full border", tones, className)}>
      {children}
    </span>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-sm font-medium text-ink-100">{label}</span>
        {hint && <span className="text-[11px] text-ink-400">{hint}</span>}
      </div>
      {children}
      {error && <p className="text-xs text-rose-400 mt-1.5">{error}</p>}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full px-3.5 py-2.5 rounded-xl bg-ink-950 border border-ink-700 focus:border-ember-400 focus:outline-none text-ink-50 placeholder:text-ink-500 transition-colors",
        props.className
      )}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) {
  return (
    <select
      {...props}
      className={cn(
        "w-full px-3.5 py-2.5 rounded-xl bg-ink-950 border border-ink-700 focus:border-ember-400 focus:outline-none text-ink-50",
        props.className
      )}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "w-full px-3.5 py-2.5 rounded-xl bg-ink-950 border border-ink-700 focus:border-ember-400 focus:outline-none text-ink-50 placeholder:text-ink-500",
        props.className
      )}
    />
  );
}

export function Ball({ value, size = "md" }: { value: number | string; size?: "sm" | "md" | "lg" }) {
  const dim = { sm: "h-8 w-8 text-sm", md: "h-11 w-11 text-base", lg: "h-14 w-14 text-lg" }[size];
  return <span className={cn("draw-ball", dim)}>{value}</span>;
}

export function EmptyState({
  title,
  description,
  cta,
}: {
  title: string;
  description: string;
  cta?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-ink-700 bg-ink-900/40 p-10 text-center">
      <h3 className="font-display italic text-xl mb-1">{title}</h3>
      <p className="text-sm text-ink-300 max-w-md mx-auto">{description}</p>
      {cta && <div className="mt-5">{cta}</div>}
    </div>
  );
}
