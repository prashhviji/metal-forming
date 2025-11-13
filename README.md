# CNC Machine Predictive Maintenance Dashboard

A modern, real-time predictive maintenance monitoring system for CNC machines built with Next.js 14, TypeScript, Tailwind CSS, and Chart.js.

## Features

- 📊 **Real-time Monitoring Dashboard** - Live visualization of vibration, temperature, and current sensors
- 🚨 **Intelligent Alert System** - Automated threshold-based anomaly detection
- 🤖 **AI Maintenance Insights** - Predictive analytics for component health and maintenance scheduling
- 📱 **Responsive Design** - Industrial dark theme with professional UI/UX
- 📈 **Interactive Charts** - Dynamic time-series data visualization with Chart.js
- ⚡ **High Performance** - Built on Next.js 14 App Router for optimal speed

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Components:** shadcn/ui
- **Charts:** Chart.js with react-chartjs-2
- **Icons:** Lucide React

## Project Structure

```
/app
  /dashboard       # Main monitoring dashboard with real-time charts
  /alerts          # Alert history and threshold violations
  /analysis        # AI-powered maintenance insights
  /about           # System documentation and explanations
  /api
    /sensor-data   # Synthetic sensor data API endpoint
  layout.tsx       # Root layout
  page.tsx         # Home page (redirects to dashboard)
  globals.css      # Global styles

/components
  /ui              # shadcn/ui components (Card, Badge, Table)
  sidebar.tsx      # Navigation sidebar
  sensor-chart.tsx # Reusable chart component
  status-card.tsx  # Status indicator cards

/lib
  utils.ts         # Utility functions

/types
  sensor.ts        # TypeScript type definitions
```

## Installation & Setup

### Prerequisites

- Node.js 18.x or higher
- npm or yarn

### Steps

1. **Install Dependencies**

```bash
npm install
```

2. **Run Development Server**

```bash
npm run dev
```

3. **Open Browser**

Navigate to [http://localhost:3000](http://localhost:3000)

The application will automatically redirect to the dashboard page.

## Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm start        # Start production server
npm run lint     # Run ESLint
```

## API Documentation

### GET /api/sensor-data

Returns synthetic CNC sensor data for demonstration purposes.

**Response:**
```json
{
  "data": [
    {
      "time": 0.0,
      "vibration": 0.175,
      "temperature": 39.5,
      "current": 2.15,
      "label": "normal"
    },
    ...
  ],
  "thresholds": {
    "vibration": 0.3,
    "temperature": 45,
    "current": 3.0
  },
  "metadata": {
    "totalPoints": 301,
    "duration": 30,
    "samplingRate": 10
  }
}
```

**Data Characteristics:**
- Time range: 0-30 seconds (step: 0.1s)
- ~300 data points
- Abnormal spike between t=10-15 seconds
- Threshold-based labeling

## Sensor Thresholds

| Sensor | Normal Range | Threshold | Severity |
|--------|-------------|-----------|----------|
| Vibration | < 0.3 g | 0.3 g | Critical |
| Temperature | < 45°C | 45°C | High |
| Current | < 3.0 A | 3.0 A | Medium |

## Pages Overview

### Dashboard (`/dashboard`)
- Real-time sensor visualization
- 3 interactive line charts (vibration, temperature, current)
- Status cards with color-coded health indicators
- Auto-refresh every 5 seconds

### Alerts (`/alerts`)
- Comprehensive alert history table
- Threshold violation detection
- Severity classification (Critical/High/Medium)
- Alert summary statistics

### Analysis (`/analysis`)
- AI-generated maintenance insights
- Component health assessment
  - Tool life remaining (%)
  - Spindle health status
  - Bearing condition
- Maintenance recommendations
- Overall machine health score

### About (`/about`)
- Detailed sensor explanations
- Abnormality causes and consequences
- Predictive maintenance methodology
- System architecture documentation

## Customization

### Modify Sensor Thresholds

Edit `app/api/sensor-data/route.ts`:

```typescript
const THRESHOLDS = {
  vibration: 0.3,    // Change threshold
  temperature: 45,   // Change threshold
  current: 3.0,      // Change threshold
};
```

### Adjust Data Generation

Modify the `generateSensorData()` function in `app/api/sensor-data/route.ts` to change:
- Time range
- Baseline values
- Spike timing and intensity
- Sampling rate

### Customize Theme Colors

Edit `tailwind.config.ts` and `app/globals.css` for color scheme modifications.

## Production Deployment

### Build for Production

```bash
npm run build
npm start
```

### Deploy to Vercel

```bash
npm install -g vercel
vercel
```

### Deploy to Other Platforms

The application is a standard Next.js app and can be deployed to:
- Vercel
- Netlify
- AWS Amplify
- Docker containers
- Any Node.js hosting service

## Future Enhancements

- [ ] Real IoT device integration (MQTT/OPC-UA)
- [ ] Machine learning model training interface
- [ ] Historical data storage (database)
- [ ] Multi-machine monitoring
- [ ] Email/SMS alert notifications
- [ ] Export reports (PDF/CSV)
- [ ] User authentication and roles
- [ ] Maintenance schedule calendar

## License

MIT License - Free for personal and commercial use

## Support

For questions or issues, please open an issue on GitHub.

---

**Built with ❤️ for industrial automation and predictive maintenance**

