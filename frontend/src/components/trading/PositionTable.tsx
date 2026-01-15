import { formatPrice, formatQuantity, formatPercent } from '../../utils/formatters';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { useOrderStore } from '../../contexts/OrderStore';
import { useMarketDataStore } from '../../contexts/MarketDataStore';
import { useEffect, useState } from 'react';
import { Position } from '../../types/market';

export const PositionTable: React.FC = () => {
  const { positions } = useOrderStore();
  const { getPrice } = useMarketDataStore();
  const [updatedPositions, setUpdatedPositions] = useState<Position[]>(positions);

  // Update positions with current prices
  useEffect(() => {
    const updated = positions.map((pos) => {
      const currentPrice = getPrice(pos.symbol);
      if (currentPrice) {
        const unrealizedPnl = (currentPrice.price - pos.averageEntryPrice) * pos.quantity;
        return {
          ...pos,
          currentPrice: currentPrice.price,
          unrealizedPnl,
        };
      }
      return pos;
    });
    setUpdatedPositions(updated);
  }, [positions, getPrice]);

  return (
    <div className="glass-card rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-bold text-white mb-4">Positions</h2>
      
      {!updatedPositions || updatedPositions.length === 0 ? (
        <p className="text-gray-400 text-center py-8">No open positions</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-700">
                <th className="text-left py-3 px-2 text-sm font-semibold text-gray-400">Symbol</th>
                <th className="text-left py-3 px-2 text-sm font-semibold text-gray-400">Side</th>
                <th className="text-right py-3 px-2 text-sm font-semibold text-gray-400">Quantity</th>
                <th className="text-right py-3 px-2 text-sm font-semibold text-gray-400">Entry Price</th>
                <th className="text-right py-3 px-2 text-sm font-semibold text-gray-400">Current Price</th>
                <th className="text-right py-3 px-2 text-sm font-semibold text-gray-400">Unrealized P&L</th>
                <th className="text-right py-3 px-2 text-sm font-semibold text-gray-400">Realized P&L</th>
              </tr>
            </thead>
            <tbody>
              {updatedPositions.map((position: Position) => {
                const pnlPercent = ((position.currentPrice - position.averageEntryPrice) / position.averageEntryPrice) * 100;
                return (
                  <tr key={position.symbol} className="border-b border-dark-800 hover:bg-dark-800 transition-colors">
                    <td className="py-3 px-2 text-white font-medium">{position.symbol}</td>
                    <td className={`py-3 px-2 font-semibold ${
                      position.side === 'LONG' ? 'text-success' : 'text-danger'
                    }`}>
                      {position.side}
                    </td>
                    <td className="text-right py-3 px-2 text-white">{formatQuantity(position.quantity)}</td>
                    <td className="text-right py-3 px-2 text-gray-300">{formatPrice(position.averageEntryPrice)}</td>
                    <td className="text-right py-3 px-2 text-white">{formatPrice(position.currentPrice)}</td>
                    <td className={`text-right py-3 px-2 font-semibold ${
                      position.unrealizedPnl >= 0 ? 'text-success' : 'text-danger'
                    }`}>
                      {formatPrice(position.unrealizedPnl)} ({formatPercent(pnlPercent)})
                    </td>
                    <td className={`text-right py-3 px-2 font-semibold ${
                      position.realizedPnl >= 0 ? 'text-success' : 'text-danger'
                    }`}>
                      {formatPrice(position.realizedPnl)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
