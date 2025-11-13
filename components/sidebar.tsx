'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  AlertTriangle, 
  BarChart3, 
  Info,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Alerts', href: '/alerts', icon: AlertTriangle },
  { name: 'Analysis', href: '/analysis', icon: BarChart3 },
  { name: 'About', href: '/about', icon: Info },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col bg-gray-900 border-r border-gray-800">
      <div className="flex h-16 items-center gap-2 border-b border-gray-800 px-6">
        <Activity className="h-8 w-8 text-blue-500" />
        <div>
          <h1 className="text-lg font-bold text-white">CNC Monitor</h1>
          <p className="text-xs text-gray-400">Predictive Maintenance</p>
        </div>
      </div>
      
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              )}
            >
              <Icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>
      
      <div className="border-t border-gray-800 p-4">
        <div className="rounded-lg bg-gray-800 p-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-xs font-medium text-gray-300">System Online</span>
          </div>
          <p className="mt-1 text-xs text-gray-500">Real-time monitoring active</p>
        </div>
      </div>
    </div>
  );
}

