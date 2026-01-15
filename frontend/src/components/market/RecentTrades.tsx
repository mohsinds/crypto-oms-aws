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
      <div className="bg-dark-900 rounded-lg shadow-lg p-4 border border-dark-700">
        <h3 className="text-lg font-bold text-white mb-4">Recent Trades</h3>
        <div className="flex justify-center py-4">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-dark-900 rounded-lg shadow-lg p-4 border border-dark-700">
      <h3 className="text-lg font-bold text-white mb-4">Recent Trades</h3>
      <div className="space-y-1 max-h-64 overflow-y-auto">
        {trades.slice(0, 20).map((trade) => (
          <div
            key={trade.id}
            className="flex justify-between items-center py-2 px-2 hover:bg-dark-800 rounded text-sm"
          >
            <div className="flex items-center gap-2">
              <span className={`font-semibold ${trade.side === 'BUY' ? 'text-success' : 'text-danger'}`}>
                {trade.side}
              </span>
              <span className="text-gray-300 font-mono">{formatQuantity(trade.quantity)}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-white font-mono">{formatPrice(trade.price)}</span>
              <span className="text-xs text-gray-400">{formatRelativeTime(new Date(trade.timestamp))}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
