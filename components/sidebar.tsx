'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BrainCircuit,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Droplets,
  Info,
  LayoutDashboard,
  Settings,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLive } from '@/components/live-provider';

const NAV = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Live Data', href: '/live', icon: Activity },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'ML Models', href: '/models', icon: BrainCircuit },
  { name: 'Alerts', href: '/alerts', icon: AlertTriangle },
  { name: 'Lubrication', href: '/lubrication', icon: Droplets },
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'About', href: '/about', icon: Info },
];

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ collapsed, onToggleCollapsed, mobileOpen, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const { status } = useLive();
  const openAlerts = (status?.alerts.active ?? 0) + (status?.alerts.acknowledged ?? 0);
  const activeAlerts = status?.alerts.active ?? 0;

  // On small screens the sidebar is a drawer and is never "collapsed".
  const compact = collapsed;

  const sourceLabel = status?.source === 'hardware' ? 'Hardware sensors' : 'Simulated data';
  const link = status?.link ?? 'empty';
  const linkTone =
    link === 'live' ? 'bg-emerald-400' : link === 'stale' ? 'bg-red-400' : link === 'paused' ? 'bg-amber-400' : 'bg-white/30';
  const linkText = { live: 'Receiving data', stale: 'No recent data', paused: 'Simulator paused', empty: 'Waiting for data' }[link];

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden" onClick={onCloseMobile} aria-hidden />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex flex-col border-r border-white/[0.07] bg-[#080c18] transition-transform duration-200',
          'lg:static lg:z-auto lg:translate-x-0 lg:transition-[width]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          compact ? 'w-64 lg:w-[72px]' : 'w-64'
        )}
        aria-label="Primary"
      >
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-white/[0.07] px-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-sky-500 shadow-lg shadow-emerald-500/20">
            <Cpu className="h-5 w-5 text-[#04120d]" aria-hidden />
          </div>
          <div className={cn('min-w-0 flex-1', compact && 'lg:hidden')}>
            <p className="truncate text-sm font-semibold tracking-tight text-white">CNC Monitor</p>
            <p className="truncate text-[11px] text-white/55">Predictive maintenance · MQL</p>
          </div>
          <button
            onClick={onCloseMobile}
            className="rounded-lg p-1.5 text-white/60 hover:bg-white/[0.06] hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {NAV.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            const isAlerts = item.href === '/alerts';
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                title={compact ? item.name : undefined}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'group relative flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors',
                  active
                    ? 'border-sky-400/25 bg-sky-500/10 text-white'
                    : 'border-transparent text-white/65 hover:bg-white/[0.05] hover:text-white',
                  compact && 'lg:justify-center lg:px-0'
                )}
              >
                {active && <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-sky-400" />}
                <Icon className={cn('h-[18px] w-[18px] shrink-0', active ? 'text-sky-300' : 'text-white/50 group-hover:text-white/80')} aria-hidden />
                <span className={cn('flex-1', compact && 'lg:hidden')}>{item.name}</span>
                {isAlerts && openAlerts > 0 && (
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
                      activeAlerts > 0 ? 'bg-red-500/20 text-red-300' : 'bg-white/10 text-white/70',
                      compact && 'lg:absolute lg:right-1.5 lg:top-1 lg:px-1'
                    )}
                    aria-label={`${openAlerts} open alerts`}
                  >
                    {openAlerts}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-2 border-t border-white/[0.07] p-3">
          <div className={cn('rounded-xl border border-white/[0.07] bg-white/[0.03] p-3', compact && 'lg:px-2')}>
            <div className={cn('flex items-center gap-2.5', compact && 'lg:justify-center')}>
              <span className="relative flex h-2 w-2 shrink-0">
                {link === 'live' && <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-50', linkTone)} />}
                <span className={cn('relative inline-flex h-2 w-2 rounded-full', linkTone)} />
              </span>
              <div className={cn('min-w-0', compact && 'lg:hidden')}>
                <p className="truncate text-xs font-medium text-white/85">{linkText}</p>
                <p className="truncate text-[11px] text-white/50">{status ? sourceLabel : 'Connecting…'}</p>
              </div>
            </div>
          </div>
          <button
            onClick={onToggleCollapsed}
            className="hidden w-full items-center justify-center rounded-lg py-1.5 text-white/50 transition-colors hover:bg-white/[0.05] hover:text-white lg:flex"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      </aside>
    </>
  );
}
