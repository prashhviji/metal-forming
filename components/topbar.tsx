'use client';

import { Menu, MapPin } from 'lucide-react';
import { useLive } from '@/components/live-provider';
import { Pill } from '@/components/ui/kit';
import { fmtAgo } from '@/lib/format';

export function TopBar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { status, error } = useLive();

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-white/[0.07] bg-[#060a14]/85 px-4 backdrop-blur-md sm:px-6">
      <button
        onClick={onOpenMenu}
        className="rounded-lg p-2 text-white/70 hover:bg-white/[0.06] hover:text-white lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="min-w-0 flex-1">
        {status ? (
          <p className="truncate text-sm text-white/85">
            <span className="font-medium text-white">{status.machine.name}</span>
            <span className="mx-2 hidden text-white/30 sm:inline">·</span>
            <span className="hidden items-center gap-1 text-white/55 sm:inline-flex">
              <MapPin className="h-3 w-3" aria-hidden />
              {status.machine.location}
            </span>
          </p>
        ) : (
          <p className="text-sm text-white/50">Connecting…</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {error && !status ? (
          <Pill tone="danger" dot>
            Server unreachable
          </Pill>
        ) : status ? (
          <>
            <Pill tone={status.source === 'hardware' ? 'ok' : 'warn'}>
              {status.source === 'hardware' ? 'Hardware' : 'Simulated'}
              <span className="hidden sm:inline"> data</span>
            </Pill>
            {status.link === 'live' && (
              <Pill tone="ok" dot pulse>
                Live
              </Pill>
            )}
            {status.link === 'stale' && (
              <Pill tone="danger" dot>
                No data · {fmtAgo(status.ageMs)}
              </Pill>
            )}
            {status.link === 'paused' && (
              <Pill tone="warn" dot>
                Paused
              </Pill>
            )}
            {status.link === 'empty' && (
              <Pill tone="neutral" dot>
                Waiting for data
              </Pill>
            )}
          </>
        ) : null}
      </div>
    </header>
  );
}
