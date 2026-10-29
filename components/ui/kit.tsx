'use client';

import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/* Tones                                                               */
/* ------------------------------------------------------------------ */

export type Tone = 'ok' | 'warn' | 'danger' | 'info' | 'neutral' | 'accent';

export const TONE: Record<Tone, { text: string; bg: string; border: string; dot: string; solid: string }> = {
  ok: { text: 'text-emerald-300', bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', dot: 'bg-emerald-400', solid: '#34d399' },
  warn: { text: 'text-amber-300', bg: 'bg-amber-500/10', border: 'border-amber-500/25', dot: 'bg-amber-400', solid: '#fbbf24' },
  danger: { text: 'text-red-300', bg: 'bg-red-500/10', border: 'border-red-500/25', dot: 'bg-red-400', solid: '#f87171' },
  info: { text: 'text-sky-300', bg: 'bg-sky-500/10', border: 'border-sky-500/25', dot: 'bg-sky-400', solid: '#38bdf8' },
  accent: { text: 'text-violet-300', bg: 'bg-violet-500/10', border: 'border-violet-500/25', dot: 'bg-violet-400', solid: '#a78bfa' },
  neutral: { text: 'text-white/70', bg: 'bg-white/[0.05]', border: 'border-white/10', dot: 'bg-white/40', solid: '#94a3b8' },
};

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

export function Page({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('mx-auto w-full max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8', className)}>{children}</div>;
}

export function PageHeader({
  icon: Icon,
  title,
  description,
  actions,
  tone = 'info',
}: {
  icon: LucideIcon;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  tone?: Tone;
}) {
  const t = TONE[tone];
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className={cn('mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border', t.bg, t.border)}>
          <Icon className={cn('h-5 w-5', t.text)} aria-hidden />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">{title}</h1>
          {description && <p className="mt-1 text-sm text-white/60">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({
  children,
  className,
  tone,
}: {
  children: React.ReactNode;
  className?: string;
  tone?: Tone;
}) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-2xl border bg-white/[0.025]',
        tone ? TONE[tone].border : 'border-white/[0.08]',
        className
      )}
    >
      {children}
    </section>
  );
}

export function PanelHeader({
  title,
  description,
  icon: Icon,
  actions,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-3.5', className)}>
      <div className="flex min-w-0 items-center gap-2.5">
        {Icon && <Icon className="h-4 w-4 shrink-0 text-white/50" aria-hidden />}
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-white/55">{description}</p>}
        </div>
      </div>
      {actions}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Small elements                                                      */
/* ------------------------------------------------------------------ */

export function Pill({
  tone = 'neutral',
  children,
  dot,
  pulse,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  dot?: boolean;
  pulse?: boolean;
  className?: string;
}) {
  const t = TONE[tone];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium',
        t.bg,
        t.border,
        t.text,
        className
      )}
    >
      {dot && (
        <span className="relative flex h-1.5 w-1.5">
          {pulse && <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-60', t.dot)} />}
          <span className={cn('relative inline-flex h-1.5 w-1.5 rounded-full', t.dot)} />
        </span>
      )}
      {children}
    </span>
  );
}

const BUTTON_VARIANTS = {
  primary: 'bg-emerald-500 text-emerald-950 hover:bg-emerald-400 disabled:hover:bg-emerald-500',
  secondary: 'border border-white/12 bg-white/[0.06] text-white hover:bg-white/[0.1] disabled:hover:bg-white/[0.06]',
  ghost: 'text-white/70 hover:bg-white/[0.06] hover:text-white disabled:hover:bg-transparent',
  danger: 'border border-red-500/30 bg-red-500/10 text-red-200 hover:bg-red-500/20 disabled:hover:bg-red-500/10',
} as const;

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof BUTTON_VARIANTS;
  size?: 'sm' | 'md';
  loading?: boolean;
  icon?: LucideIcon;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', loading, icon: Icon, className, children, disabled, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'h-8 px-3 text-xs' : 'h-9 px-4 text-sm',
        BUTTON_VARIANTS[variant],
        className
      )}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : Icon ? <Icon className="h-4 w-4" aria-hidden /> : null}
      {children}
    </button>
  );
});

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  size = 'md',
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label: string;
  size?: 'sm' | 'md';
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg border border-white/10 bg-white/[0.03] p-0.5">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'rounded-md font-medium transition-colors',
              size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-xs',
              active ? 'bg-white/[0.12] text-white shadow-sm' : 'text-white/60 hover:text-white'
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'border-emerald-400/50 bg-emerald-500/80' : 'border-white/15 bg-white/10'
      )}
    >
      <span
        className={cn(
          'inline-block h-[18px] w-[18px] rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-[22px]' : 'translate-x-[3px]'
        )}
      />
    </button>
  );
}

export function NumberField({
  label,
  unit,
  value,
  onChange,
  step = 1,
  min,
  max,
  hint,
  id,
}: {
  label: string;
  unit?: string;
  value: string;
  onChange: (v: string) => void;
  step?: number;
  min?: number;
  max?: number;
  hint?: string;
  id: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-white/70">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          value={value}
          step={step}
          min={min}
          max={max}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-full rounded-lg border border-white/12 bg-white/[0.04] px-3 pr-12 font-mono text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-emerald-400/60 focus:bg-white/[0.06]"
        />
        {unit && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/50">{unit}</span>}
      </div>
      {hint && <p className="mt-1 text-[11px] text-white/50">{hint}</p>}
    </div>
  );
}

export function TextField({
  label,
  value,
  onChange,
  id,
  maxLength = 60,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  id: string;
  maxLength?: number;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-white/70">
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-lg border border-white/12 bg-white/[0.04] px-3 text-sm text-white outline-none transition-colors focus:border-emerald-400/60 focus:bg-white/[0.06]"
      />
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
        <Icon className="h-5 w-5 text-white/50" aria-hidden />
      </div>
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-xs text-white/55">{description}</p>}
    </div>
  );
}

export function PageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex h-[60vh] items-center justify-center" role="status">
      <div className="text-center">
        <Loader2 className="mx-auto h-7 w-7 animate-spin text-white/40" aria-hidden />
        <p className="mt-3 text-sm text-white/55">{label}</p>
      </div>
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
      {message}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-white/[0.05]', className)} />;
}

export function StatTile({
  label,
  value,
  sub,
  tone = 'neutral',
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: Tone;
  icon?: LucideIcon;
}) {
  const t = TONE[tone];
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-white/60">{label}</span>
        {Icon && <Icon className={cn('h-4 w-4', tone === 'neutral' ? 'text-white/40' : t.text)} aria-hidden />}
      </div>
      <div className={cn('text-2xl font-semibold tabular-nums tracking-tight', tone === 'neutral' ? 'text-white' : t.text)}>{value}</div>
      {sub && <div className="mt-1 text-xs text-white/55">{sub}</div>}
    </div>
  );
}
