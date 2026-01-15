import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { OrderStoreProvider } from './contexts/OrderStore';
import { MarketDataStoreProvider } from './contexts/MarketDataStore';
import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <MarketDataStoreProvider>
          <OrderStoreProvider>
            <DashboardLayout />
          </OrderStoreProvider>
        </MarketDataStoreProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
