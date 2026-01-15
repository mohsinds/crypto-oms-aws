import { useMarketData } from '../../hooks/useMarketData';
import { formatPrice, formatPercent } from '../../utils/formatters';

interface PriceTickerProps {
  symbol: string;
}

export const PriceTicker: React.FC<PriceTickerProps> = ({ symbol }) => {
  const { price, isLoading } = useMarketData(symbol);

  if (isLoading || !price) {
    return (
      <div className="bg-gradient-to-br from-slate-900/80 via-slate-800/70 to-slate-900/80 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl shadow-black/50 p-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
        <div className="animate-pulse">
          <div className="h-8 bg-dark-800 rounded w-32"></div>
        </div>
      </div>
    );
  }

  const isPositive = price.change24h >= 0;

  return (
    <div className="bg-gradient-to-br from-slate-900/80 via-slate-800/70 to-slate-900/80 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl shadow-black/50 p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-white mb-1">{symbol}</h3>
          <p className="text-gray-400 text-sm">24h Change</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-white mb-1">
            {formatPrice(price.price)}
          </p>
          <p className={`text-lg font-semibold ${isPositive ? 'text-success' : 'text-danger'}`}>
            {isPositive ? '+' : ''}{formatPrice(price.change24h)} ({formatPercent(price.changePercent24h)})
          </p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-dark-700">
        <div>
          <p className="text-xs text-gray-400 mb-1">24h High</p>
          <p className="text-sm font-semibold text-white">{formatPrice(price.high24h)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">24h Low</p>
          <p className="text-sm font-semibold text-white">{formatPrice(price.low24h)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">24h Volume</p>
          <p className="text-sm font-semibold text-white">${(price.volume24h / 1_000_000).toFixed(2)}M</p>
        </div>
      </div>
    </div>
  );
};
