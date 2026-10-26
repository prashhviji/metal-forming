import {
  Activity,
  Thermometer,
  Zap,
  AlertTriangle,
  Brain,
  TrendingUp,
  Shield,
  Clock,
  Cpu,
  Database,
  LineChart,
  Layers,
} from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1100px]">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10">
            <Cpu className="h-4.5 w-4.5 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            About CNC Predictive Maintenance
          </h1>
        </div>
        <p className="text-sm text-white/40 ml-12">
          Understanding sensor monitoring and predictive maintenance strategies
        </p>
      </div>

      {/* Sensor Measurements */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
        <div className="border-b border-white/[0.04] px-6 py-4">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-white">Sensor Measurements</h3>
          </div>
        </div>
        <div className="p-4 space-y-3">
          {[
            {
              icon: Activity,
              color: 'blue',
              title: 'Vibration (g)',
              desc: 'Vibration sensors measure mechanical oscillations in the CNC machine structure. Excessive vibration indicates bearing wear, spindle imbalance, or loose components. Normal operating range is typically below 0.3g.',
              normal: '< 0.3g',
              critical: '> 0.3g',
            },
            {
              icon: Thermometer,
              color: 'amber',
              title: 'Temperature (°C)',
              desc: 'Temperature sensors monitor spindle and motor heat generation. Elevated temperatures indicate inadequate cooling, excessive friction, or bearing degradation. Operating temperatures should remain below 45°C.',
              normal: '< 45°C',
              critical: '> 45°C',
            },
            {
              icon: Zap,
              color: 'emerald',
              title: 'Current (Amperes)',
              desc: 'Current sensors track electrical power consumption of spindle motors. Abnormal current draw indicates mechanical resistance, dull cutting tools, or motor problems. Normal operation typically stays below 3.0A.',
              normal: '< 3.0A',
              critical: '> 3.0A',
            },
          ].map((sensor) => {
            const Icon = sensor.icon;
            const colorMap: Record<string, { iconBg: string; iconText: string; normalText: string }> = {
              blue: { iconBg: 'bg-blue-500/10', iconText: 'text-blue-400', normalText: 'text-blue-400' },
              amber: { iconBg: 'bg-amber-500/10', iconText: 'text-amber-400', normalText: 'text-amber-400' },
              emerald: { iconBg: 'bg-emerald-500/10', iconText: 'text-emerald-400', normalText: 'text-emerald-400' },
            };
            const c = colorMap[sensor.color];

            return (
              <div
                key={sensor.title}
                className="flex gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] transition-colors hover:bg-white/[0.04]"
              >
                <div className="flex-shrink-0">
                  <div className={`h-10 w-10 rounded-xl ${c.iconBg} flex items-center justify-center`}>
                    <Icon className={`h-5 w-5 ${c.iconText}`} />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-white mb-1.5">{sensor.title}</h4>
                  <p className="text-xs text-white/40 leading-relaxed mb-3">{sensor.desc}</p>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-mono ${c.normalText}`}>Normal: {sensor.normal}</span>
                    <div className="h-3 w-px bg-white/[0.08]" />
                    <span className="text-[10px] font-mono text-red-400">Critical: {sensor.critical}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Understanding Abnormalities */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
        <div className="border-b border-white/[0.04] px-6 py-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <h3 className="text-sm font-semibold text-white">Understanding Abnormalities</h3>
          </div>
        </div>
        <div className="p-6">
          <p className="text-xs text-white/40 leading-relaxed mb-5">
            Abnormal sensor readings are critical indicators of developing machine problems. Our system
            continuously monitors all sensor channels and applies threshold-based detection algorithms
            to identify anomalies in real-time.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 rounded-xl bg-red-500/[0.03] border border-red-500/10">
              <h4 className="text-xs font-semibold text-white mb-3 flex items-center gap-2">
                <AlertTriangle className="h-3 w-3 text-red-400" />
                Common Causes
              </h4>
              <ul className="space-y-2">
                {[
                  'Worn or damaged bearings causing excessive vibration',
                  'Insufficient coolant flow leading to temperature spikes',
                  'Dull cutting tools increasing current draw',
                  'Spindle misalignment or imbalance',
                  'Mechanical binding or excessive cutting forces',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-xs text-white/40">
                    <span className="text-red-400/60 mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-blue-500/[0.03] border border-blue-500/10">
              <h4 className="text-xs font-semibold text-white mb-3 flex items-center gap-2">
                <Shield className="h-3 w-3 text-blue-400" />
                Consequences if Ignored
              </h4>
              <ul className="space-y-2">
                {[
                  'Catastrophic bearing failure requiring major repairs',
                  'Thermal damage to precision components',
                  'Motor burnout from sustained overload',
                  'Poor surface finish and dimensional inaccuracy',
                  'Unplanned downtime and production losses',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-xs text-white/40">
                    <span className="text-blue-400/60 mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* How Predictive Maintenance Works */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
        <div className="border-b border-white/[0.04] px-6 py-4">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-purple-400" />
            <h3 className="text-sm font-semibold text-white">How Predictive Maintenance Works</h3>
          </div>
        </div>
        <div className="p-6 space-y-5">
          <p className="text-xs text-white/40 leading-relaxed">
            Predictive maintenance uses real-time sensor data and analytics to predict equipment failures
            before they occur, enabling proactive maintenance scheduling that minimizes downtime and costs.
          </p>

          <div className="grid gap-3 md:grid-cols-4">
            {[
              { icon: Activity, color: 'blue', title: 'Collection', desc: 'Continuous monitoring of vibration, temperature, and current sensors at high sampling rates' },
              { icon: Brain, color: 'purple', title: 'Analysis', desc: 'ML algorithms detect patterns and anomalies in sensor data streams' },
              { icon: TrendingUp, color: 'amber', title: 'Prediction', desc: 'AI models forecast component degradation and remaining useful life' },
              { icon: Clock, color: 'emerald', title: 'Action', desc: 'Maintenance teams receive alerts and recommendations for optimal timing' },
            ].map((step) => {
              const Icon = step.icon;
              const colorMap: Record<string, { iconBg: string; iconText: string }> = {
                blue: { iconBg: 'bg-blue-500/10', iconText: 'text-blue-400' },
                purple: { iconBg: 'bg-purple-500/10', iconText: 'text-purple-400' },
                amber: { iconBg: 'bg-amber-500/10', iconText: 'text-amber-400' },
                emerald: { iconBg: 'bg-emerald-500/10', iconText: 'text-emerald-400' },
              };
              const c = colorMap[step.color];

              return (
                <div
                  key={step.title}
                  className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] text-center transition-colors hover:bg-white/[0.04]"
                >
                  <div className={`h-10 w-10 rounded-xl ${c.iconBg} flex items-center justify-center mx-auto mb-3`}>
                    <Icon className={`h-5 w-5 ${c.iconText}`} />
                  </div>
                  <h4 className="text-xs font-semibold text-white mb-1.5">{step.title}</h4>
                  <p className="text-[10px] text-white/30 leading-relaxed">{step.desc}</p>
                </div>
              );
            })}
          </div>

          {/* Key benefits */}
          <div className="p-5 rounded-xl bg-gradient-to-r from-purple-500/[0.05] to-blue-500/[0.03] border border-purple-500/10">
            <h4 className="text-xs font-semibold text-white mb-3">Key Benefits</h4>
            <div className="grid gap-2 md:grid-cols-2">
              {[
                { value: '↓ 40-60%', label: 'Reduction in maintenance costs' },
                { value: '↓ 70-80%', label: 'Decrease in unplanned downtime' },
                { value: '↑ 25-30%', label: 'Increase in equipment lifespan' },
                { value: '↑ 20-25%', label: 'Improvement in production efficiency' },
              ].map((benefit) => (
                <div key={benefit.label} className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-400 font-mono">{benefit.value}</span>
                  <span className="text-[11px] text-white/40">{benefit.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* System Architecture */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
        <div className="border-b border-white/[0.04] px-6 py-4">
          <h3 className="text-sm font-semibold text-white">System Architecture</h3>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-xs text-white/40 leading-relaxed">
            This system showcases a modern predictive maintenance platform with fully local data processing:
          </p>

          <div className="grid gap-3 md:grid-cols-2">
            {[
              { icon: Layers, title: 'Frontend', desc: 'Next.js 14 with React and TypeScript for type-safe, performant UI' },
              { icon: LineChart, title: 'Visualization', desc: 'Chart.js with React integration for real-time data visualization' },
              { icon: Cpu, title: 'Styling', desc: 'Tailwind CSS with glassmorphism and modern dark theme design' },
              { icon: Database, title: 'Data', desc: 'Fully local data generation — no external database or API required' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04]"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <Icon className="h-3.5 w-3.5 text-white/30" />
                    <h5 className="text-xs font-semibold text-white">{item.title}</h5>
                  </div>
                  <p className="text-[10px] text-white/30 leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>

          <div className="p-4 rounded-xl bg-blue-500/[0.03] border border-blue-500/10">
            <p className="text-[11px] text-white/40 leading-relaxed">
              <span className="font-semibold text-blue-400">Note:</span> This is a demonstration system
              using locally generated synthetic data. All processing happens in-browser — no external database
              or cloud service is required. In production, sensor data would be collected from industrial IoT
              devices via OPC-UA, MQTT, or Modbus protocols.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
