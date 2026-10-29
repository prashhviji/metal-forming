'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { LiveProvider } from '@/components/live-provider';
import { Sidebar } from '@/components/sidebar';
import { TopBar } from '@/components/topbar';
import { ToastProvider } from '@/components/toast';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Remember the sidebar state per browser; fall back silently if storage is blocked.
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem('sidebar-collapsed') === '1');
    } catch {
      /* storage unavailable */
    }
  }, []);

  useEffect(() => setMobileOpen(false), [pathname]);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem('sidebar-collapsed', c ? '0' : '1');
      } catch {
        /* storage unavailable */
      }
      return !c;
    });
  };

  return (
    <ToastProvider>
      <LiveProvider>
        <div className="flex h-screen overflow-hidden bg-[#060a14]">
          <Sidebar
            collapsed={collapsed}
            onToggleCollapsed={toggleCollapsed}
            mobileOpen={mobileOpen}
            onCloseMobile={() => setMobileOpen(false)}
          />
          <div className="flex min-w-0 flex-1 flex-col">
            <TopBar onOpenMenu={() => setMobileOpen(true)} />
            <main className="flex-1 overflow-y-auto">{children}</main>
          </div>
        </div>
      </LiveProvider>
    </ToastProvider>
  );
}
