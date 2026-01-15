export const SYMBOLS = ['BTC/USD', 'ETH/USD', 'SOL/USD', 'BNB/USD', 'ADA/USD'] as const;

export const CHART_INTERVALS = ['1m', '5m', '15m', '1h', '1d'] as const;

export const ORDER_STATUS_COLORS = {
  NEW: 'bg-gray-100 text-gray-800',
  ACCEPTED: 'bg-blue-100 text-blue-800',
  PARTIALLY_FILLED: 'bg-yellow-100 text-yellow-800',
  FILLED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
  REJECTED: 'bg-red-100 text-red-800',
  SETTLED: 'bg-purple-100 text-purple-800',
};

export const SIDE_COLORS = {
  BUY: 'text-green-600',
  SELL: 'text-red-600',
};
