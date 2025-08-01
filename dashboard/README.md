# Airport Flight Data Dashboard

A modern, real-time web dashboard for monitoring airport flight data, built with Next.js 14, TypeScript, and React.

## Features

- 📊 **Real-time Flight Monitoring** - Live updates via WebSocket and SSE
- 📈 **Historical Data Visualization** - Interactive charts for flight trends
- ✈️ **Airport Comparison** - Compare performance across multiple airports
- 🎯 **ML Predictions** - Delay predictions and risk assessments
- 📍 **Live Traffic Map** - Visual representation of current flights
- 🔔 **Smart Notifications** - Real-time alerts for delays and cancellations
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile
- 🌙 **Dark Mode** - Easy on the eyes during extended use

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **State Management**: React Context + Hooks
- **Real-time**: Socket.io Client, EventSource
- **API Client**: Native fetch with SWR
- **UI Components**: Custom components with Radix UI primitives

## Getting Started

### Prerequisites

- Node.js 18+ installed
- API server running at http://localhost:3001
- Valid API authentication token

### Installation

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Edit .env.local with your API URL
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v2
```

### Development

```bash
# Start development server
npm run dev

# Dashboard will be available at http://localhost:3000
```

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

## Project Structure

```
dashboard/
├── src/
│   ├── app/                    # Next.js app router pages
│   │   ├── page.tsx           # Home/Overview page
│   │   ├── live-traffic/      # Real-time flight tracking
│   │   ├── historical/        # Historical data analysis
│   │   ├── comparison/        # Airport comparison
│   │   ├── metrics/          # Performance metrics
│   │   └── layout.tsx        # Root layout with navigation
│   ├── components/            # React components
│   │   ├── Navigation.tsx    # Main navigation
│   │   ├── RealtimeNotifications.tsx
│   │   ├── charts/          # Chart components
│   │   ├── flights/         # Flight-related components
│   │   └── ui/              # Base UI components
│   ├── hooks/                # Custom React hooks
│   │   ├── useRealtimeUpdates.ts
│   │   └── useSSE.ts
│   ├── services/             # API and data services
│   │   └── api.ts           # API client
│   ├── providers/            # Context providers
│   │   └── WebSocketProvider.tsx
│   └── types/               # TypeScript definitions
│       └── index.ts
├── public/                   # Static assets
├── tests/                   # Test files
└── package.json
```

## Available Pages

### 1. Overview Dashboard (`/`)
- System-wide statistics
- Recent flights summary
- Active alerts and notifications
- Quick links to other sections

### 2. Live Traffic (`/live-traffic`)
- Real-time flight map
- Live departure/arrival boards
- Flight status updates
- Gate and terminal information

### 3. Historical Analysis (`/historical`)
- Flight volume trends
- Delay patterns over time
- Airline performance comparison
- Seasonal analysis

### 4. Airport Comparison (`/comparison`)
- Side-by-side airport metrics
- Performance rankings
- Traffic volume comparison
- Delay rate analysis

### 5. Metrics Dashboard (`/metrics`)
- ML model performance
- Prediction accuracy
- System performance metrics
- API usage statistics

## Key Components

### Real-time Updates

The dashboard uses multiple methods for real-time data:

```typescript
// WebSocket for instant updates
const socket = useWebSocket();
socket.on('flight:update', handleFlightUpdate);

// Server-Sent Events for status changes
const sse = useSSE('/api/v2/sse/flights');
sse.addEventListener('delay-alert', handleDelayAlert);
```

### Chart Components

Interactive charts using Recharts:

- `FlightVolumeChart` - Daily/hourly flight volumes
- `FlightDelayChart` - Delay distribution and trends
- `AirlinePerformanceChart` - Airline comparison
- `HourlyDistributionChart` - Traffic patterns by hour

### Flight Components

- `FlightCard` - Individual flight information display
- `FlightStatus` - Status badge with real-time updates
- `LiveFlightsDisplay` - Scrolling list of current flights

## Configuration

### Environment Variables

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v2

# WebSocket Configuration
NEXT_PUBLIC_WS_URL=ws://localhost:3001

# Feature Flags
NEXT_PUBLIC_ENABLE_PREDICTIONS=true
NEXT_PUBLIC_ENABLE_PATTERNS=true
NEXT_PUBLIC_ENABLE_EXPORT=true

# Map Configuration (optional)
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token
```

### Theme Customization

Edit `tailwind.config.ts` to customize colors and theme:

```javascript
theme: {
  extend: {
    colors: {
      primary: {...},
      secondary: {...},
      accent: {...}
    }
  }
}
```

## API Integration

The dashboard integrates with the Flight Data API v2:

```typescript
// Example API usage
import { api } from '@/services/api';

// Get flights
const flights = await api.flights.list({ airport: 'SFO' });

// Get predictions
const prediction = await api.predictions.delay(flightData);

// Subscribe to updates
api.websocket.subscribeAirport(['SFO', 'LAX']);
```

## Testing

```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e

# Generate coverage report
npm run test:coverage
```

## Performance Optimization

- **Code Splitting**: Automatic with Next.js App Router
- **Image Optimization**: Using Next.js Image component
- **Data Caching**: SWR for intelligent data fetching
- **Lazy Loading**: Components loaded on demand
- **Memoization**: React.memo for expensive components

## Deployment

### Docker

```bash
# Build Docker image
docker build -t flight-dashboard .

# Run container
docker run -p 3000:3000 flight-dashboard
```

### Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Traditional Hosting

```bash
# Build static export
npm run build

# Serve the out/ directory
npx serve out
```

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Check CORS settings on API server
   - Verify WebSocket URL in environment variables
   - Check for proxy/firewall blocking WebSocket

2. **No Data Showing**
   - Verify API server is running
   - Check authentication token
   - Look for errors in browser console

3. **Charts Not Rendering**
   - Clear browser cache
   - Check for data format issues
   - Verify Recharts is properly installed

### Debug Mode

Enable debug mode for detailed logging:

```bash
# In .env.local
NEXT_PUBLIC_DEBUG=true
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add/update tests
5. Submit a pull request

### Code Style

- Follow existing TypeScript patterns
- Use functional components with hooks
- Implement proper error boundaries
- Add JSDoc comments for complex functions
- Follow accessibility best practices

## Future Enhancements

- [ ] Mobile app with React Native
- [ ] Advanced filtering and search
- [ ] Custom alert configuration
- [ ] Data export functionality
- [ ] Multi-language support
- [ ] Offline mode with service workers
- [ ] Advanced map visualizations
- [ ] Voice notifications

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- GitHub Issues: [Report a bug](https://github.com/czhaoca/airport-flight-data-collector/issues)
- Documentation: [Full docs](../docs/README.md)
- API Reference: [API docs](../api/v2/README.md)