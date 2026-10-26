'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertTriangle,
  Activity,
  Thermometer,
  Zap,
  ShieldAlert,
  Bell,
  Filter,
} from 'lucide-react';
import { SensorResponse, SensorDataPoint } from '@/types/sensor';

interface Alert {
  time: number;
  issue: string;
  severity: 'Critical' | 'High' | 'Medium';
  value: number;
  threshold: number;
  icon: any;
  type: string;
}

export default function AlertsPage() {
  const [sensorData, setSensorData] = useState<SensorResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/sensor-data');
        const data = await response.json();
        setSensorData(data);
      } catch (error) {
        console.error('Failed to fetch sensor data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading || !sensorData) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="relative mx-auto h-14 w-14">
            <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-red-500" />
            <div className="absolute inset-2 animate-spin rounded-full border-2 border-transparent border-b-amber-500" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
          </div>
          <p className="mt-5 text-sm text-white/40">Loading alerts...</p>
        </div>
      </div>
    );
  }

  const { data, thresholds } = sensorData;
  const alerts: Alert[] = [];

  data.forEach((point: SensorDataPoint) => {
    if (point.vibration > thresholds.vibration) {
      alerts.push({
        time: point.time,
        issue: 'Vibration Exceeded',
        severity: 'Critical',
        value: point.vibration,
        threshold: thresholds.vibration,
        icon: Activity,
        type: 'vibration',
      });
    }
    if (point.temperature > thresholds.temperature) {
      alerts.push({
        time: point.time,
        issue: 'Temperature Exceeded',
        severity: 'High',
        value: point.temperature,
        threshold: thresholds.temperature,
        icon: Thermometer,
        type: 'temperature',
      });
    }
    if (point.current > thresholds.current) {
      alerts.push({
        time: point.time,
        issue: 'Current Exceeded',
        severity: 'Medium',
        value: point.current,
        threshold: thresholds.current,
        icon: Zap,
        type: 'current',
      });
    }
  });

  const filteredAlerts =
    filter === 'all' ? alerts : alerts.filter((a) => a.type === filter);

  const severityConfig = {
    Critical: {
      badge: 'bg-red-500/10 text-red-400 border-red-500/20',
      dot: 'bg-red-400',
    },
    High: {
      badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      dot: 'bg-amber-400',
    },
    Medium: {
      badge: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      dot: 'bg-yellow-400',
    },
  };

  const criticalCount = alerts.filter((a) => a.severity === 'Critical').length;
  const highCount = alerts.filter((a) => a.severity === 'High').length;
  const mediumCount = alerts.filter((a) => a.severity === 'Medium').length;

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/10">
              <ShieldAlert className="h-4.5 w-4.5 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Alert Monitor</h1>
          </div>
          <p className="text-sm text-white/40 ml-12">
            Threshold violations and anomaly detection
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Bell className="h-3.5 w-3.5 text-white/30" />
          <span className="text-xs text-white/30">
            {alerts.length} alert{alerts.length !== 1 ? 's' : ''} detected
          </span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4 stagger-children">
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium uppercase tracking-wider text-white/30">Total</span>
            <AlertTriangle className="h-4 w-4 text-white/20" />
          </div>
          <div className="text-3xl font-bold text-white">{alerts.length}</div>
          <p className="mt-1 text-xs text-white/30">threshold violations</p>
        </div>

        <div className="rounded-2xl border border-red-500/10 bg-red-500/[0.03] p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium uppercase tracking-wider text-red-400/50">Critical</span>
            <div className="h-2 w-2 rounded-full bg-red-400 animate-pulse" />
          </div>
          <div className="text-3xl font-bold text-red-400">{criticalCount}</div>
          <p className="mt-1 text-xs text-red-400/40">immediate action</p>
        </div>

        <div className="rounded-2xl border border-amber-500/10 bg-amber-500/[0.03] p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium uppercase tracking-wider text-amber-400/50">High</span>
            <div className="h-2 w-2 rounded-full bg-amber-400" />
          </div>
          <div className="text-3xl font-bold text-amber-400">{highCount}</div>
          <p className="mt-1 text-xs text-amber-400/40">needs attention</p>
        </div>

        <div className="rounded-2xl border border-yellow-500/10 bg-yellow-500/[0.03] p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium uppercase tracking-wider text-yellow-400/50">Medium</span>
            <div className="h-2 w-2 rounded-full bg-yellow-400" />
          </div>
          <div className="text-3xl font-bold text-yellow-400">{mediumCount}</div>
          <p className="mt-1 text-xs text-yellow-400/40">monitor closely</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-2">
        <Filter className="h-3.5 w-3.5 text-white/30" />
        <span className="text-xs text-white/30 mr-1">Filter:</span>
        {['all', 'vibration', 'temperature', 'current'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              filter === f
                ? 'bg-white/10 text-white'
                : 'text-white/30 hover:bg-white/[0.04] hover:text-white/60'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Alerts Table */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
        <div className="border-b border-white/[0.04] px-6 py-4">
          <h3 className="text-sm font-semibold text-white">Alert History</h3>
          <p className="text-xs text-white/30 mt-0.5">
            All threshold violations in the current monitoring window
          </p>
        </div>

        {filteredAlerts.length === 0 ? (
          <div className="text-center py-16">
            <Activity className="h-10 w-10 text-white/10 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-white/60 mb-1">No Alerts</h3>
            <p className="text-xs text-white/30">
              {filter === 'all'
                ? 'All systems operating within normal parameters'
                : `No ${filter} alerts detected`}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-white/[0.04]">
                <TableHead className="text-white/30 text-xs font-medium uppercase tracking-wider">Time</TableHead>
                <TableHead className="text-white/30 text-xs font-medium uppercase tracking-wider">Issue</TableHead>
                <TableHead className="text-white/30 text-xs font-medium uppercase tracking-wider">Value</TableHead>
                <TableHead className="text-white/30 text-xs font-medium uppercase tracking-wider">Threshold</TableHead>
                <TableHead className="text-white/30 text-xs font-medium uppercase tracking-wider">Severity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAlerts.map((alert, index) => {
                const Icon = alert.icon;
                const config = severityConfig[alert.severity];
                return (
                  <TableRow
                    key={index}
                    className="border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                  >
                    <TableCell className="font-mono text-xs text-white/70">
                      {alert.time.toFixed(1)}s
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Icon className="h-3.5 w-3.5 text-white/30" />
                        <span className="text-sm text-white/80">{alert.issue}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-white/70">
                      {alert.value.toFixed(3)}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-white/30">
                      {alert.threshold.toFixed(3)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
                        <Badge className={`text-[10px] border ${config.badge}`}>
                          {alert.severity}
                        </Badge>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Alert Analysis */}
      {alerts.length > 0 && (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
          <div className="border-b border-white/[0.04] px-6 py-4">
            <h3 className="text-sm font-semibold text-white">Analysis Summary</h3>
          </div>
          <div className="p-6 space-y-4">
            {/* Alert warning banner */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/[0.05] border border-red-500/10">
              <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-white mb-1">
                  Multiple Threshold Violations Detected
                </h4>
                <p className="text-xs text-white/40 leading-relaxed">
                  The machine experienced {alerts.length} threshold violations concentrated
                  between {alerts[0].time.toFixed(1)}s and{' '}
                  {alerts[alerts.length - 1].time.toFixed(1)}s. This pattern suggests a
                  transient operational issue requiring immediate attention.
                </p>
              </div>
            </div>

            {/* Breakdown */}
            <div className="grid gap-3 md:grid-cols-3">
              {[
                { label: 'Vibration', count: alerts.filter((a) => a.type === 'vibration').length, color: 'blue' },
                { label: 'Temperature', count: alerts.filter((a) => a.type === 'temperature').length, color: 'amber' },
                { label: 'Current', count: alerts.filter((a) => a.type === 'current').length, color: 'emerald' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
                >
                  <p className="text-xs text-white/30 mb-1">{item.label} Alerts</p>
                  <p className="text-2xl font-bold text-white">{item.count}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
