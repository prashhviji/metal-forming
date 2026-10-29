'use client';

import { Activity, Droplets, Thermometer, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Pill, type Tone } from '@/components/ui/kit';
import type { AlertSeverity, AlertStatus, AlertType } from '@/types/monitor';

export const ALERT_ICONS: Record<AlertType, LucideIcon> = {
  temperature: Thermometer,
  vibration: Activity,
  current: Zap,
  lubrication: Droplets,
};

export const ALERT_TYPE_LABEL: Record<AlertType, string> = {
  temperature: 'Temperature',
  vibration: 'Vibration',
  current: 'Current',
  lubrication: 'Lubrication',
};

const SEVERITY_TONE: Record<AlertSeverity, Tone> = {
  Critical: 'danger',
  High: 'warn',
  Medium: 'info',
  Info: 'neutral',
};

const STATUS: Record<AlertStatus, { tone: Tone; label: string }> = {
  active: { tone: 'danger', label: 'Active' },
  acknowledged: { tone: 'warn', label: 'Acknowledged' },
  resolved: { tone: 'ok', label: 'Resolved' },
};

export function SeverityPill({ severity }: { severity: AlertSeverity }) {
  return <Pill tone={SEVERITY_TONE[severity]}>{severity}</Pill>;
}

export function StatusPill({ status, type }: { status: AlertStatus; type?: AlertType }) {
  // A running spray is an event in progress, not a fault.
  if (type === 'lubrication' && status === 'active') {
    return (
      <Pill tone="info" dot pulse>
        In progress
      </Pill>
    );
  }
  const s = STATUS[status];
  return (
    <Pill tone={s.tone} dot pulse={status === 'active'}>
      {s.label}
    </Pill>
  );
}

export function AlertTypeIcon({ type, className }: { type: AlertType; className?: string }) {
  const Icon = ALERT_ICONS[type];
  return <Icon className={className ?? 'h-4 w-4'} aria-hidden />;
}
