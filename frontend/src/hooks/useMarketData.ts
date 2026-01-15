import { useQuery } from '@tanstack/react-query';
import { Price, OrderBook, Candlestick, Trade } from '../types/market';
import { generateCandlestickData } from '../utils/mockData';
import { useMarketDataStore } from '../contexts/MarketDataStore';
import { useEffect, useState } from 'react';

// Using mock data for now - will switch to real API when backend is ready
const USE_MOCK_DATA = true;

export const useMarketData = (symbol: string) => {
  const { getPrice } = useMarketDataStore();
  const [price, setPrice] = useState<Price | undefined>(getPrice(symbol));

  // Subscribe to price updates
  useEffect(() => {
    const interval = setInterval(() => {
      const currentPrice = getPrice(symbol);
      if (currentPrice) {
        setPrice(currentPrice);
      }
    }, 500); // Check every 500ms

    return () => clearInterval(interval);
  }, [symbol, getPrice]);

  return {
    currentPrice: price?.price,
    price,
    isLoading: !price,
  };
};

export const useOrderBook = (symbol: string) => {
  const { getOrderBook } = useMarketDataStore();
  const [orderBook, setOrderBook] = useState<OrderBook | undefined>(getOrderBook(symbol));

  // Subscribe to order book updates
  useEffect(() => {
    const interval = setInterval(() => {
      const currentOrderBook = getOrderBook(symbol);
      if (currentOrderBook) {
        setOrderBook(currentOrderBook);
      }
    }, 1000); // Check every second

    return () => clearInterval(interval);
  }, [symbol, getOrderBook]);

  return {
    orderBook,
    isLoading: !orderBook,
  };
};

export const useCandlestickData = (symbol: string, interval: string) => {
  const candlestickQuery = useQuery({
    queryKey: ['market-data', 'candlestick', symbol, interval],
    queryFn: async (): Promise<Candlestick[]> => {
      console.log('Generating candlestick data for:', { symbol, interval, USE_MOCK_DATA });
      if (USE_MOCK_DATA) {
        const data = generateCandlestickData(symbol, 100);
        console.log('Generated candlestick data:', { count: data.length, first: data[0], last: data[data.length - 1] });
        // Ensure data is sorted by timestamp (oldest to newest)
        const sortedData = data.sort((a, b) => a.timestamp - b.timestamp);
        return sortedData;
      }
      // TODO: Use real API
      // return marketDataService.getCandlestickData(symbol, interval);
      throw new Error('Not implemented');
    },
    staleTime: 5000, // Consider data fresh for 5 seconds
    retry: 1,
  });

  console.log('Candlestick query result:', {
    dataLength: candlestickQuery.data?.length,
    isLoading: candlestickQuery.isLoading,
    isError: candlestickQuery.isError,
    error: candlestickQuery.error,
  });

  return {
    data: candlestickQuery.data || [],
    isLoading: candlestickQuery.isLoading,
  };
};

export const useRecentTrades = (symbol: string) => {
  const { getTrades } = useMarketDataStore();
  const [trades, setTrades] = useState<Trade[]>(getTrades(symbol));

  // Subscribe to trades updates
  useEffect(() => {
    const interval = setInterval(() => {
      const currentTrades = getTrades(symbol);
      setTrades(currentTrades);
    }, 1000); // Check every second

    return () => clearInterval(interval);
  }, [symbol, getTrades]);

  return {
    trades,
    isLoading: false,
  };
};
