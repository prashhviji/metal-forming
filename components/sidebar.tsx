'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard,
  AlertTriangle,
  BarChart3,
  Info,
  Activity,
  ChevronLeft,
  ChevronRight,
  Cpu,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, color: 'blue' },
  { name: 'Alerts', href: '/alerts', icon: AlertTriangle, color: 'red' },
  { name: 'Analysis', href: '/analysis', icon: BarChart3, color: 'purple' },
  { name: 'About', href: '/about', icon: Info, color: 'emerald' },
];

const colorMap: Record<string, { active: string; dot: string; iconActive: string }> = {
  blue: {
    active: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    dot: 'bg-blue-400',
    iconActive: 'text-blue-400',
  },
  red: {
    active: 'bg-red-500/10 border-red-500/30 text-red-400',
    dot: 'bg-red-400',
    iconActive: 'text-red-400',
  },
  purple: {
    active: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
    dot: 'bg-purple-400',
    iconActive: 'text-purple-400',
  },
  emerald: {
    active: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    dot: 'bg-emerald-400',
    iconActive: 'text-emerald-400',
  },
};

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className={cn(
        'relative flex h-full flex-col border-r border-white/[0.06] bg-[#0a0e1a]/80 backdrop-blur-xl transition-all duration-300',
        collapsed ? 'w-[72px]' : 'w-64'
      )}
    >
      {/* Logo / Header */}
      <div className="flex h-16 items-center gap-3 border-b border-white/[0.06] px-4">
        <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/20">
          <Cpu className="h-5 w-5 text-white" />
          <div className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0a0e1a] bg-green-400" />
        </div>
        {!collapsed && (
          <div className="animate-fade-in overflow-hidden">
            <h1 className="text-sm font-bold text-white tracking-wide">CNC Monitor</h1>
            <p className="text-[10px] font-medium text-white/40 uppercase tracking-widest">
              Predictive AI
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {!collapsed && (
          <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-widest text-white/30">
            Navigation
          </p>
        )}
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          const colors = colorMap[item.color];

          return (
            <Link
              key={item.name}
              href={item.href}
              title={collapsed ? item.name : undefined}
              className={cn(
                'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? cn('border', colors.active)
                  : 'border border-transparent text-white/50 hover:bg-white/[0.04] hover:text-white/80'
              )}
            >
              {/* Active indicator line */}
              {isActive && (
                <div
                  className={cn(
                    'absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full',
                    colors.dot
                  )}
                />
              )}
              <Icon
                className={cn(
                  'h-[18px] w-[18px] flex-shrink-0 transition-colors',
                  isActive ? colors.iconActive : 'text-white/40 group-hover:text-white/70'
                )}
              />
              {!collapsed && (
                <span className="animate-fade-in">{item.name}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-white/[0.06] p-3 space-y-3">
        {/* Machine status indicator */}
        <div
          className={cn(
            'rounded-xl bg-white/[0.03] p-3 transition-all duration-300',
            collapsed ? 'px-2' : ''
          )}
        >
          <div className="flex items-center gap-2.5">
            <div className="relative flex-shrink-0">
              <div className="h-2 w-2 rounded-full bg-green-400" />
              <div className="absolute inset-0 h-2 w-2 animate-ping rounded-full bg-green-400 opacity-40" />
            </div>
            {!collapsed && (
              <div className="animate-fade-in">
                <span className="text-xs font-medium text-white/70">System Online</span>
                <p className="text-[10px] text-white/30">All sensors active</p>
              </div>
            )}
          </div>
        </div>

        {/* Collapse button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center rounded-lg py-1.5 text-white/30 transition-colors hover:bg-white/[0.04] hover:text-white/60"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}
