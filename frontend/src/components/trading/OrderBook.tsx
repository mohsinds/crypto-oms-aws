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
      <div className="bg-dark-900 rounded-lg shadow-lg p-6 border border-dark-700">
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
    <div className="bg-dark-900 rounded-lg shadow-lg p-6 border border-dark-700">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-white">Order Book</h2>
        <div className="text-right">
          <p className="text-xs text-gray-400">Spread</p>
          <p className="text-sm font-semibold text-warning">
            {formatPrice(spread)} ({spreadPercent.toFixed(4)}%)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Asks (Sell Orders) */}
        <div>
          <div className="flex justify-between text-xs font-semibold text-gray-400 mb-2 px-2">
            <span>Price</span>
            <span>Quantity</span>
          </div>
          <div className="space-y-0.5 max-h-64 overflow-y-auto">
            {orderBook.asks.slice(0, 10).map((ask, index) => (
              <div
                key={`ask-${index}`}
                className="flex justify-between px-2 py-1 hover:bg-dark-800 rounded text-sm"
              >
                <span className="text-danger font-mono">{formatPrice(ask.price)}</span>
                <span className="text-gray-300 font-mono">{formatQuantity(ask.quantity)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bids (Buy Orders) */}
        <div>
          <div className="flex justify-between text-xs font-semibold text-gray-400 mb-2 px-2">
            <span>Price</span>
            <span>Quantity</span>
          </div>
          <div className="space-y-0.5 max-h-64 overflow-y-auto">
            {orderBook.bids.slice(0, 10).map((bid, index) => (
              <div
                key={`bid-${index}`}
                className="flex justify-between px-2 py-1 hover:bg-dark-800 rounded text-sm"
              >
                <span className="text-success font-mono">{formatPrice(bid.price)}</span>
                <span className="text-gray-300 font-mono">{formatQuantity(bid.quantity)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
