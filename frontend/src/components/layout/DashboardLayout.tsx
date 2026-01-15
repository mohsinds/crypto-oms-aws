import { useState } from 'react';
import { CandlestickChart } from '../trading/CandlestickChart';
import { OrderEntryForm } from '../trading/OrderEntryForm';
import { ActiveOrders } from '../trading/ActiveOrders';
import { OrderHistory } from '../trading/OrderHistory';
import { OrderBook } from '../trading/OrderBook';
import { PriceTicker } from '../market/PriceTicker';
import { PositionTable } from '../trading/PositionTable';
import { RecentTrades } from '../market/RecentTrades';
import { Header } from './Header';
import { useOrderMonitoring } from '../../hooks/useOrderMonitoring';

export const DashboardLayout: React.FC = () => {
  const [selectedSymbol, setSelectedSymbol] = useState('BTC/USD');
  const [chartInterval, setChartInterval] = useState<'1m' | '5m' | '15m' | '1h' | '1d'>('5m');
  
  // Initialize order monitoring (WebSocket connection)
  useOrderMonitoring();

  return (
    <div className="min-h-screen bg-dark-950">
      {/* Header */}
      <Header selectedSymbol={selectedSymbol} onSymbolChange={setSelectedSymbol} />
      
      {/* Main Content */}
      <div className="container mx-auto px-6 py-6">
        {/* Price Ticker */}
        <div className="mb-6">
          <PriceTicker symbol={selectedSymbol} />
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Left Column: Chart */}
          <div className="col-span-8 space-y-6">
            {/* Candlestick Chart */}
            <div className="bg-gradient-to-br from-slate-900/80 via-slate-800/70 to-slate-900/80 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl shadow-black/50 p-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
              <div className="relative z-10">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-white">{selectedSymbol} Chart</h2>
                  <div className="flex gap-2">
                    {(['1m', '5m', '15m', '1h', '1d'] as const).map((interval) => (
                      <button
                        key={interval}
                        onClick={() => setChartInterval(interval)}
                        className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                          chartInterval === interval
                            ? 'bg-primary-600 text-white'
                            : 'bg-dark-800 text-gray-400 hover:bg-dark-700 hover:text-white'
                        }`}
                      >
                        {interval}
                      </button>
                    ))}
                  </div>
                </div>
                <CandlestickChart symbol={selectedSymbol} interval={chartInterval} />
              </div>
            </div>
          </div>
          
          {/* Right Column: Trading Panel */}
          <div className="col-span-4 space-y-6">
            {/* Order Entry Form */}
            <OrderEntryForm />
          </div>
        </div>


        {/* Bottom Section: Position Table */}
        <div className="mt-6">
          <PositionTable />
        </div>

        {/* Active Orders - Full Width */}
        <div className="mt-6">
          <ActiveOrders />
        </div>

        {/* Order Book and Recent Trades - 50/50 */}
        <div className="grid grid-cols-2 gap-6 mt-6">
          <OrderBook symbol={selectedSymbol} />
          <RecentTrades symbol={selectedSymbol} />
        </div>

        {/* Bottom Section: Order History */}
        <div className="mt-6">
          <OrderHistory />
        </div>

      </div>
    </div>
  );
};
