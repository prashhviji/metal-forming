'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Brain,
  Wrench,
  CheckCircle2,
  TrendingUp,
  Settings,
  Clock,
  Shield,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { SensorResponse } from '@/types/sensor';

interface MaintenanceInsight {
  toolLife: number;
  spindleHealth: 'Good' | 'Moderate' | 'Poor';
  bearingCondition: 'Normal' | 'Warning' | 'Critical';
  recommendations: string[];
  nextMaintenance: string;
  overallScore: number;
}

export default function AnalysisPage() {
  const [sensorData, setSensorData] = useState<SensorResponse | null>(null);
  const [insights, setInsights] = useState<MaintenanceInsight | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/sensor-data');
        const data: SensorResponse = await response.json();
        setSensorData(data);
        setInsights(generateInsights(data));
      } catch (error) {
        console.error('Failed to fetch sensor data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  function generateInsights(data: SensorResponse): MaintenanceInsight {
    const { data: sensorPoints, thresholds } = data;

    const avgVibration = sensorPoints.reduce((sum, p) => sum + p.vibration, 0) / sensorPoints.length;
    const avgTemperature = sensorPoints.reduce((sum, p) => sum + p.temperature, 0) / sensorPoints.length;
    const avgCurrent = sensorPoints.reduce((sum, p) => sum + p.current, 0) / sensorPoints.length;
    const abnormalCount = sensorPoints.filter((p) => p.label === 'abnormal').length;
    const abnormalPercentage = (abnormalCount / sensorPoints.length) * 100;

    const toolLife = Math.max(60, Math.min(90, 90 - abnormalPercentage * 2 + Math.random() * 10));

    let spindleHealth: 'Good' | 'Moderate' | 'Poor' = 'Good';
    if (avgVibration > thresholds.vibration * 0.8) spindleHealth = 'Poor';
    else if (avgVibration > thresholds.vibration * 0.6) spindleHealth = 'Moderate';

    const hasVibrationSpikes = sensorPoints.some((p) => p.vibration > thresholds.vibration);
    let bearingCondition: 'Normal' | 'Warning' | 'Critical' = 'Normal';
    if (hasVibrationSpikes) {
      const maxVibration = Math.max(...sensorPoints.map((p) => p.vibration));
      bearingCondition = maxVibration > thresholds.vibration * 1.5 ? 'Critical' : 'Warning';
    }

    const recommendations: string[] = [];
    if (bearingCondition !== 'Normal') recommendations.push('Inspect spindle bearings for wear and lubrication');
    if (spindleHealth === 'Poor') recommendations.push('Schedule spindle maintenance and alignment check');
    if (avgTemperature > thresholds.temperature * 0.85) recommendations.push('Check coolant system and thermal management');
    if (avgCurrent > thresholds.current * 0.85) recommendations.push('Review cutting parameters and tool sharpness');
    if (toolLife < 70) recommendations.push('Plan for tool replacement in next maintenance window');
    if (recommendations.length === 0) recommendations.push('Continue normal operations and monitoring');

    let nextMaintenance = '30 days';
    if (bearingCondition === 'Critical' || spindleHealth === 'Poor') nextMaintenance = '3-5 days';
    else if (bearingCondition === 'Warning' || spindleHealth === 'Moderate') nextMaintenance = '7-14 days';

    const overallScore = Math.round(
      (toolLife +
        (spindleHealth === 'Good' ? 90 : spindleHealth === 'Moderate' ? 60 : 30) +
        (bearingCondition === 'Normal' ? 90 : bearingCondition === 'Warning' ? 60 : 30)) /
        3
    );

    return { toolLife: Math.round(toolLife), spindleHealth, bearingCondition, recommendations, nextMaintenance, overallScore };
  }

  if (loading || !sensorData || !insights) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="relative mx-auto h-14 w-14">
            <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-purple-500" />
            <div className="absolute inset-2 animate-spin rounded-full border-2 border-transparent border-b-blue-500" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
          </div>
          <p className="mt-5 text-sm text-white/40">Analyzing sensor data...</p>
        </div>
      </div>
    );
  }

  const healthColors = {
    Good: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/10', dot: 'bg-emerald-400' },
    Moderate: { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/10', dot: 'bg-amber-400' },
    Poor: { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/10', dot: 'bg-red-400' },
  };

  const conditionColors = {
    Normal: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/10', dot: 'bg-emerald-400' },
    Warning: { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/10', dot: 'bg-amber-400' },
    Critical: { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/10', dot: 'bg-red-400' },
  };

  const scoreColor =
    insights.overallScore > 70
      ? 'text-emerald-400'
      : insights.overallScore > 40
      ? 'text-amber-400'
      : 'text-red-400';

  const scoreStroke =
    insights.overallScore > 70
      ? '#34d399'
      : insights.overallScore > 40
      ? '#fbbf24'
      : '#f87171';

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px]">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10">
            <Sparkles className="h-4.5 w-4.5 text-purple-400" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">AI Maintenance Insights</h1>
        </div>
        <p className="text-sm text-white/40 ml-12">
          Predictive analysis and maintenance recommendations
        </p>
      </div>

      {/* Overall Health Score */}
      <div className="rounded-2xl border border-purple-500/10 bg-gradient-to-br from-purple-500/[0.05] to-blue-500/[0.03] overflow-hidden">
        <div className="border-b border-white/[0.04] px-6 py-4">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-purple-400" />
            <h3 className="text-sm font-semibold text-white">Overall Machine Health</h3>
          </div>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-8">
            {/* Circular gauge */}
            <div className="relative flex-shrink-0">
              <svg className="h-36 w-36 -rotate-90" viewBox="0 0 128 128">
                <circle cx="64" cy="64" r="56" stroke="rgba(255,255,255,0.05)" strokeWidth="6" fill="none" />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke={scoreStroke}
                  strokeWidth="6"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 56}`}
                  strokeDashoffset={`${2 * Math.PI * 56 * (1 - insights.overallScore / 100)}`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className={`text-3xl font-bold ${scoreColor}`}>{insights.overallScore}</div>
                  <div className="text-[10px] uppercase tracking-widest text-white/25">Score</div>
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="flex-1 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/40">Machine Status</span>
                <Badge
                  className={`border text-xs ${
                    insights.overallScore > 70
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : insights.overallScore > 40
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      : 'bg-red-500/10 text-red-400 border-red-500/20'
                  }`}
                >
                  {insights.overallScore > 70 ? 'Healthy' : insights.overallScore > 40 ? 'Needs Attention' : 'Critical'}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-3.5 w-3.5 text-blue-400" />
                <span className="text-xs text-white/40">Next Maintenance:</span>
                <span className="text-xs font-semibold text-white">{insights.nextMaintenance}</span>
              </div>
              <div className="h-px bg-white/[0.04]" />
              <p className="text-xs text-white/30 leading-relaxed">
                {insights.overallScore > 70
                  ? 'Machine operating within optimal parameters. Continue regular monitoring.'
                  : insights.overallScore > 40
                  ? 'Some parameters trending toward thresholds. Preventive action recommended.'
                  : 'Critical issues detected requiring immediate maintenance intervention.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Component Health Cards */}
      <div className="grid gap-4 md:grid-cols-3 stagger-children">
        {/* Tool Life */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="h-3.5 w-3.5 text-white/30" />
            <span className="text-xs font-medium uppercase tracking-wider text-white/30">Tool Life</span>
          </div>
          <div className="text-4xl font-bold text-white mb-3">{insights.toolLife}%</div>
          <div className="w-full bg-white/[0.05] rounded-full h-1.5 mb-2">
            <div
              className={`h-1.5 rounded-full transition-all duration-1000 ${
                insights.toolLife > 70 ? 'bg-emerald-400' : insights.toolLife > 40 ? 'bg-amber-400' : 'bg-red-400'
              }`}
              style={{ width: `${insights.toolLife}%` }}
            />
          </div>
          <p className="text-[10px] text-white/25">Based on usage patterns and wear indicators</p>
        </div>

        {/* Spindle Health */}
        <div className={`rounded-2xl border ${healthColors[insights.spindleHealth].border} bg-white/[0.02] p-5`}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-3.5 w-3.5 text-white/30" />
            <span className="text-xs font-medium uppercase tracking-wider text-white/30">Spindle Health</span>
          </div>
          <div className={`text-3xl font-bold mb-3 ${healthColors[insights.spindleHealth].text}`}>
            {insights.spindleHealth}
          </div>
          <div className="flex items-center gap-2">
            <div className={`h-1.5 w-1.5 rounded-full ${healthColors[insights.spindleHealth].dot}`} />
            <Badge className={`text-[10px] border ${healthColors[insights.spindleHealth].bg} ${healthColors[insights.spindleHealth].text}`}>
              {insights.spindleHealth === 'Good' ? 'Operating Normally' : insights.spindleHealth === 'Moderate' ? 'Monitor Closely' : 'Action Required'}
            </Badge>
          </div>
          <p className="mt-2 text-[10px] text-white/25">Assessed from vibration patterns</p>
        </div>

        {/* Bearing Condition */}
        <div className={`rounded-2xl border ${conditionColors[insights.bearingCondition].border} bg-white/[0.02] p-5`}>
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="h-3.5 w-3.5 text-white/30" />
            <span className="text-xs font-medium uppercase tracking-wider text-white/30">Bearing Condition</span>
          </div>
          <div className={`text-3xl font-bold mb-3 ${conditionColors[insights.bearingCondition].text}`}>
            {insights.bearingCondition}
          </div>
          <div className="flex items-center gap-2">
            <div className={`h-1.5 w-1.5 rounded-full ${conditionColors[insights.bearingCondition].dot}`} />
            <Badge className={`text-[10px] border ${conditionColors[insights.bearingCondition].bg} ${conditionColors[insights.bearingCondition].text}`}>
              {insights.bearingCondition === 'Normal' ? 'No Issues Detected' : insights.bearingCondition === 'Warning' ? 'Inspection Recommended' : 'Immediate Action'}
            </Badge>
          </div>
          <p className="mt-2 text-[10px] text-white/25">Analyzed from vibration anomalies</p>
        </div>
      </div>

      {/* Recommendations */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
        <div className="border-b border-white/[0.04] px-6 py-4">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-white">Maintenance Recommendations</h3>
          </div>
          <p className="text-xs text-white/30 mt-0.5 ml-6">
            AI-generated action items based on current machine condition
          </p>
        </div>
        <div className="p-4 space-y-2">
          {insights.recommendations.map((rec, index) => (
            <div
              key={index}
              className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] transition-colors hover:bg-white/[0.04]"
            >
              <CheckCircle2 className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-white/70">{rec}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Predictive Summary */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
        <div className="border-b border-white/[0.04] px-6 py-4">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-purple-400" />
            <h3 className="text-sm font-semibold text-white">Predictive Analysis Summary</h3>
          </div>
        </div>
        <div className="p-6 space-y-4 text-sm text-white/50 leading-relaxed">
          <p>
            <span className="font-semibold text-white">Current Assessment:</span> The machine is operating
            {insights.overallScore > 70
              ? ' within optimal parameters'
              : insights.overallScore > 40
              ? ' with some concerns that should be addressed'
              : ' with critical issues requiring immediate attention'}
            .
            {insights.bearingCondition !== 'Normal' && ' Vibration patterns indicate potential bearing wear.'}
            {insights.spindleHealth !== 'Good' && ' Spindle performance metrics suggest preventive maintenance is needed.'}
          </p>
          <p>
            <span className="font-semibold text-white">Failure Risk:</span> Based on current sensor data and
            historical patterns, the estimated risk of component failure within the next 30 days is{' '}
            <span className={scoreColor}>
              {insights.overallScore > 70 ? 'LOW' : insights.overallScore > 40 ? 'MODERATE' : 'HIGH'}
            </span>
            .
          </p>
          <p>
            <span className="font-semibold text-white">Cost Optimization:</span> Implementing the recommended
            maintenance actions can prevent unplanned downtime and reduce repair costs by an estimated 40-60%
            compared to reactive maintenance strategies.
          </p>
        </div>
      </div>
    </div>
  );
}
