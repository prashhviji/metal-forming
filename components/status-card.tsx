'use client';

import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatusCardProps {
  title: string;
  value: string;
  unit: string;
  status: 'normal' | 'warning' | 'critical';
  icon: LucideIcon;
  threshold?: string;
  trend?: 'up' | 'down' | 'stable';
}

const statusConfig = {
  normal: {
    badge: 'Normal',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-400',
    glow: 'shadow-emerald-500/10',
    ring: 'ring-emerald-500/20',
    dotColor: 'bg-emerald-400',
    borderColor: 'border-emerald-500/10',
  },
  warning: {
    badge: 'Warning',
    badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-400',
    glow: 'shadow-amber-500/10',
    ring: 'ring-amber-500/20',
    dotColor: 'bg-amber-400',
    borderColor: 'border-amber-500/10',
  },
  critical: {
    badge: 'Critical',
    badgeColor: 'bg-red-500/10 text-red-400 border-red-500/20',
    iconBg: 'bg-red-500/10',
    iconColor: 'text-red-400',
    glow: 'shadow-red-500/10',
    ring: 'ring-red-500/20',
    dotColor: 'bg-red-400',
    borderColor: 'border-red-500/10',
  },
};

export function StatusCard({
  title,
  value,
  unit,
  status,
  icon: Icon,
  threshold,
}: StatusCardProps) {
  const config = statusConfig[status];

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl border bg-white/[0.02] p-5 backdrop-blur-sm transition-all duration-300 hover:bg-white/[0.04] hover:shadow-lg',
        config.borderColor,
        config.glow
      )}
    >
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-medium uppercase tracking-wider text-white/40">
            {title}
          </span>
          <div
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110',
              config.iconBg
            )}
          >
            <Icon className={cn('h-4 w-4', config.iconColor)} />
          </div>
        </div>

        {/* Value */}
        <div className="flex items-baseline gap-1.5 mb-3">
          <span className="text-3xl font-bold tracking-tight text-white animate-count-up">
            {value}
          </span>
          <span className="text-sm font-medium text-white/30">{unit}</span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className={cn('h-1.5 w-1.5 rounded-full', config.dotColor)} />
              {status === 'critical' && (
                <div
                  className={cn(
                    'absolute inset-0 h-1.5 w-1.5 animate-ping rounded-full opacity-60',
                    config.dotColor
                  )}
                />
              )}
            </div>
            <span
              className={cn(
                'text-xs font-semibold rounded-full px-2 py-0.5 border',
                config.badgeColor
              )}
            >
              {config.badge}
            </span>
          </div>
          {threshold && (
            <span className="text-[10px] font-mono text-white/25">
              limit: {threshold}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
