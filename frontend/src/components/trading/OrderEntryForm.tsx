import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useOrders } from '../../hooks/useOrders';
import { useMarketData } from '../../hooks/useMarketData';
import { generateIdempotencyKey } from '../../utils/idempotency';
import { OrderSide, OrderType } from '../../types/order';
import { Button } from '../common/Button';
import { useState, useEffect } from 'react';

const orderSchema = z.object({
  symbol: z.string().min(1, 'Symbol is required'),
  side: z.enum(['BUY', 'SELL']),
  orderType: z.enum(['MARKET', 'LIMIT']),
  quantity: z.number().positive('Quantity must be positive'),
  price: z.number().positive('Price must be positive').optional(),
}).refine((data) => {
  if (data.orderType === 'LIMIT' && !data.price) {
    return false;
  }
  return true;
}, {
  message: 'Price is required for LIMIT orders',
  path: ['price'],
});

type OrderFormData = z.infer<typeof orderSchema>;

export const OrderEntryForm: React.FC = () => {
  const { placeOrder, isPlacing } = useOrders();
  const [selectedSide, setSelectedSide] = useState<OrderSide>(OrderSide.BUY);
  const [priceInitialized, setPriceInitialized] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      symbol: 'BTC/USD',
      side: OrderSide.BUY,
      orderType: OrderType.LIMIT,
      quantity: 0,
      price: undefined,
    },
  });

  const orderType = watch('orderType');
  const side = watch('side');
  const formSymbol = watch('symbol') || 'BTC/USD';
  const formPrice = watch('price');
  
  // Get current price for selected symbol
  const { currentPrice } = useMarketData(formSymbol);

  // Set price only once when component mounts or symbol/orderType changes
  useEffect(() => {
    if (currentPrice && orderType === 'LIMIT' && !priceInitialized) {
      setValue('price', currentPrice, { shouldDirty: false, shouldValidate: false });
      setPriceInitialized(true);
    }
  }, [currentPrice, orderType, setValue, priceInitialized]);

  // Reset initialization flag when order type or symbol changes
  useEffect(() => {
    setPriceInitialized(false);
  }, [orderType, formSymbol]);

  // Handler for "Current Price" button
  const handleUseCurrentPrice = () => {
    if (currentPrice && orderType === 'LIMIT') {
      setValue('price', currentPrice, { shouldValidate: true });
    }
  };

  const onSubmit = async (data: OrderFormData) => {
    try {
      const idempotencyKey = generateIdempotencyKey();
      
      await placeOrder({
        ...data,
        idempotencyKey,
      });

      reset({
        symbol: data.symbol,
        side: data.side,
        orderType: data.orderType,
        quantity: 0,
        price: currentPrice,
      });
    } catch (error) {
      console.error('Failed to place order:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="glass-card rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-bold text-white mb-6">Place Order</h2>

      {/* Buy/Sell Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => {
            setValue('side', OrderSide.BUY);
            setSelectedSide(OrderSide.BUY);
          }}
          className={`flex-1 py-3 rounded-md font-semibold transition-colors ${
            side === OrderSide.BUY
              ? 'bg-success text-white shadow-lg'
              : 'bg-dark-800 text-gray-400 hover:bg-dark-700'
          }`}
        >
          Buy
        </button>
        <button
          type="button"
          onClick={() => {
            setValue('side', OrderSide.SELL);
            setSelectedSide(OrderSide.SELL);
          }}
          className={`flex-1 py-3 rounded-md font-semibold transition-colors ${
            side === OrderSide.SELL
              ? 'bg-danger text-white shadow-lg'
              : 'bg-dark-800 text-gray-400 hover:bg-dark-700'
          }`}
        >
          Sell
        </button>
      </div>

      {/* Symbol Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">Symbol</label>
        <select
          {...register('symbol')}
          className="w-full px-4 py-2.5 bg-dark-800 border border-dark-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="BTC/USD">BTC/USD</option>
          <option value="ETH/USD">ETH/USD</option>
          <option value="SOL/USD">SOL/USD</option>
          <option value="BNB/USD">BNB/USD</option>
          <option value="ADA/USD">ADA/USD</option>
        </select>
      </div>

      {/* Order Type */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">Order Type</label>
        <select
          {...register('orderType')}
          className="w-full px-4 py-2.5 bg-dark-800 border border-dark-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="LIMIT">Limit</option>
          <option value="MARKET">Market</option>
        </select>
      </div>

      {/* Quantity */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">Quantity</label>
        <input
          type="number"
          step="0.0001"
          {...register('quantity', { valueAsNumber: true })}
          className="w-full px-4 py-2.5 bg-dark-800 border border-dark-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="0.0000"
        />
        {errors.quantity && (
          <p className="text-danger text-sm mt-1">{errors.quantity.message}</p>
        )}
      </div>

      {/* Price (only for LIMIT orders) */}
      {orderType === 'LIMIT' && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">Price</label>
          <div className="flex gap-2">
            <input
              type="number"
              step="0.01"
              {...register('price', { 
                valueAsNumber: true,
                required: orderType === 'LIMIT' ? 'Price is required for LIMIT orders' : false,
              })}
              className="flex-1 px-4 py-2.5 bg-dark-800 border border-dark-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder={currentPrice?.toFixed(2)}
            />
            {currentPrice && (
              <button
                type="button"
                onClick={handleUseCurrentPrice}
                className="px-3 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-md transition-colors whitespace-nowrap"
              >
                Current Price
              </button>
            )}
          </div>
          {errors.price && (
            <p className="text-danger text-sm mt-1">{errors.price.message}</p>
          )}
          {currentPrice && (
            <p className="text-xs text-gray-400 mt-1">
              Current: ${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          )}
        </div>
      )}

      {/* Estimated Cost */}
      {watch('quantity') > 0 && (
        <div className="mb-4 p-3 bg-dark-800 rounded-md">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Estimated Cost</span>
            <span className="text-white font-semibold">
              ${((watch('quantity') || 0) * (watch('price') || currentPrice || 0)).toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isPlacing}
        variant={side === OrderSide.BUY ? 'success' : 'danger'}
        className="w-full py-3 text-lg font-semibold"
      >
        {isPlacing ? 'Placing Order...' : `Place ${side} Order`}
      </Button>
    </form>
  );
};
