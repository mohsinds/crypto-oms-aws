import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi } from 'lightweight-charts';
import { useCandlestickData } from '../../hooks/useMarketData';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface CandlestickChartProps {
  symbol: string;
  interval: '1m' | '5m' | '15m' | '1h' | '1d';
}

export const CandlestickChart: React.FC<CandlestickChartProps> = ({ symbol, interval }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  
  const { data, isLoading } = useCandlestickData(symbol, interval);
  const [isChartReady, setIsChartReady] = useState(false);

  useEffect(() => {
    if (!chartContainerRef.current) {
      return;
    }

    const container = chartContainerRef.current;
    let chart: IChartApi | null = null;
    let timeoutId: NodeJS.Timeout | null = null;
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
            time: timeInSeconds, // Unix timestamp in seconds as number
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

  // Debug logging
  useEffect(() => {
    console.log('Chart state:', {
      isLoading,
      isChartReady,
      dataLength: data?.length,
      hasChart: !!chartRef.current,
      hasSeries: !!candlestickSeriesRef.current,
    });
  }, [isLoading, isChartReady, data]);

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
