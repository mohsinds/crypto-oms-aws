import { useState } from 'react';
import { useOrderHistory } from '../../hooks/useOrders';
import { formatPrice, formatQuantity, formatDate } from '../../utils/formatters';
import { ORDER_STATUS_COLORS, SIDE_COLORS } from '../../utils/constants';

export const OrderHistory: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'filled' | 'cancelled' | 'rejected'>('all');
  const { orders } = useOrderHistory(filter);

  return (
    <div className="bg-gradient-to-br from-slate-900/80 via-slate-800/70 to-slate-900/80 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl shadow-black/50 p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-white">Order History</h2>
        
        {/* Filter Tabs */}
        <div className="flex gap-2">
          {(['all', 'filled', 'cancelled', 'rejected'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                filter === f
                  ? f === 'filled' ? 'bg-success text-white' :
                    f === 'cancelled' ? 'bg-warning text-white' :
                    f === 'rejected' ? 'bg-danger text-white' :
                    'bg-primary-600 text-white'
                  : 'bg-dark-800 text-gray-400 hover:bg-dark-700'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {orders.length === 0 ? (
        <p className="text-gray-400 text-center py-8">No orders found</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-700">
                <th className="text-left py-3 px-2 text-sm font-semibold text-gray-400">Time</th>
                <th className="text-left py-3 px-2 text-sm font-semibold text-gray-400">Symbol</th>
                <th className="text-left py-3 px-2 text-sm font-semibold text-gray-400">Side</th>
                <th className="text-left py-3 px-2 text-sm font-semibold text-gray-400">Type</th>
                <th className="text-right py-3 px-2 text-sm font-semibold text-gray-400">Quantity</th>
                <th className="text-right py-3 px-2 text-sm font-semibold text-gray-400">Price</th>
                <th className="text-right py-3 px-2 text-sm font-semibold text-gray-400">Filled</th>
                <th className="text-right py-3 px-2 text-sm font-semibold text-gray-400">Avg Fill</th>
                <th className="text-left py-3 px-2 text-sm font-semibold text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.orderId} className="border-b border-dark-800 hover:bg-dark-800 transition-colors">
                  <td className="py-3 px-2 text-sm text-gray-300">{formatDate(order.createdAt)}</td>
                  <td className="py-3 px-2 text-white font-medium">{order.symbol}</td>
                  <td className={`py-3 px-2 font-semibold ${SIDE_COLORS[order.side]}`}>
                    {order.side}
                  </td>
                  <td className="py-3 px-2 text-gray-300">{order.orderType}</td>
                  <td className="text-right py-3 px-2 text-white">{formatQuantity(order.quantity)}</td>
                  <td className="text-right py-3 px-2 text-white">
                    {order.price ? formatPrice(order.price) : 'Market'}
                  </td>
                  <td className="text-right py-3 px-2 text-gray-300">
                    {formatQuantity(order.filledQuantity)}
                  </td>
                  <td className="text-right py-3 px-2 text-gray-300">
                    {order.avgFillPrice ? formatPrice(order.avgFillPrice) : '-'}
                  </td>
                  <td className="py-3 px-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${ORDER_STATUS_COLORS[order.status]}`}>
                      {order.status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
