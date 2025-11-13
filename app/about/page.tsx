import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Activity, 
  Thermometer, 
  Zap, 
  AlertTriangle,
  Brain,
  TrendingUp,
  Shield,
  Clock
} from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="p-8 space-y-8 max-w-6xl">
      <div>
        <h1 className="text-3xl font-bold text-white">About CNC Predictive Maintenance</h1>
        <p className="mt-2 text-gray-400">
          Understanding sensor monitoring and predictive maintenance strategies
        </p>
      </div>

      {/* Sensor Overview */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Activity className="h-6 w-6 text-blue-500" />
            Sensor Measurements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex gap-4 p-4 rounded-lg bg-gray-800 border border-gray-700">
              <div className="flex-shrink-0">
                <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Activity className="h-6 w-6 text-blue-500" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">Vibration (g)</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Vibration sensors measure mechanical oscillations in the CNC machine structure. 
                  Excessive vibration indicates bearing wear, spindle imbalance, or loose components. 
                  Normal operating range is typically below 0.3g. Spikes above this threshold suggest 
                  mechanical issues requiring immediate attention.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs font-mono text-blue-400">Normal: &lt; 0.3g</span>
                  <span className="text-gray-600">|</span>
                  <span className="text-xs font-mono text-red-400">Critical: &gt; 0.3g</span>
                </div>
              </div>
            </div>

            <div className="flex gap-4 p-4 rounded-lg bg-gray-800 border border-gray-700">
              <div className="flex-shrink-0">
                <div className="h-12 w-12 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <Thermometer className="h-6 w-6 text-orange-500" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">Temperature (°C)</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Temperature sensors monitor spindle and motor heat generation. Elevated temperatures 
                  indicate inadequate cooling, excessive friction, or bearing degradation. Operating 
                  temperatures should remain below 45°C. Sustained high temperatures accelerate wear 
                  and can lead to thermal expansion issues affecting precision.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs font-mono text-orange-400">Normal: &lt; 45°C</span>
                  <span className="text-gray-600">|</span>
                  <span className="text-xs font-mono text-red-400">Critical: &gt; 45°C</span>
                </div>
              </div>
            </div>

            <div className="flex gap-4 p-4 rounded-lg bg-gray-800 border border-gray-700">
              <div className="flex-shrink-0">
                <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Zap className="h-6 w-6 text-green-500" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">Current (Amperes)</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Current sensors track electrical power consumption of spindle motors. Abnormal current 
                  draw indicates mechanical resistance, dull cutting tools, or motor problems. Normal 
                  operation typically stays below 3.0A. Sudden spikes suggest increased cutting forces 
                  or mechanical binding that could damage tools or workpieces.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs font-mono text-green-400">Normal: &lt; 3.0A</span>
                  <span className="text-gray-600">|</span>
                  <span className="text-xs font-mono text-red-400">Critical: &gt; 3.0A</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Abnormalities */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-red-500" />
            Understanding Abnormalities
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-300 leading-relaxed">
            Abnormal sensor readings are critical indicators of developing machine problems. Our system 
            continuously monitors all sensor channels and applies threshold-based detection algorithms 
            to identify anomalies in real-time.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/20">
              <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Common Causes
              </h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">•</span>
                  <span>Worn or damaged bearings causing excessive vibration</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">•</span>
                  <span>Insufficient coolant flow leading to temperature spikes</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">•</span>
                  <span>Dull cutting tools increasing current draw</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">•</span>
                  <span>Spindle misalignment or imbalance</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">•</span>
                  <span>Mechanical binding or excessive cutting forces</span>
                </li>
              </ul>
            </div>

            <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
              <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-500" />
                Consequences if Ignored
              </h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>Catastrophic bearing failure requiring major repairs</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>Thermal damage to precision components</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>Motor burnout from sustained overload</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>Poor surface finish and dimensional inaccuracy</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>Unplanned downtime and production losses</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Predictive Maintenance */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Brain className="h-6 w-6 text-purple-500" />
            How Predictive Maintenance Works
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-gray-300 leading-relaxed">
            Predictive maintenance uses real-time sensor data and analytics to predict equipment failures 
            before they occur, enabling proactive maintenance scheduling that minimizes downtime and reduces costs.
          </p>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="p-4 rounded-lg bg-gray-800 border border-gray-700 text-center">
              <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center mx-auto mb-3">
                <Activity className="h-6 w-6 text-blue-500" />
              </div>
              <h4 className="font-semibold text-white mb-2">Data Collection</h4>
              <p className="text-xs text-gray-400">
                Continuous monitoring of vibration, temperature, and current sensors at high sampling rates
              </p>
            </div>

            <div className="p-4 rounded-lg bg-gray-800 border border-gray-700 text-center">
              <div className="h-12 w-12 rounded-lg bg-purple-500/10 flex items-center justify-center mx-auto mb-3">
                <Brain className="h-6 w-6 text-purple-500" />
              </div>
              <h4 className="font-semibold text-white mb-2">Analysis</h4>
              <p className="text-xs text-gray-400">
                Machine learning algorithms detect patterns and anomalies in sensor data streams
              </p>
            </div>

            <div className="p-4 rounded-lg bg-gray-800 border border-gray-700 text-center">
              <div className="h-12 w-12 rounded-lg bg-yellow-500/10 flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="h-6 w-6 text-yellow-500" />
              </div>
              <h4 className="font-semibold text-white mb-2">Prediction</h4>
              <p className="text-xs text-gray-400">
                AI models forecast component degradation and predict remaining useful life
              </p>
            </div>

            <div className="p-4 rounded-lg bg-gray-800 border border-gray-700 text-center">
              <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center mx-auto mb-3">
                <Clock className="h-6 w-6 text-green-500" />
              </div>
              <h4 className="font-semibold text-white mb-2">Action</h4>
              <p className="text-xs text-gray-400">
                Maintenance teams receive alerts and recommendations for optimal intervention timing
              </p>
            </div>
          </div>

          <div className="p-6 rounded-lg bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/20">
            <h4 className="font-semibold text-white mb-3 text-lg">Key Benefits</h4>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="flex items-start gap-2">
                <span className="text-green-500 font-bold">↓ 40-60%</span>
                <span className="text-gray-300 text-sm">Reduction in maintenance costs</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-500 font-bold">↓ 70-80%</span>
                <span className="text-gray-300 text-sm">Decrease in unplanned downtime</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-500 font-bold">↑ 25-30%</span>
                <span className="text-gray-300 text-sm">Increase in equipment lifespan</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-500 font-bold">↑ 20-25%</span>
                <span className="text-gray-300 text-sm">Improvement in production efficiency</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Technical Details */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">System Architecture</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-300 leading-relaxed">
            This demonstration system showcases a modern predictive maintenance platform built with:
          </p>
          
          <div className="grid gap-3 md:grid-cols-2">
            <div className="p-3 rounded-lg bg-gray-800 border border-gray-700">
              <h5 className="font-semibold text-white text-sm mb-1">Frontend</h5>
              <p className="text-xs text-gray-400">Next.js 14 with React and TypeScript for type-safe, performant UI</p>
            </div>
            <div className="p-3 rounded-lg bg-gray-800 border border-gray-700">
              <h5 className="font-semibold text-white text-sm mb-1">Visualization</h5>
              <p className="text-xs text-gray-400">Chart.js with React integration for real-time data visualization</p>
            </div>
            <div className="p-3 rounded-lg bg-gray-800 border border-gray-700">
              <h5 className="font-semibold text-white text-sm mb-1">Styling</h5>
              <p className="text-xs text-gray-400">Tailwind CSS and shadcn/ui for industrial-themed dark interface</p>
            </div>
            <div className="p-3 rounded-lg bg-gray-800 border border-gray-700">
              <h5 className="font-semibold text-white text-sm mb-1">Data Processing</h5>
              <p className="text-xs text-gray-400">API routes with synthetic sensor data generation and analysis</p>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
            <p className="text-sm text-gray-400">
              <span className="font-semibold text-blue-400">Note:</span> This is a demonstration system 
              using synthetic data. In production environments, sensor data would be collected from actual 
              industrial IoT devices via protocols like OPC-UA, MQTT, or Modbus, and processed using 
              advanced machine learning models trained on historical failure data.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

