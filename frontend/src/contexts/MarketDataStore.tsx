import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Price, OrderBook, Trade } from '../types/market';
import { generateDummyPrice, generateDummyOrderBook, generateDummyTrades } from '../utils/mockData';

interface MarketDataStoreContextType {
  prices: Map<string, Price>;
  orderBooks: Map<string, OrderBook>;
  trades: Map<string, Trade[]>;
  
  getPrice: (symbol: string) => Price | undefined;
  getOrderBook: (symbol: string) => OrderBook | undefined;
  getTrades: (symbol: string) => Trade[];
  
  updatePrice: (symbol: string, price: Price) => void;
  updateOrderBook: (symbol: string, orderBook: OrderBook) => void;
  addTrade: (symbol: string, trade: Trade) => void;
  
  initialize: () => void;
}

const MarketDataStoreContext = createContext<MarketDataStoreContextType | undefined>(undefined);

export const useMarketDataStore = () => {
  const context = useContext(MarketDataStoreContext);
  if (!context) {
    throw new Error('useMarketDataStore must be used within MarketDataStoreProvider');
  }
  return context;
};

export const MarketDataStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [prices, setPrices] = useState<Map<string, Price>>(new Map());
  const [orderBooks, setOrderBooks] = useState<Map<string, OrderBook>>(new Map());
  const [trades, setTrades] = useState<Map<string, Trade[]>>(new Map());
  const [initialized, setInitialized] = useState(false);
  const priceUpdateIntervalRef = useRef<NodeJS.Timeout>();

  // Initialize with dummy data
  useEffect(() => {
    if (!initialized) {
      initialize();
      setInitialized(true);
    }
  }, [initialized]);

  // Simulate random price updates
  useEffect(() => {
    if (!initialized) return;

    priceUpdateIntervalRef.current = setInterval(() => {
      setPrices((prevPrices) => {
        const newPrices = new Map(prevPrices);
        const symbols = ['BTC/USD', 'ETH/USD', 'SOL/USD', 'BNB/USD', 'ADA/USD'];
        
        symbols.forEach((symbol) => {
          const currentPrice = newPrices.get(symbol);
          if (currentPrice) {
            const basePrice = symbol === 'BTC/USD' ? 45000 : symbol === 'ETH/USD' ? 2500 : 100;
            // Random change between -0.5% and +0.5%
            const change = (Math.random() - 0.5) * basePrice * 0.005;
            const newPrice = Math.max(0.01, currentPrice.price + change); // Ensure price doesn't go negative
            const change24h = newPrice - basePrice;
            const changePercent24h = (change24h / basePrice) * 100;

            newPrices.set(symbol, {
              ...currentPrice,
              price: newPrice,
              change24h,
              changePercent24h,
              high24h: Math.max(currentPrice.high24h, newPrice),
              low24h: Math.min(currentPrice.low24h, newPrice),
              timestamp: Date.now(),
            });
          }
        });
        
        return newPrices;
      });
    }, 2000); // Update every 2 seconds

    return () => {
      if (priceUpdateIntervalRef.current) {
        clearInterval(priceUpdateIntervalRef.current);
      }
    };
  }, [initialized]);

  const initialize = useCallback(() => {
    const symbols = ['BTC/USD', 'ETH/USD', 'SOL/USD', 'BNB/USD', 'ADA/USD'];
    const initialPrices = new Map<string, Price>();
    const initialOrderBooks = new Map<string, OrderBook>();
    const initialTrades = new Map<string, Trade[]>();

    symbols.forEach((symbol) => {
      initialPrices.set(symbol, generateDummyPrice(symbol));
      initialOrderBooks.set(symbol, generateDummyOrderBook(symbol));
      initialTrades.set(symbol, generateDummyTrades(symbol, 20));
    });

    setPrices(initialPrices);
    setOrderBooks(initialOrderBooks);
    setTrades(initialTrades);
  }, []);

  const getPrice = useCallback((symbol: string) => {
    return prices.get(symbol);
  }, [prices]);

  const getOrderBook = useCallback((symbol: string) => {
    return orderBooks.get(symbol);
  }, [orderBooks]);

  const getTrades = useCallback((symbol: string) => {
    return trades.get(symbol) || [];
  }, [trades]);

  const updatePrice = useCallback((symbol: string, price: Price) => {
    setPrices((prev) => {
      const newMap = new Map(prev);
      newMap.set(symbol, price);
      return newMap;
    });
  }, []);

  const updateOrderBook = useCallback((symbol: string, orderBook: OrderBook) => {
    setOrderBooks((prev) => {
      const newMap = new Map(prev);
      newMap.set(symbol, orderBook);
      return newMap;
    });
  }, []);

  const addTrade = useCallback((symbol: string, trade: Trade) => {
    setTrades((prev) => {
      const newMap = new Map(prev);
      const existingTrades = newMap.get(symbol) || [];
      const newTrades = [trade, ...existingTrades].slice(0, 50); // Keep last 50 trades
      newMap.set(symbol, newTrades);
      return newMap;
    });
  }, []);

  return (
    <MarketDataStoreContext.Provider
      value={{
        prices,
        orderBooks,
        trades,
        getPrice,
        getOrderBook,
        getTrades,
        updatePrice,
        updateOrderBook,
        addTrade,
        initialize,
      }}
    >
      {children}
    </MarketDataStoreContext.Provider>
  );
};
