import { SYMBOLS } from '../../utils/constants';

interface HeaderProps {
  selectedSymbol: string;
  onSymbolChange: (symbol: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ selectedSymbol, onSymbolChange }) => {
  return (
    <header className="bg-dark-900 border-b border-dark-700 shadow-lg">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-2xl font-bold text-white">Crypto OMS</h1>
            <nav className="flex gap-4">
              {SYMBOLS.map((symbol) => (
                <button
                  key={symbol}
                  onClick={() => onSymbolChange(symbol)}
                  className={`px-4 py-2 rounded-md font-medium transition-colors ${
                    selectedSymbol === symbol
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-dark-800'
                  }`}
                >
                  {symbol}
                </button>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-gray-400">Balance</p>
              <p className="text-lg font-bold text-white">$100,000.00</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center">
              <span className="text-white font-semibold">U</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
