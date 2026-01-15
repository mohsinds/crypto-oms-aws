# ⚛️ Frontend Development Guide - Crypto OMS Trading Dashboard

## Overview

This document provides comprehensive instructions for developing the React-based trading dashboard for the Crypto Order Management System. The frontend includes order submission, real-time order monitoring, candlestick charts, order history, and a complete fintech trading interface.

---

## 🎯 Frontend Requirements

### Core Features

1. **Trading Dashboard**
   - Real-time candlestick chart (price visualization)
   - Order entry form (buy/sell orders)
   - Active orders monitoring
   - Order fulfillment tracking
   - Completed orders history
   - Position tracking
   - Real-time price updates

2. **Order Management**
   - Submit new orders (MARKET/LIMIT)
   - Monitor pending orders
   - Track order execution
   - View order history
   - Cancel orders

3. **Market Data Visualization**
   - Candlestick chart (OHLCV data)
   - Order book visualization
   - Recent trades feed
   - Price indicators (MA, RSI, etc.)

---

## 📋 Technology Stack

- **Framework**: React 18
- **Build Tool**: Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Lightweight Charts (TradingView) or Chart.js
- **State Management**: React Query + Context API
- **WebSocket**: Native WebSocket API or Socket.io-client
- **HTTP Client**: Axios
- **Date/Time**: date-fns
- **Form Validation**: React Hook Form + Zod

---

## 🏗️ Project Structure

```
frontend/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
├── index.html
├── src/
│   ├── main.tsx                   # Application entry point
│   ├── App.tsx                    # Main app component
│   ├── App.css
│   │
│   ├── components/                # React Components
│   │   ├── layout/
│   │   │   ├── DashboardLayout.tsx
│   │   │   ├── Header.tsx
│   │   │   └── Sidebar.tsx
│   │   │
│   │   ├── trading/
│   │   │   ├── CandlestickChart.tsx      # Price chart component
│   │   │   ├── OrderEntryForm.tsx        # Order submission form
│   │   │   ├── OrderBook.tsx             # Order book display
│   │   │   ├── ActiveOrders.tsx          # Pending orders monitor
│   │   │   ├── OrderHistory.tsx          # Completed orders
│   │   │   └── PositionTable.tsx         # User positions
│   │   │
│   │   ├── market/
│   │   │   ├── PriceTicker.tsx           # Current price display
│   │   │   ├── RecentTrades.tsx          # Trade feed
│   │   │   └── MarketStats.tsx           # Market statistics
│   │   │
│   │   └── common/
│   │       ├── Button.tsx
│   │       ├── Input.tsx
│   │       ├── Select.tsx
│   │       ├── Modal.tsx
│   │       └── LoadingSpinner.tsx
│   │
│   ├── hooks/                     # Custom React Hooks
│   │   ├── useOrders.ts          # Order API hooks
│   │   ├── useWebSocket.ts       # WebSocket connection hook
│   │   ├── useMarketData.ts      # Market data hooks
│   │   ├── useCandlestickData.ts # Chart data hook
│   │   └── useOrderMonitoring.ts # Order status monitoring
│   │
│   ├── services/                  # API Services
│   │   ├── api.ts                # HTTP client (Axios)
│   │   ├── websocket.ts          # WebSocket client
│   │   ├── orderService.ts       # Order API calls
│   │   └── marketDataService.ts  # Market data API calls
│   │
│   ├── types/                     # TypeScript Types
│   │   ├── order.ts              # Order types
│   │   ├── market.ts             # Market data types
│   │   └── websocket.ts          # WebSocket message types
│   │
│   ├── utils/                     # Utility Functions
│   │   ├── formatters.ts         # Price, date formatting
│   │   ├── validators.ts         # Form validation
│   │   └── constants.ts          # App constants
│   │
│   └── contexts/                  # React Contexts
│       ├── OrderContext.tsx      # Order state management
│       └── MarketDataContext.tsx # Market data state
│
└── public/                        # Static Assets
    └── favicon.ico
```

---

## 🚀 Getting Started

### Step 1: Initialize React Project

```bash
cd frontend

# Create Vite + React + TypeScript project
npm create vite@latest . -- --template react-ts

# Install dependencies
npm install

# Install additional packages
npm install axios react-query @tanstack/react-query
npm install react-hook-form zod @hookform/resolvers
npm install lightweight-charts  # or chart.js chartjs-adapter-date-fns
npm install tailwindcss postcss autoprefixer
npm install date-fns
npm install clsx  # For conditional classes
```

