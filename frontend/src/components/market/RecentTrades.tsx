import { useRecentTrades } from '../../hooks/useMarketData';
import { formatPrice, formatQuantity, formatRelativeTime } from '../../utils/formatters';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface RecentTradesProps {
  symbol: string;
}

export const RecentTrades: React.FC<RecentTradesProps> = ({ symbol }) => {
  const { trades, isLoading } = useRecentTrades(symbol);

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-slate-900/80 via-slate-800/70 to-slate-900/80 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl shadow-black/50 p-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
        <h3 className="text-lg font-bold text-white mb-4">Recent Trades</h3>
        <div className="flex justify-center py-4">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-900/80 via-slate-800/70 to-slate-900/80 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl shadow-black/50 p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
      <h3 className="text-lg font-bold text-white mb-4">Recent Trades</h3>
      <div className="space-y-1 max-h-80 overflow-y-auto">
        {trades.slice(0, 20).map((trade) => (
          <div
            key={trade.id}
            className="grid grid-cols-4 gap-2 items-center py-2.5 px-3 hover:bg-dark-800/50 rounded transition-colors"
          >
            <span className={`font-semibold text-xs px-2 py-1 rounded text-center ${
              trade.side === 'BUY' 
                ? 'text-green-400 bg-green-900/30' 
                : 'text-red-400 bg-red-900/30'
            }`}>
              {trade.side}
            </span>
            <span className="text-gray-200 font-mono text-sm">{formatQuantity(trade.quantity)}</span>
            <span className="text-white font-mono text-sm font-semibold text-right">{formatPrice(trade.price)}</span>
            <span className="text-xs text-gray-400 font-mono text-right">{formatRelativeTime(new Date(trade.timestamp))}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
