import { Order, OrderSide, OrderType, OrderStatus } from '../types/order';
import { Candlestick, Price, OrderBook, Trade, Position } from '../types/market';

// Generate dummy candlestick data
export const generateCandlestickData = (symbol: string, count: number = 100): Candlestick[] => {
  const data: Candlestick[] = [];
  const basePrice = symbol === 'BTC/USD' ? 45000 : symbol === 'ETH/USD' ? 2500 : 100;
  let currentPrice = basePrice;
  const now = Date.now();
  
  // Generate data going backwards from now, ensuring proper time sequence
  for (let i = count - 1; i >= 0; i--) {
    // Calculate interval in milliseconds based on interval type
    // For 5m intervals, use 5 * 60 * 1000
    const intervalMs = 5 * 60 * 1000; // 5 minutes
    const timestamp = now - (i * intervalMs);
    const change = (Math.random() - 0.5) * basePrice * 0.02; // ±2% change
    const open = currentPrice;
    const close = open + change;
    const high = Math.max(open, close) + Math.random() * basePrice * 0.01;
    const low = Math.min(open, close) - Math.random() * basePrice * 0.01;
    const volume = Math.random() * 1000;
    
    data.push({
      timestamp,
      open,
      high,
      low,
      close,
      volume,
    });
    
    currentPrice = close;
  }
  
  // Ensure data is sorted by timestamp (oldest to newest)
  return data.sort((a, b) => a.timestamp - b.timestamp);
};

// Generate dummy orders
export const generateDummyOrders = (): Order[] => {
  const orders: Order[] = [];
  const symbols = ['BTC/USD', 'ETH/USD', 'SOL/USD'];
  const sides: OrderSide[] = [OrderSide.BUY, OrderSide.SELL];
  const statuses: OrderStatus[] = [
    OrderStatus.ACCEPTED,
    OrderStatus.PARTIALLY_FILLED,
    OrderStatus.FILLED,
    OrderStatus.CANCELLED,
    OrderStatus.REJECTED,
  ];
  
  for (let i = 0; i < 20; i++) {
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    const side = sides[Math.floor(Math.random() * sides.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const quantity = Math.random() * 10;
    const price = symbol === 'BTC/USD' ? 45000 + (Math.random() - 0.5) * 1000 : 
                  symbol === 'ETH/USD' ? 2500 + (Math.random() - 0.5) * 100 : 100;
    const filledQuantity = status === OrderStatus.FILLED ? quantity : 
                           status === OrderStatus.PARTIALLY_FILLED ? quantity * 0.5 : 0;
    
    orders.push({
      orderId: `order-${i + 1}`,
      symbol,
      side,
      orderType: Math.random() > 0.5 ? OrderType.LIMIT : OrderType.MARKET,
      quantity,
      price: Math.random() > 0.3 ? price : undefined,
      status,
      filledQuantity,
      avgFillPrice: filledQuantity > 0 ? price : undefined,
      createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
      rejectionReason: status === OrderStatus.REJECTED ? 'Insufficient margin' : undefined,
    });
  }
  
  return orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

// Generate dummy price data
export const generateDummyPrice = (symbol: string): Price => {
  const basePrice = symbol === 'BTC/USD' ? 45000 : symbol === 'ETH/USD' ? 2500 : 100;
  const change = (Math.random() - 0.5) * basePrice * 0.05;
  const price = basePrice + change;
  
  return {
    symbol,
    price,
    change24h: change,
    changePercent24h: (change / basePrice) * 100,
    volume24h: Math.random() * 1000000000,
    high24h: price * 1.02,
    low24h: price * 0.98,
    timestamp: Date.now(),
  };
};

// Generate dummy order book
export const generateDummyOrderBook = (symbol: string): OrderBook => {
  const basePrice = symbol === 'BTC/USD' ? 45000 : symbol === 'ETH/USD' ? 2500 : 100;
  const bids: { price: number; quantity: number }[] = [];
  const asks: { price: number; quantity: number }[] = [];
  
  for (let i = 0; i < 10; i++) {
    bids.push({
      price: basePrice - (i * 10),
      quantity: Math.random() * 5,
    });
    asks.push({
      price: basePrice + (i * 10),
      quantity: Math.random() * 5,
    });
  }
  
  return {
    symbol,
    bids: bids.sort((a, b) => b.price - a.price),
    asks: asks.sort((a, b) => a.price - b.price),
    timestamp: Date.now(),
  };
};

// Generate dummy trades
export const generateDummyTrades = (symbol: string, count: number = 20): Trade[] => {
  const trades: Trade[] = [];
  const basePrice = symbol === 'BTC/USD' ? 45000 : symbol === 'ETH/USD' ? 2500 : 100;
  
  for (let i = 0; i < count; i++) {
    trades.push({
      id: `trade-${i + 1}`,
      symbol,
      price: basePrice + (Math.random() - 0.5) * basePrice * 0.01,
      quantity: Math.random() * 2,
      side: Math.random() > 0.5 ? 'BUY' : 'SELL',
      timestamp: Date.now() - (i * 1000),
    });
  }
  
  return trades.sort((a, b) => b.timestamp - a.timestamp);
};

// Generate dummy positions
export const generateDummyPositions = (): Position[] => {
  const positions: Position[] = [];
  const symbols = ['BTC/USD', 'ETH/USD', 'SOL/USD'];
  
  symbols.forEach((symbol) => {
    if (Math.random() > 0.5) {
      const basePrice = symbol === 'BTC/USD' ? 45000 : symbol === 'ETH/USD' ? 2500 : 100;
      const quantity = Math.random() * 5;
      const averageEntryPrice = basePrice * (0.95 + Math.random() * 0.1);
      const currentPrice = basePrice;
      const unrealizedPnl = (currentPrice - averageEntryPrice) * quantity;
      
      positions.push({
        symbol,
        side: unrealizedPnl > 0 ? 'LONG' : 'SHORT',
        quantity,
        averageEntryPrice,
        currentPrice,
        unrealizedPnl,
        realizedPnl: Math.random() * 1000 - 500,
      });
    }
  });
  
  return positions;
};
