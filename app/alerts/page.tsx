'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlertTriangle, Activity, Thermometer, Zap } from 'lucide-react';
import { SensorResponse, SensorDataPoint } from '@/types/sensor';

interface Alert {
  time: number;
  issue: string;
  severity: 'Critical' | 'High' | 'Medium';
  value: number;
  threshold: number;
  icon: any;
}

export default function AlertsPage() {
  const [sensorData, setSensorData] = useState<SensorResponse | null>(null);
  const [loading, setLoading] = useState(true);

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
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading alerts...</p>
        </div>
      </div>
    );
  }

  const { data, thresholds } = sensorData;

  // Parse alerts
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
      });
    }
  });

  const severityConfig = {
    Critical: 'bg-red-500/10 text-red-500 border-red-500/20',
    High: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    Medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  };

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Alert Monitor</h1>
        <p className="mt-2 text-gray-400">
          Threshold violations and anomaly detection
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400">
              Total Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-white">{alerts.length}</div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400">
              Critical Issues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-red-500">
                {alerts.filter(a => a.severity === 'Critical').length}
              </div>
              <Activity className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400">
              Time Range
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">
              {alerts.length > 0 
                ? `${alerts[0].time.toFixed(1)}s - ${alerts[alerts.length - 1].time.toFixed(1)}s`
                : 'N/A'
              }
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Table */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Alert History</CardTitle>
          <CardDescription className="text-gray-400">
            All threshold violations detected in the current monitoring period
          </CardDescription>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No Alerts</h3>
              <p className="text-gray-400">All systems operating within normal parameters</p>
            </div>
          ) : (
            <div className="rounded-lg border border-gray-800 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-gray-800">
                    <TableHead className="text-gray-400">Time</TableHead>
                    <TableHead className="text-gray-400">Issue</TableHead>
                    <TableHead className="text-gray-400">Value</TableHead>
                    <TableHead className="text-gray-400">Threshold</TableHead>
                    <TableHead className="text-gray-400">Severity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alerts.map((alert, index) => {
                    const Icon = alert.icon;
                    return (
                      <TableRow key={index} className="border-gray-800">
                        <TableCell className="font-mono text-white">
                          {alert.time.toFixed(1)}s
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-gray-400" />
                            <span className="text-white">{alert.issue}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-white">
                          {alert.value.toFixed(3)}
                        </TableCell>
                        <TableCell className="font-mono text-gray-400">
                          {alert.threshold.toFixed(3)}
                        </TableCell>
                        <TableCell>
                          <Badge className={severityConfig[alert.severity]}>
                            {alert.severity}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alert Analysis */}
      {alerts.length > 0 && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Alert Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-lg bg-red-500/5 border border-red-500/20">
                <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-white mb-1">Multiple Threshold Violations Detected</h4>
                  <p className="text-sm text-gray-400">
                    The machine experienced {alerts.length} threshold violations, primarily concentrated 
                    between {alerts[0].time.toFixed(1)}s and {alerts[alerts.length - 1].time.toFixed(1)}s. 
                    This pattern suggests a transient operational issue that requires immediate attention.
                  </p>
                </div>
              </div>
              
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 rounded-lg bg-gray-800 border border-gray-700">
                  <div className="text-sm text-gray-400 mb-1">Vibration Alerts</div>
                  <div className="text-2xl font-bold text-white">
                    {alerts.filter(a => a.issue === 'Vibration Exceeded').length}
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-gray-800 border border-gray-700">
                  <div className="text-sm text-gray-400 mb-1">Temperature Alerts</div>
                  <div className="text-2xl font-bold text-white">
                    {alerts.filter(a => a.issue === 'Temperature Exceeded').length}
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-gray-800 border border-gray-700">
                  <div className="text-sm text-gray-400 mb-1">Current Alerts</div>
                  <div className="text-2xl font-bold text-white">
                    {alerts.filter(a => a.issue === 'Current Exceeded').length}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

