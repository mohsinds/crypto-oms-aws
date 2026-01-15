import { useActiveOrders } from '../../hooks/useOrders';
import { useOrderStore } from '../../contexts/OrderStore';
import { formatPrice, formatQuantity } from '../../utils/formatters';
import { ORDER_STATUS_COLORS, SIDE_COLORS } from '../../utils/constants';
import { Button } from '../common/Button';
import { Order } from '../../types/order';

const CancelOrderButton: React.FC<{ orderId: string }> = ({ orderId }) => {
  const { cancelOrder } = useOrderStore();

  const handleCancel = () => {
    cancelOrder(orderId);
  };

  return (
    <Button
      variant="danger"
      size="sm"
      onClick={handleCancel}
      className="text-xs"
    >
      Cancel
    </Button>
  );
};

export const ActiveOrders: React.FC = () => {
  const { orders } = useActiveOrders();

  return (
    <div className="bg-gradient-to-br from-slate-900/80 via-slate-800/70 to-slate-900/80 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl shadow-black/50 p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
      <h2 className="text-xl font-bold text-white mb-4">Active Orders</h2>
      
      {orders.length === 0 ? (
        <p className="text-gray-400 text-center py-8">No active orders</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-700">
                <th className="text-left py-3 px-2 text-sm font-semibold text-gray-400">Symbol</th>
                <th className="text-left py-3 px-2 text-sm font-semibold text-gray-400">Side</th>
                <th className="text-left py-3 px-2 text-sm font-semibold text-gray-400">Type</th>
                <th className="text-right py-3 px-2 text-sm font-semibold text-gray-400">Quantity</th>
                <th className="text-right py-3 px-2 text-sm font-semibold text-gray-400">Price</th>
                <th className="text-left py-3 px-2 text-sm font-semibold text-gray-400">Status</th>
                <th className="text-left py-3 px-2 text-sm font-semibold text-gray-400">Filled</th>
                <th className="text-left py-3 px-2 text-sm font-semibold text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order: Order) => (
                <tr key={order.orderId} className="border-b border-dark-800 hover:bg-dark-800 transition-colors">
                  <td className="py-3 px-2 text-white font-medium">{order.symbol}</td>
                  <td className={`py-3 px-2 font-semibold ${SIDE_COLORS[order.side]}`}>
                    {order.side}
                  </td>
                  <td className="py-3 px-2 text-gray-300">{order.orderType}</td>
                  <td className="text-right py-3 px-2 text-white">{formatQuantity(order.quantity)}</td>
                  <td className="text-right py-3 px-2 text-white">
                    {order.price ? formatPrice(order.price) : 'Market'}
                  </td>
                  <td className="py-3 px-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${ORDER_STATUS_COLORS[order.status]}`}>
                      {order.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-gray-300">
                    {order.filledQuantity > 0 ? (
                      <span>
                        {formatQuantity(order.filledQuantity)} / {formatQuantity(order.quantity)}
                      </span>
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </td>
                  <td className="py-3 px-2">
                    {order.status !== 'FILLED' && order.status !== 'CANCELLED' && (
                      <CancelOrderButton orderId={order.orderId} />
                    )}
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
