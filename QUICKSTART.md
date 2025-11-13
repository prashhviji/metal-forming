# 🚀 Quick Start Guide

## Installation (2 Commands)

```bash
npm install
npm run dev
```

Then open: **http://localhost:3000**

---

## ✅ What's Included

### 4 Complete Pages
1. **Dashboard** (`/dashboard`) - Real-time monitoring with 3 charts
2. **Alerts** (`/alerts`) - Threshold violation table
3. **Analysis** (`/analysis`) - AI maintenance insights
4. **About** (`/about`) - Documentation

### API Endpoint
- **GET** `/api/sensor-data` - Returns 300+ synthetic sensor readings

### Key Features
- ✅ Real-time data visualization with Chart.js
- ✅ Threshold-based anomaly detection
- ✅ Predictive maintenance analytics
- ✅ Dark industrial theme UI
- ✅ Fully responsive design
- ✅ TypeScript throughout
- ✅ Auto-refreshing dashboard

---

## 📊 Sensor Data Overview

| Sensor | Normal | Threshold | Unit |
|--------|--------|-----------|------|
| Vibration | < 0.3 | 0.3 | g |
| Temperature | < 45 | 45 | °C |
| Current | < 3.0 | 3.0 | A |

**Abnormal spike occurs between t=10-15 seconds**

---

## 🎨 Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Chart.js (react-chartjs-2)
- shadcn/ui components
- Lucide React icons

---

## 📁 Project Structure

```
/app
  ├── /dashboard      # Main monitoring page
  ├── /alerts         # Alert history
  ├── /analysis       # AI insights
  ├── /about          # Documentation
  └── /api/sensor-data # Data API

/components
  ├── sidebar.tsx     # Navigation
  ├── sensor-chart.tsx # Chart component
  ├── status-card.tsx # Status cards
  └── /ui            # shadcn components
```

---

## 🔍 Key Files to Explore

### Data Generation
`app/api/sensor-data/route.ts` - Modify to change sensor data patterns

### Dashboard
`app/dashboard/page.tsx` - Main monitoring interface with charts

### Components
`components/sensor-chart.tsx` - Reusable chart component

### Styling
`app/globals.css` - Color scheme and theme variables

---

## 🛠️ Customization Tips

### Change Thresholds
Edit `app/api/sensor-data/route.ts`:
```typescript
const THRESHOLDS = {
  vibration: 0.3,    // Your value
  temperature: 45,   // Your value
  current: 3.0,      // Your value
};
```

### Modify Colors
Edit `tailwind.config.ts` for theme colors

### Add New Sensors
1. Update API route to generate new sensor data
2. Add chart in dashboard
3. Update types in `types/sensor.ts`

---

## 📱 Mobile Responsive

The entire application is fully responsive:
- Sidebar collapses on mobile
- Charts adapt to screen size
- Tables scroll horizontally
- Cards stack vertically

---

## 🎯 Next Steps

1. **Run the app**: `npm run dev`
2. **Explore all pages**: Dashboard → Alerts → Analysis → About
3. **Check the API**: http://localhost:3000/api/sensor-data
4. **Customize**: Modify thresholds, colors, or data patterns
5. **Build for production**: `npm run build`

---

## 📚 Documentation

- **README.md** - Complete project documentation
- **SETUP_INSTRUCTIONS.md** - Detailed setup guide
- **FILE_INVENTORY.md** - All files explained
- **QUICKSTART.md** - This file

---

## 🐛 Troubleshooting

**Port in use?**
```bash
npm run dev -- -p 3001
```

**Dependencies issue?**
```bash
rm -rf node_modules package-lock.json
npm install
```

**Build errors?**
```bash
rm -rf .next
npm run dev
```

---

## 🌟 Features Showcase

### Dashboard
- 3 real-time line charts
- Color-coded status cards
- Auto-refresh every 5 seconds
- Threshold indicators on charts

### Alerts
- Sortable alert table
- Severity badges (Critical/High/Medium)
- Alert statistics summary
- Detailed analysis section

### Analysis
- Overall health score (circular gauge)
- Tool life percentage
- Component health indicators
- AI-generated recommendations
- Predictive failure analysis

### About
- Sensor explanations
- Abnormality documentation
- Predictive maintenance overview
- System architecture details

---

**Ready to go! Run `npm run dev` and explore! 🎉**

