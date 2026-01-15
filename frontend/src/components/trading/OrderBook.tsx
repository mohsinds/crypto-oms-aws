import { useOrderBook } from '../../hooks/useMarketData';
import { formatPrice, formatQuantity } from '../../utils/formatters';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface OrderBookProps {
  symbol: string;
}

export const OrderBook: React.FC<OrderBookProps> = ({ symbol }) => {
  const { orderBook, isLoading } = useOrderBook(symbol);

  if (isLoading || !orderBook) {
    return (
      <div className="bg-gradient-to-br from-slate-900/80 via-slate-800/70 to-slate-900/80 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl shadow-black/50 p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
        <h2 className="text-xl font-bold text-white mb-4">Order Book</h2>
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  const spread = orderBook.asks[0]?.price - orderBook.bids[0]?.price;
  const spreadPercent = orderBook.bids[0] ? (spread / orderBook.bids[0].price) * 100 : 0;

  return (
    <div className="bg-gradient-to-br from-slate-900/80 via-slate-800/70 to-slate-900/80 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl shadow-black/50 p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white">Order Book</h2>
        <div className="text-right">
          <p className="text-xs text-gray-400 mb-1">Spread</p>
          <p className="text-sm font-semibold text-warning">
            {formatPrice(spread)} ({spreadPercent.toFixed(4)}%)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Asks (Sell Orders) */}
        <div>
          <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-gray-400 mb-3 pb-2 border-b border-dark-700">
            <span className="text-danger">Price</span>
            <span className="text-gray-300 text-right">Quantity</span>
          </div>
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {orderBook.asks.slice(0, 15).map((ask, index) => (
              <div
                key={`ask-${index}`}
                className="grid grid-cols-2 gap-2 py-2 px-2 hover:bg-dark-800/50 rounded transition-colors"
              >
                <span className="text-danger font-mono text-sm font-semibold">{formatPrice(ask.price)}</span>
                <span className="text-gray-200 font-mono text-sm text-right">{formatQuantity(ask.quantity)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bids (Buy Orders) */}
        <div>
          <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-gray-400 mb-3 pb-2 border-b border-dark-700">
            <span className="text-success">Price</span>
            <span className="text-gray-300 text-right">Quantity</span>
          </div>
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {orderBook.bids.slice(0, 15).map((bid, index) => (
              <div
                key={`bid-${index}`}
                className="grid grid-cols-2 gap-2 py-2 px-2 hover:bg-dark-800/50 rounded transition-colors"
              >
                <span className="text-success font-mono text-sm font-semibold">{formatPrice(bid.price)}</span>
                <span className="text-gray-200 font-mono text-sm text-right">{formatQuantity(bid.quantity)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