### Step 2: Configure Tailwind CSS

```bash
# Initialize Tailwind
npx tailwindcss init -p

# Update tailwind.config.js
```

```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
        },
        success: '#10b981',
        danger: '#ef4444',
        warning: '#f59e0b',
      },
    },
  },
  plugins: [],
}
```

### Step 3: Configure Vite

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',  // Order Ingestion API
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:5002',  // Market Data WebSocket
        ws: true,
      },
    },
  },
})
```

---

## 📦 Component Development

### Component 1: Candlestick Chart

**Purpose**: Display real-time price data in candlestick format

**Technology**: TradingView Lightweight Charts

```typescript
// src/components/trading/CandlestickChart.tsx
import { useEffect, useRef } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi } from 'lightweight-charts';
import { useCandlestickData } from '../../hooks/useCandlestickData';

interface CandlestickChartProps {
  symbol: string;
  interval: '1m' | '5m' | '15m' | '1h' | '1d';
}

export const CandlestickChart: React.FC<CandlestickChartProps> = ({ symbol, interval }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  
  const { data, isLoading } = useCandlestickData(symbol, interval);
  const { latestPrice } = useMarketData(symbol);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#ffffff' },
        textColor: '#333',
      },
      width: chartContainerRef.current.clientWidth,
      height: 500,
      grid: {
        vertLines: { color: '#f0f0f0' },
        horzLines: { color: '#f0f0f0' },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
    });

    // Create candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // Update chart data
  useEffect(() => {
    if (candlestickSeriesRef.current && data) {
      // Convert data format for lightweight-charts
      const formattedData = data.map(candle => ({
        time: candle.timestamp / 1000 as any, // Unix timestamp
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      }));

      candlestickSeriesRef.current.setData(formattedData);
    }
  }, [data]);

  // Update latest price in real-time
  useEffect(() => {
    if (candlestickSeriesRef.current && latestPrice) {
      const now = Math.floor(Date.now() / 1000);
      candlestickSeriesRef.current.update({
        time: now as any,
        open: latestPrice,
        high: latestPrice,
        low: latestPrice,
        close: latestPrice,
      });
    }
  }, [latestPrice]);

  return (
    <div className="w-full h-full">
      <div ref={chartContainerRef} className="w-full h-[500px]" />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <LoadingSpinner />
        </div>
      )}
    </div>
  );
};
```

**Data Format Expected**:
```typescript
interface Candlestick {
  timestamp: number;  // Unix timestamp in milliseconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
```

---

### Component 2: Order Entry Form

**Purpose**: Submit new buy/sell orders

```typescript
// src/components/trading/OrderEntryForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useOrders } from '../../hooks/useOrders';
import { generateIdempotencyKey } from '../../utils/idempotency';

const orderSchema = z.object({
  symbol: z.string().min(1, 'Symbol is required'),
  side: z.enum(['BUY', 'SELL']),
  orderType: z.enum(['MARKET', 'LIMIT']),
  quantity: z.number().positive('Quantity must be positive'),
  price: z.number().positive('Price must be positive').optional(),
});

type OrderFormData = z.infer<typeof orderSchema>;

export const OrderEntryForm: React.FC = () => {
  const { placeOrder, isPlacing } = useOrders();
  const { currentPrice } = useMarketData('BTC/USD');

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      symbol: 'BTC/USD',
      side: 'BUY',
      orderType: 'LIMIT',
      quantity: 0,
      price: currentPrice,
    },
  });

  const orderType = watch('orderType');

  const onSubmit = async (data: OrderFormData) => {
    try {
      const idempotencyKey = generateIdempotencyKey();
      
      await placeOrder({
        ...data,
        idempotencyKey,
      });

      // Reset form on success
      reset();
      
      // Show success notification
      toast.success('Order placed successfully');
    } catch (error) {
      toast.error('Failed to place order');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold">Place Order</h2>

      {/* Symbol Selection */}
      <div>
        <label className="block text-sm font-medium mb-1">Symbol</label>
        <select
          {...register('symbol')}
          className="w-full px-3 py-2 border rounded-md"
        >
          <option value="BTC/USD">BTC/USD</option>
          <option value="ETH/USD">ETH/USD</option>
          <option value="SOL/USD">SOL/USD</option>
        </select>
      </div>

      {/* Buy/Sell Toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => register('side').onChange({ target: { value: 'BUY' } })}
          className={`flex-1 py-2 rounded-md font-medium ${
            watch('side') === 'BUY'
              ? 'bg-green-500 text-white'
              : 'bg-gray-200 text-gray-700'
          }`}
        >
          Buy
        </button>
        <button
          type="button"
          onClick={() => register('side').onChange({ target: { value: 'SELL' } })}
          className={`flex-1 py-2 rounded-md font-medium ${
            watch('side') === 'SELL'
              ? 'bg-red-500 text-white'
              : 'bg-gray-200 text-gray-700'
          }`}
        >
          Sell
        </button>
      </div>

      {/* Order Type */}
      <div>
        <label className="block text-sm font-medium mb-1">Order Type</label>
        <select
          {...register('orderType')}
          className="w-full px-3 py-2 border rounded-md"
        >
          <option value="LIMIT">Limit</option>
          <option value="MARKET">Market</option>
        </select>
      </div>

      {/* Quantity */}
      <div>
        <label className="block text-sm font-medium mb-1">Quantity</label>
        <input
          type="number"
          step="0.0001"
          {...register('quantity', { valueAsNumber: true })}
          className="w-full px-3 py-2 border rounded-md"
          placeholder="0.0000"
        />
        {errors.quantity && (
          <p className="text-red-500 text-sm mt-1">{errors.quantity.message}</p>
        )}
      </div>

      {/* Price (only for LIMIT orders) */}
      {orderType === 'LIMIT' && (
        <div>
          <label className="block text-sm font-medium mb-1">Price</label>
          <input
            type="number"
            step="0.01"
            {...register('price', { valueAsNumber: true })}
            className="w-full px-3 py-2 border rounded-md"
            placeholder={currentPrice?.toString()}
          />
          {errors.price && (
            <p className="text-red-500 text-sm mt-1">{errors.price.message}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Current Price: ${currentPrice?.toLocaleString()}
          </p>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isPlacing}
        className={`w-full py-3 rounded-md font-medium text-white ${
          watch('side') === 'BUY'
            ? 'bg-green-500 hover:bg-green-600'
            : 'bg-red-500 hover:bg-red-600'
        } disabled:opacity-50`}
      >
        {isPlacing ? 'Placing Order...' : `Place ${watch('side')} Order`}
      </button>
    </form>
  );
};
```

---

### Component 3: Active Orders Monitor

**Purpose**: Display and monitor pending orders in real-time

```typescript
// src/components/trading/ActiveOrders.tsx
import { useActiveOrders } from '../../hooks/useOrders';
import { formatPrice, formatQuantity } from '../../utils/formatters';
import { CancelOrderButton } from './CancelOrderButton';

export const ActiveOrders: React.FC = () => {
  const { orders, isLoading, refetch } = useActiveOrders();

  // Auto-refresh every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 5000);

    return () => clearInterval(interval);
  }, [refetch]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h2 className="text-xl font-bold mb-4">Active Orders</h2>
      
      {orders.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No active orders</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Symbol</th>
                <th className="text-left py-2">Side</th>
                <th className="text-left py-2">Type</th>
                <th className="text-right py-2">Quantity</th>
                <th className="text-right py-2">Price</th>
                <th className="text-left py-2">Status</th>
                <th className="text-left py-2">Filled</th>
                <th className="text-left py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.orderId} className="border-b hover:bg-gray-50">
                  <td className="py-2">{order.symbol}</td>
                  <td className={`py-2 font-medium ${
                    order.side === 'BUY' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {order.side}
                  </td>
                  <td className="py-2">{order.orderType}</td>
                  <td className="text-right py-2">{formatQuantity(order.quantity)}</td>
                  <td className="text-right py-2">
                    {order.price ? formatPrice(order.price) : 'Market'}
                  </td>
                  <td className="py-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      order.status === 'ACCEPTED' ? 'bg-blue-100 text-blue-800' :
                      order.status === 'PARTIALLY_FILLED' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="py-2">
                    {order.filledQuantity > 0 ? (
                      <span>
                        {formatQuantity(order.filledQuantity)} / {formatQuantity(order.quantity)}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="py-2">
                    {order.status !== 'FILLED' && order.status !== 'CANCELLED' && (
                      <CancelOrderButton orderId={order.orderId} onCancel={refetch} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
```

---

### Component 4: Order History

**Purpose**: Display completed orders (filled, cancelled, rejected)

```typescript
// src/components/trading/OrderHistory.tsx
import { useState } from 'react';
import { useOrderHistory } from '../../hooks/useOrders';
import { formatPrice, formatQuantity, formatDate } from '../../utils/formatters';

export const OrderHistory: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'filled' | 'cancelled' | 'rejected'>('all');
  const { orders, isLoading } = useOrderHistory(filter);

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Order History</h2>
        
        {/* Filter Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded text-sm ${
              filter === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('filled')}
            className={`px-3 py-1 rounded text-sm ${
              filter === 'filled' ? 'bg-green-500 text-white' : 'bg-gray-200'
            }`}
          >
            Filled
          </button>
          <button
            onClick={() => setFilter('cancelled')}
            className={`px-3 py-1 rounded text-sm ${
              filter === 'cancelled' ? 'bg-yellow-500 text-white' : 'bg-gray-200'
            }`}
          >
            Cancelled
          </button>
          <button
            onClick={() => setFilter('rejected')}
            className={`px-3 py-1 rounded text-sm ${
              filter === 'rejected' ? 'bg-red-500 text-white' : 'bg-gray-200'
            }`}
          >
            Rejected
          </button>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : orders.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No orders found</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Time</th>
                <th className="text-left py-2">Symbol</th>
                <th className="text-left py-2">Side</th>
                <th className="text-left py-2">Type</th>
                <th className="text-right py-2">Quantity</th>
                <th className="text-right py-2">Price</th>
                <th className="text-right py-2">Filled</th>
                <th className="text-right py-2">Avg Fill Price</th>
                <th className="text-left py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.orderId} className="border-b hover:bg-gray-50">
                  <td className="py-2 text-sm">{formatDate(order.createdAt)}</td>
                  <td className="py-2">{order.symbol}</td>
                  <td className={`py-2 font-medium ${
                    order.side === 'BUY' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {order.side}
                  </td>
                  <td className="py-2">{order.orderType}</td>
                  <td className="text-right py-2">{formatQuantity(order.quantity)}</td>
                  <td className="text-right py-2">
                    {order.price ? formatPrice(order.price) : 'Market'}
                  </td>
                  <td className="text-right py-2">
                    {formatQuantity(order.filledQuantity)}
                  </td>
                  <td className="text-right py-2">
                    {order.avgFillPrice ? formatPrice(order.avgFillPrice) : '-'}
                  </td>
                  <td className="py-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      order.status === 'FILLED' ? 'bg-green-100 text-green-800' :
                      order.status === 'CANCELLED' ? 'bg-yellow-100 text-yellow-800' :
                      order.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
```

---

## 🔌 API Integration

### Order Service Hook

```typescript
// src/hooks/useOrders.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { orderService } from '../services/orderService';
import { Order, PlaceOrderRequest } from '../types/order';

export const useOrders = () => {
  const queryClient = useQueryClient();

  // Place new order
  const placeOrderMutation = useMutation({
    mutationFn: (request: PlaceOrderRequest) => orderService.placeOrder(request),
    onSuccess: () => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['orders', 'active'] });
    },
  });

  // Get active orders
  const activeOrdersQuery = useQuery({
    queryKey: ['orders', 'active'],
    queryFn: () => orderService.getActiveOrders(),
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Get order history
  const orderHistoryQuery = useQuery({
    queryKey: ['orders', 'history'],
    queryFn: () => orderService.getOrderHistory(),
  });

  return {
    placeOrder: placeOrderMutation.mutate,
    isPlacing: placeOrderMutation.isPending,
    activeOrders: activeOrdersQuery.data || [],
    orderHistory: orderHistoryQuery.data || [],
    isLoading: activeOrdersQuery.isLoading || orderHistoryQuery.isLoading,
  };
};
```

### Order Service Implementation

```typescript
// src/services/orderService.ts
import axios from 'axios';
import { Order, PlaceOrderRequest } from '../types/order';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const orderService = {
  async placeOrder(request: PlaceOrderRequest): Promise<Order> {
    const response = await api.post('/api/orders', request.body, {
      headers: {
        'X-Idempotency-Key': request.idempotencyKey,
      },
    });
    return response.data;
  },

  async getActiveOrders(): Promise<Order[]> {
    const response = await api.get('/api/orders', {
      params: {
        status: 'active', // ACCEPTED, PARTIALLY_FILLED
      },
    });
    return response.data;
  },

  async getOrderHistory(): Promise<Order[]> {
    const response = await api.get('/api/orders', {
      params: {
        status: 'completed', // FILLED, CANCELLED, REJECTED
      },
    });
    return response.data;
  },

  async getOrder(orderId: string): Promise<Order> {
    const response = await api.get(`/api/orders/${orderId}`);
    return response.data;
  },

  async cancelOrder(orderId: string): Promise<void> {
    await api.delete(`/api/orders/${orderId}`);
  },
};
```

---

## 📡 WebSocket Integration

### WebSocket Hook for Real-Time Updates

```typescript
// src/hooks/useWebSocket.ts
import { useEffect, useRef, useState } from 'react';
import { useOrderMonitoring } from './useOrderMonitoring';

interface WebSocketMessage {
  type: 'ORDER_UPDATE' | 'ORDER_FILLED' | 'PRICE_UPDATE' | 'EXECUTION';
  data: any;
}

export const useWebSocket = (url: string) => {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const connect = () => {
      try {
        const ws = new WebSocket(url);

        ws.onopen = () => {
          console.log('WebSocket connected');
          setIsConnected(true);
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
        };

        ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            setLastMessage(message);
            
            // Handle different message types
            switch (message.type) {
              case 'ORDER_UPDATE':
                // Update order status
                break;
              case 'ORDER_FILLED':
                // Notify user of fill
                break;
              case 'PRICE_UPDATE':
                // Update price in chart
                break;
            }
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
        };

        ws.onclose = () => {
          console.log('WebSocket disconnected');
          setIsConnected(false);
          
          // Reconnect after 3 seconds
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 3000);
        };

        wsRef.current = ws;
      } catch (error) {
        console.error('Failed to create WebSocket:', error);
      }
    };

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [url]);

  const sendMessage = (message: any) => {
    if (wsRef.current && isConnected) {
      wsRef.current.send(JSON.stringify(message));
    }
  };

  return {
    isConnected,
    lastMessage,
    sendMessage,
  };
};
```

### Order Monitoring Hook

```typescript
// src/hooks/useOrderMonitoring.ts
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useWebSocket } from './useWebSocket';

export const useOrderMonitoring = () => {
  const queryClient = useQueryClient();
  const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:5002/ws/market-data';
  
  const { lastMessage, isConnected } = useWebSocket(wsUrl);

  useEffect(() => {
    if (lastMessage) {
      switch (lastMessage.type) {
        case 'ORDER_UPDATE':
          // Invalidate active orders query
          queryClient.invalidateQueries({ queryKey: ['orders', 'active'] });
          break;
          
        case 'ORDER_FILLED':
          // Invalidate both active and history
          queryClient.invalidateQueries({ queryKey: ['orders', 'active'] });
          queryClient.invalidateQueries({ queryKey: ['orders', 'history'] });
          
          // Show notification
          toast.success(`Order ${lastMessage.data.orderId} filled`);
          break;
      }
    }
  }, [lastMessage, queryClient]);

  return { isConnected };
};
```

---

## 🎨 Dashboard Layout

### Main Dashboard Component

```typescript
// src/components/layout/DashboardLayout.tsx
import { CandlestickChart } from '../trading/CandlestickChart';
import { OrderEntryForm } from '../trading/OrderEntryForm';
import { ActiveOrders } from '../trading/ActiveOrders';
import { OrderHistory } from '../trading/OrderHistory';
import { OrderBook } from '../trading/OrderBook';
import { PriceTicker } from '../market/PriceTicker';
import { PositionTable } from '../trading/PositionTable';

export const DashboardLayout: React.FC = () => {
  const [selectedSymbol, setSelectedSymbol] = useState('BTC/USD');
  const [chartInterval, setChartInterval] = useState<'1m' | '5m' | '15m' | '1h' | '1d'>('5m');

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <Header />
      
      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-12 gap-4">
          {/* Left Column: Chart and Order Book */}
          <div className="col-span-8 space-y-4">
            {/* Price Ticker */}
            <PriceTicker symbol={selectedSymbol} />
            
            {/* Candlestick Chart */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">{selectedSymbol} Chart</h2>
                <div className="flex gap-2">
                  {['1m', '5m', '15m', '1h', '1d'].map((interval) => (
                    <button
                      key={interval}
                      onClick={() => setChartInterval(interval as any)}
                      className={`px-3 py-1 rounded text-sm ${
                        chartInterval === interval
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200'
                      }`}
                    >
                      {interval}
                    </button>
                  ))}
                </div>
              </div>
              <CandlestickChart symbol={selectedSymbol} interval={chartInterval} />
            </div>
            
            {/* Order Book */}
            <OrderBook symbol={selectedSymbol} />
          </div>
          
          {/* Right Column: Trading Panel */}
          <div className="col-span-4 space-y-4">
            {/* Order Entry Form */}
            <OrderEntryForm />
            
            {/* Active Orders */}
            <ActiveOrders />
          </div>
        </div>
        
        {/* Bottom Section: Order History and Positions */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          <OrderHistory />
          <PositionTable />
        </div>
      </div>
    </div>
  );
};
```

---

## 🚀 Building and Deployment

### Build for Production

```bash
cd frontend

# Install dependencies
npm install

# Build for production
npm run build

# Output will be in dist/ directory
```

### Deploy to S3

```bash
# Upload to S3
aws s3 sync dist/ s3://crypto-oms-dev-frontend --delete

# Enable static website hosting
aws s3 website s3://crypto-oms-dev-frontend \
  --index-document index.html \
  --error-document index.html

# Get website URL
aws s3api get-bucket-website --bucket crypto-oms-dev-frontend
```

### Environment Variables

Create `.env.production`:
```bash
VITE_API_URL=https://your-alb-dns-name.us-east-1.elb.amazonaws.com
VITE_WS_URL=wss://your-alb-dns-name.us-east-1.elb.amazonaws.com/ws/market-data
```

---

## 📱 Responsive Design

The dashboard should be responsive:

```css
/* Mobile: Single column */
@media (max-width: 768px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
  
  .chart-container {
    height: 300px;
  }
}
```

---

## 📊 Component Details

### Candlestick Chart Component

**Technology**: TradingView Lightweight Charts  
**Purpose**: Display OHLCV (Open, High, Low, Close, Volume) data in real-time

**Features**:
- Real-time price updates via WebSocket
- Multiple time intervals (1m, 5m, 15m, 1h, 1d)
- Interactive zoom and pan
- Price crosshair tooltip
- Volume indicators
- Technical indicators (MA, RSI) - optional

**Data Flow**:
```
Market Data Service → Kafka (price updates) → WebSocket → Frontend → Chart Update
```

### Order Entry Form

**Features**:
- Symbol selection (BTC/USD, ETH/USD, etc.)
- Side selection (BUY/SELL) with visual indicators
- Order type (MARKET/LIMIT)
- Quantity input with validation
- Price input (for LIMIT orders)
- Current price display
- Order preview (estimated cost)
- Idempotency key generation

**Validation**:
- Quantity must be positive
- Price must be positive (for LIMIT)
- Symbol must be valid
- Balance checks (if integrated with wallet)

### Active Orders Monitor

**Features**:
- Real-time order status updates
- Filter by status (PENDING, ACCEPTED, PARTIALLY_FILLED)
- Sort by time, price, quantity
- Cancel order functionality
- Fill progress visualization
- Auto-refresh every 5 seconds

**Status Indicators**:
- 🟢 ACCEPTED - Order accepted, waiting for fill
- 🟡 PARTIALLY_FILLED - Order partially executed
- 🔴 REJECTED - Order rejected by risk engine
- ⚫ CANCELLED - Order cancelled by user
- ✅ FILLED - Order fully executed

### Order History

**Features**:
- Filter by status (FILLED, CANCELLED, REJECTED)
- Sort by time, price, quantity
- Search by order ID or symbol
- Export to CSV (optional)
- Pagination for large result sets

**Display Fields**:
- Timestamp
- Symbol
- Side (BUY/SELL)
- Order Type (MARKET/LIMIT)
- Quantity
- Price
- Filled Quantity
- Average Fill Price
- Status
- Rejection Reason (if rejected)

### Position Table

**Purpose**: Display user's current positions

**Features**:
- Current position per symbol
- Unrealized P&L
- Average entry price
- Real-time position updates
- Close position functionality

**Data Fields**:
- Symbol
- Side (LONG/SHORT)
- Quantity
- Average Entry Price
- Current Price
- Unrealized P&L
- Realized P&L

---

## 🔄 Real-Time Updates Flow

### WebSocket Connection

```typescript
// WebSocket connects to Market Data Service
ws://localhost:5002/ws/market-data

// Subscribe to channels
{
  "action": "subscribe",
  "channels": ["prices", "executions", "order-updates"]
}

// Receive updates
{
  "type": "ORDER_UPDATE",
  "data": {
    "orderId": "123",
    "status": "FILLED",
    "filledQuantity": 0.1,
    "fillPrice": 45000
  }
}
```

### Update Flow

1. **Order Placed** → Order Ingestion API → Kafka → Order Processor
2. **Order Processed** → Order Processor → Kafka (executions topic)
3. **Execution Event** → Market Data Service consumes
4. **Market Data Service** → WebSocket broadcast to all connected clients
5. **Frontend** → Updates Active Orders table
6. **Frontend** → Updates Order History
7. **Frontend** → Updates Position Table
8. **Frontend** → Shows notification toast

---

## 🎨 UI/UX Design

### Color Scheme

- **Buy Orders**: Green (#10b981)
- **Sell Orders**: Red (#ef4444)
- **Price Up**: Green (#10b981)
- **Price Down**: Red (#ef4444)
- **Neutral**: Gray (#6b7280)
- **Background**: White (#ffffff)
- **Cards**: Light Gray (#f9fafb)

### Typography

- **Headings**: Inter, sans-serif
- **Body**: Inter, sans-serif
- **Code**: JetBrains Mono, monospace

### Layout

```
┌─────────────────────────────────────────────────────────┐
│                      Header (Symbols, Balance)          │
├──────────────────────┬──────────────────────────────────┤
│                      │                                  │
│                      │      Order Entry Form            │
│   Candlestick Chart  │      (Buy/Sell Panel)            │
│                      │                                  │
│                      │      Active Orders               │
│                      │      (Real-time Monitor)         │
│                      │                                  │
├──────────────────────┴──────────────────────────────────┤
│              Order Book (Bid/Ask Spread)                │
├──────────────────────┬──────────────────────────────────┤
│   Order History      │      Position Table              │
│   (Completed Orders) │      (Current Positions)         │
└──────────────────────┴──────────────────────────────────┘
```

---

## 📱 Responsive Design

### Desktop (> 1024px)
- 3-column layout
- Full dashboard visible
- Side-by-side charts and forms

### Tablet (768px - 1024px)
- 2-column layout
- Stacked components
- Collapsible sidebar

### Mobile (< 768px)
- Single column layout
- Tabbed navigation
- Bottom sheet for order entry

---

## 🧪 Frontend Testing

### Component Testing

```bash
# Install testing dependencies
npm install --save-dev @testing-library/react @testing-library/jest-dom vitest

# Run tests
npm run test

# Run tests in watch mode
npm run test:watch
```

### E2E Testing

```bash
# Install Playwright
npm install --save-dev @playwright/test

# Run E2E tests
npx playwright test
```

---

## 🚀 Production Build

### Build Process

```bash
cd frontend

# Install dependencies
npm install

# Build for production
npm run build

# Output: dist/ directory
```

### Deployment to S3

```bash
# Sync to S3
aws s3 sync dist/ s3://crypto-oms-dev-frontend --delete

# Enable static website hosting
aws s3 website s3://crypto-oms-dev-frontend \
  --index-document index.html \
  --error-document index.html

# Set bucket policy for public read
aws s3api put-bucket-policy \
  --bucket crypto-oms-dev-frontend \
  --policy file://bucket-policy.json
```

### CloudFront CDN (Optional)

```bash
# Create CloudFront distribution for better performance
aws cloudfront create-distribution \
  --origin-domain-name crypto-oms-dev-frontend.s3.amazonaws.com
```

---

*Last Updated: January 2025*
