'use client';

import { useEffect, useState } from 'react';
import { Droplets } from 'lucide-react';
import { TONE, type Tone } from '@/components/ui/kit';
import { cn } from '@/lib/utils';
import type { MqlConfig, MqlState } from '@/types/monitor';

export const PHASE_META: Record<MqlState['phase'], { label: string; tone: Tone; help: string }> = {
  spraying: { label: 'SPRAYING', tone: 'info', help: 'Valve open — lubricant and air are being delivered' },
  armed: { label: 'ARMED', tone: 'ok', help: 'Waiting for the activation temperature' },
  cooldown: { label: 'COOLDOWN', tone: 'warn', help: 'Pausing before the next automatic cycle' },
  disabled: { label: 'OFF', tone: 'neutral', help: 'Automatic control is switched off' },
};

/** Seconds remaining until `ts`, ticking once a second. */
export function useCountdown(ts: number | null): number | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (ts === null) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [ts]);
  return ts === null ? null : Math.max(0, Math.ceil((ts - now) / 1000));
}

export function MqlBadge({ state, size = 'md' }: { state: MqlState; size?: 'md' | 'lg' }) {
  const meta = PHASE_META[state.phase];
  const tone = TONE[meta.tone];
  const countdown = useCountdown(state.phase === 'spraying' ? state.sprayEndsAt : state.phase === 'cooldown' ? state.cooldownEndsAt : null);

  return (
    <div className="flex items-center gap-4">
      <div
        className={cn(
          'relative flex shrink-0 items-center justify-center rounded-full border',
          tone.bg,
          tone.border,
          size === 'lg' ? 'h-20 w-20' : 'h-12 w-12'
        )}
      >
        {state.phase === 'spraying' && <span className={cn('absolute inset-0 animate-ping rounded-full opacity-30', tone.dot)} />}
        <Droplets className={cn(tone.text, size === 'lg' ? 'h-9 w-9' : 'h-5 w-5')} aria-hidden />
      </div>
      <div>
        <p className={cn('font-semibold tracking-wide', tone.text, size === 'lg' ? 'text-3xl' : 'text-xl')}>{meta.label}</p>
        <p className="text-xs text-white/60">
          {countdown !== null && state.phase !== 'armed' ? `${state.phase === 'spraying' ? 'Ends' : 'Next cycle possible'} in ${countdown}s` : meta.help}
        </p>
      </div>
    </div>
  );
}

export function mqlRuleText(cfg: MqlConfig) {
  return `Sprays for ${cfg.sprayDuration}s when temperature reaches ${cfg.activationTemp} °C`;
}
