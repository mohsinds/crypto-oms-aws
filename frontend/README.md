# Crypto OMS Frontend - Trading Dashboard

React-based trading dashboard for the Crypto Order Management System with real-time candlestick charts, order management, and fintech-style UI.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- All dependencies will be installed via npm

### Installation

```bash
cd frontend
npm install
```

### Development

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Build for Production

```bash
npm run build
```

Output will be in the `dist/` directory.

## 📦 Features

- ✅ **Candlestick Chart** - Real-time price visualization using TradingView Lightweight Charts
- ✅ **Order Entry Form** - Buy/Sell order submission with validation
- ✅ **Active Orders Monitor** - Real-time tracking of pending orders
- ✅ **Order History** - Completed orders with filtering
- ✅ **Position Table** - Current positions with P&L tracking
- ✅ **Order Book** - Bid/Ask spread visualization
- ✅ **Recent Trades** - Live trade feed
- ✅ **Price Ticker** - 24h market statistics
- ✅ **Fintech Design** - Dark theme with crypto trading aesthetics

## 🎨 Design

The dashboard uses a **dark fintech/crypto trading style** with:
- Dark background (#0a0e1a)
- High contrast for readability
- Green/Red color coding for buy/sell
- Professional typography (Inter + JetBrains Mono)
- Responsive grid layout

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/        # React components
│   ├── hooks/            # Custom React hooks
│   ├── services/         # API & WebSocket services (prepared, using mocks)
│   ├── types/            # TypeScript type definitions
│   ├── utils/             # Utility functions
│   ├── App.tsx           # Main app component
│   └── main.tsx          # Entry point
├── package.json
├── vite.config.ts
└── tailwind.config.js
```

## 🔌 API Integration

**Current Status**: Using mock/dummy data for UI development

All API service methods are prepared in:
- `src/services/orderService.ts` - Order API calls
- `src/services/marketDataService.ts` - Market data API calls
- `src/services/websocket.ts` - WebSocket connection

**To enable real API calls**:
1. Set `USE_MOCK_DATA = false` in hook files
2. Uncomment API calls in service files
3. Configure `VITE_API_URL` and `VITE_WS_URL` in `.env`

## 🎯 Components

### Trading Components
- `CandlestickChart` - Price chart with multiple intervals
- `OrderEntryForm` - Order submission form
- `ActiveOrders` - Pending orders table
- `OrderHistory` - Completed orders with filters
- `PositionTable` - User positions and P&L

### Market Components
- `PriceTicker` - Current price and 24h stats
- `OrderBook` - Bid/Ask spread
- `RecentTrades` - Live trade feed

## 🛠️ Technology Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Lightweight Charts** - TradingView charts
- **React Query** - Data fetching
- **React Hook Form + Zod** - Form validation
- **Axios** - HTTP client (prepared)

## 📝 Environment Variables

Create `.env` file:

```bash
VITE_API_URL=http://localhost:5000
VITE_WS_URL=ws://localhost:5002/ws/market-data
```

## 🎨 Color Scheme

- **Background**: Dark (#0a0e1a, #111827)
- **Cards**: Dark gray (#1f2937)
- **Buy**: Green (#10b981)
- **Sell**: Red (#ef4444)
- **Primary**: Blue (#0ea5e9)
- **Text**: White/Gray shades

## 📱 Responsive Design

The dashboard is responsive:
- **Desktop**: Full 3-column layout
- **Tablet**: 2-column layout
- **Mobile**: Single column with stacked components

---

*For detailed development guide, see [docs/FRONTEND.md](../docs/FRONTEND.md)*
