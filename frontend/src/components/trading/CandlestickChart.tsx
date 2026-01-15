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

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#ffffff' },
        textColor: '#1f2937',
      },
      width: chartContainerRef.current.clientWidth,
      height: 500,
      grid: {
        vertLines: { 
          color: '#e5e7eb',
          style: 1,
        },
        horzLines: { 
          color: '#e5e7eb',
          style: 1,
        },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: '#e5e7eb',
      },
      rightPriceScale: {
        borderColor: '#e5e7eb',
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
    setIsChartReady(true);

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
    if (!candlestickSeriesRef.current || !data || data.length === 0 || !isChartReady) {
      return;
    }

    try {
      // Convert data format for lightweight-charts
      // Lightweight Charts expects time as Unix timestamp (seconds)
      const formattedData = data
        .slice() // Create a copy to avoid mutating original
        .map((candle) => {
          const timeInSeconds = Math.floor(candle.timestamp / 1000);
          return {
            time: timeInSeconds as any, // Unix timestamp in seconds
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
          };
        })
        // Sort by time to ensure chronological order (oldest to newest)
        .sort((a, b) => {
          const timeA = a.time as number;
          const timeB = b.time as number;
          return timeA - timeB;
        });

      // Only set data if we have valid data points
      if (formattedData.length > 0) {
        candlestickSeriesRef.current.setData(formattedData);
        
        // Auto-scale to fit data
        if (chartRef.current) {
          chartRef.current.timeScale().fitContent();
        }
      }
    } catch (error) {
      console.error('Error setting chart data:', error);
    }
  }, [data, symbol, interval, isChartReady]);

  // Update latest price in real-time (simulate)
  // DISABLED for dummy data - will enable when real WebSocket data is available
  // useEffect(() => {
  //   if (candlestickSeriesRef.current && currentPrice && isChartReady && data && data.length > 0) {
  //     const lastCandle = data[data.length - 1] as Candlestick;
  //     const lastCandleTime = Math.floor(lastCandle.timestamp / 1000);
  //     const now = Math.floor(Date.now() / 1000);
  //     
  //     // Only update if the new time is strictly after the last candle time
  //     // Throttle updates to avoid too frequent updates
  //     if (now > lastCandleTime && Date.now() - lastPriceUpdateRef.current > 2000) {
  //       try {
  //         candlestickSeriesRef.current.update({
  //           time: now as any,
  //           open: lastCandle.close,
  //           high: Math.max(lastCandle.close, currentPrice),
  //           low: Math.min(lastCandle.close, currentPrice),
  //           close: currentPrice,
  //         });
  //         lastPriceUpdateRef.current = Date.now();
  //       } catch (error) {
  //         // Silently handle update errors (chart might not be ready)
  //         console.debug('Chart update skipped:', error);
  //       }
  //     }
  //   }
  // }, [currentPrice, isChartReady, data]);

  return (
    <div className="w-full h-full relative">
      <div ref={chartContainerRef} className="w-full h-[500px]" />
      {isLoading && !isChartReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
          <LoadingSpinner size="lg" />
        </div>
      )}
    </div>
  );
};
