import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi } from 'lightweight-charts';
import { useCandlestickData } from '../../hooks/useMarketData';
import { useMarketData } from '../../hooks/useMarketData';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { Candlestick } from '../../types/market';

interface CandlestickChartProps {
  symbol: string;
  interval: '1m' | '5m' | '15m' | '1h' | '1d';
}

export const CandlestickChart: React.FC<CandlestickChartProps> = ({ symbol, interval }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  
  const { data, isLoading } = useCandlestickData(symbol, interval);
  const { currentPrice } = useMarketData(symbol);
  const [isChartReady, setIsChartReady] = useState(false);
  const lastPriceUpdateRef = useRef<number>(0);
  const currentCandleRef = useRef<{ time: number; open: number; high: number; low: number; close: number } | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) {
      return;
    }

    const container = chartContainerRef.current;
    let chart: IChartApi | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let resizeHandler: (() => void) | null = null;

    // Wait for container to have a width
    const checkWidth = () => {
      const width = container.clientWidth;
      if (width === 0) {
        // Retry after a short delay if width is 0
        timeoutId = setTimeout(checkWidth, 100);
        return;
      }

      const height = 500;

      console.log('Creating chart with dimensions:', { width, height });

      // Create chart with dark theme
      chart = createChart(container, {
        layout: {
          background: { type: ColorType.Solid, color: '#0a0e1a' },
          textColor: '#e0e0e0',
        },
        width: width,
        height: height,
        grid: {
          vertLines: { 
            color: '#2a2e3a',
            style: 1,
          },
          horzLines: { 
            color: '#2a2e3a',
            style: 1,
          },
        },
        timeScale: {
          timeVisible: true,
          secondsVisible: false,
          borderColor: '#4a4e5a',
        },
        rightPriceScale: {
          borderColor: '#4a4e5a',
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

      console.log('Chart and series created:', { chart: !!chart, series: !!candlestickSeries });

      chartRef.current = chart;
      candlestickSeriesRef.current = candlestickSeries;
      setIsChartReady(true);

      // Handle resize
      resizeHandler = () => {
        if (chartContainerRef.current && chartRef.current) {
          chartRef.current.applyOptions({
            width: chartContainerRef.current.clientWidth,
          });
        }
      };

      window.addEventListener('resize', resizeHandler);
    };

    checkWidth();

    // Cleanup function
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (resizeHandler) {
        window.removeEventListener('resize', resizeHandler);
      }
      if (chart) {
        chart.remove();
      }
      chartRef.current = null;
      candlestickSeriesRef.current = null;
      setIsChartReady(false);
    };
  }, []);

  // Reset current candle when interval or symbol changes
  useEffect(() => {
    currentCandleRef.current = null;
  }, [interval, symbol]);

  // Update chart data
  useEffect(() => {
    console.log('Chart data effect triggered:', {
      hasSeries: !!candlestickSeriesRef.current,
      hasData: !!data,
      dataLength: data?.length,
      isChartReady,
      isLoading,
    });

    if (!candlestickSeriesRef.current || !data || data.length === 0 || !isChartReady) {
      if (isLoading) {
        console.log('Still loading data...');
      } else if (!data || data.length === 0) {
        console.warn('No data available for chart');
      } else if (!isChartReady) {
        console.log('Chart not ready yet');
      } else if (!candlestickSeriesRef.current) {
        console.warn('Candlestick series not initialized');
      }
      return;
    }

    try {
      // Convert data format for lightweight-charts
      // Lightweight Charts expects time as Unix timestamp (seconds) - must be a number
      const formattedData = data
        .slice() // Create a copy to avoid mutating original
        .map((candle) => {
          const timeInSeconds = Math.floor(candle.timestamp / 1000);
          return {
            time: timeInSeconds as any, // Unix timestamp in seconds as number
            open: Number(candle.open),
            high: Number(candle.high),
            low: Number(candle.low),
            close: Number(candle.close),
          };
        })
        // Sort by time to ensure chronological order (oldest to newest)
        .sort((a, b) => a.time - b.time)
        // Filter out any invalid data points
        .filter((point) => 
          point.time > 0 && 
          !isNaN(point.open) && 
          !isNaN(point.high) && 
          !isNaN(point.low) && 
          !isNaN(point.close) &&
          point.high >= point.low &&
          point.high >= point.open &&
          point.high >= point.close &&
          point.low <= point.open &&
          point.low <= point.close
        );

      console.log('Formatted chart data:', {
        count: formattedData.length,
        first: formattedData[0],
        last: formattedData[formattedData.length - 1],
        sample: formattedData.slice(0, 3),
      });

      // Only set data if we have valid data points
      if (formattedData.length > 0) {
        console.log('Setting chart data, count:', formattedData.length);
        candlestickSeriesRef.current.setData(formattedData);
        console.log('Chart data set successfully');
        
        // Initialize current candle ref with the last candle
        const lastCandle = formattedData[formattedData.length - 1];
        currentCandleRef.current = {
          time: lastCandle.time,
          open: lastCandle.open,
          high: lastCandle.high,
          low: lastCandle.low,
          close: lastCandle.close,
        };
        
        // Auto-scale to fit data after a short delay to ensure chart is ready
        setTimeout(() => {
          if (chartRef.current) {
            try {
              chartRef.current.timeScale().fitContent();
              console.log('Chart content fitted');
            } catch (err) {
              console.error('Error fitting content:', err);
            }
          }
        }, 300);
      } else {
        console.warn('No valid formatted data to display');
      }
    } catch (error) {
      console.error('Error setting chart data:', error);
    }
  }, [data, symbol, interval, isChartReady]);

  // Calculate interval duration in seconds
  const getIntervalSeconds = (interval: string): number => {
    switch (interval) {
      case '1m': return 60;
      case '5m': return 300;
      case '15m': return 900;
      case '1h': return 3600;
      case '1d': return 86400;
      default: return 300;
    }
  };

  // Update latest price in real-time
  useEffect(() => {
    if (!candlestickSeriesRef.current || !currentPrice || !isChartReady || !data || data.length === 0) {
      return;
    }

    const now = Math.floor(Date.now() / 1000);
    const intervalSeconds = getIntervalSeconds(interval);
    const currentIntervalStart = Math.floor(now / intervalSeconds) * intervalSeconds;
    
    // Throttle updates to avoid too frequent updates (every 1 second)
    if (Date.now() - lastPriceUpdateRef.current < 1000) {
      return;
    }

    try {
      // If we have a current candle ref, check if it's still in the current interval
      if (currentCandleRef.current) {
        const candleIntervalStart = Math.floor((currentCandleRef.current.time as number) / intervalSeconds) * intervalSeconds;
        
        if (candleIntervalStart === currentIntervalStart) {
          // Still in the same interval - update the existing candle
          const updatedCandle = {
            time: currentIntervalStart as any,
            open: currentCandleRef.current.open, // Keep original open price
            high: Math.max(currentCandleRef.current.high, currentPrice),
            low: Math.min(currentCandleRef.current.low, currentPrice),
            close: currentPrice,
          };
          currentCandleRef.current = updatedCandle;
          candlestickSeriesRef.current.update(updatedCandle);
          lastPriceUpdateRef.current = Date.now();
          console.log('Updated current candle:', { price: currentPrice, interval: interval, time: currentIntervalStart });
          return;
        } else {
          // Interval changed - need to create a new candle
          // Use the current candle's close price as the new candle's open price
          const previousClose = currentCandleRef.current.close;
          const newCandle = {
            time: currentIntervalStart as any,
            open: previousClose, // Use previous candle's close as new open
            high: currentPrice,
            low: currentPrice,
            close: currentPrice,
          };
          currentCandleRef.current = newCandle;
          candlestickSeriesRef.current.update(newCandle);
          lastPriceUpdateRef.current = Date.now();
          console.log('Interval changed, created new candle:', { 
            price: currentPrice, 
            interval: interval, 
            time: currentIntervalStart,
            open: previousClose 
          });
          return;
        }
      }

      // No current candle - initialize from last candle in data
      const lastCandle = data[data.length - 1] as Candlestick;
      const newCandle = {
        time: currentIntervalStart as any,
        open: lastCandle.close, // Use previous candle's close as new open
        high: currentPrice,
        low: currentPrice,
        close: currentPrice,
      };
      currentCandleRef.current = newCandle;
      candlestickSeriesRef.current.update(newCandle);
      lastPriceUpdateRef.current = Date.now();
      console.log('Created new candle (initial):', { price: currentPrice, interval: interval, time: currentIntervalStart });
    } catch (error) {
      // Log errors for debugging
      console.error('Chart update error:', error);
    }
  }, [currentPrice, isChartReady, data, interval]);

  // Debug logging
  useEffect(() => {
    console.log('Chart state:', {
      isLoading,
      isChartReady,
      dataLength: data?.length,
      hasChart: !!chartRef.current,
      hasSeries: !!candlestickSeriesRef.current,
      currentPrice,
    });
  }, [isLoading, isChartReady, data, currentPrice]);

  return (
    <div className="w-full h-full relative">
      <div ref={chartContainerRef} className="w-full h-[500px] min-w-[600px]" />
      {isLoading && !isChartReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-dark-900 bg-opacity-75 rounded-lg z-10">
          <LoadingSpinner size="lg" />
        </div>
      )}
      {!isLoading && data && data.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-400 z-10">
          No chart data available
        </div>
      )}
      {!isLoading && isChartReady && data && data.length > 0 && !candlestickSeriesRef.current && (
        <div className="absolute inset-0 flex items-center justify-center text-yellow-400 z-10 text-sm">
          Chart series not initialized
        </div>
      )}
    </div>
  );
};
