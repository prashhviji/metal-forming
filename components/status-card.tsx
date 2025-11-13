import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatusCardProps {
  title: string;
  value: string;
  unit: string;
  status: 'normal' | 'warning' | 'critical';
  icon: LucideIcon;
  threshold?: string;
}

const statusConfig = {
  normal: {
    badge: 'Normal',
    badgeColor: 'bg-green-500/10 text-green-500 border-green-500/20',
    iconColor: 'text-green-500',
    bgColor: 'bg-green-500/5',
  },
  warning: {
    badge: 'Warning',
    badgeColor: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    iconColor: 'text-yellow-500',
    bgColor: 'bg-yellow-500/5',
  },
  critical: {
    badge: 'Critical',
    badgeColor: 'bg-red-500/10 text-red-500 border-red-500/20',
    iconColor: 'text-red-500',
    bgColor: 'bg-red-500/5',
  },
};

export function StatusCard({ 
  title, 
  value, 
  unit, 
  status, 
  icon: Icon,
  threshold 
}: StatusCardProps) {
  const config = statusConfig[status];

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-gray-400">
          {title}
        </CardTitle>
        <div className={cn('rounded-lg p-2', config.bgColor)}>
          <Icon className={cn('h-4 w-4', config.iconColor)} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <div className="text-3xl font-bold text-white">
            {value}
          </div>
          <span className="text-sm text-gray-500">{unit}</span>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <Badge className={cn('text-xs', config.badgeColor)}>
            {config.badge}
          </Badge>
          {threshold && (
            <span className="text-xs text-gray-500">
              Threshold: {threshold}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

