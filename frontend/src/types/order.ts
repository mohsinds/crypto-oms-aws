export enum OrderSide {
  BUY = 'BUY',
  SELL = 'SELL',
}

export enum OrderType {
  MARKET = 'MARKET',
  LIMIT = 'LIMIT',
}

export enum OrderStatus {
  NEW = 'NEW',
  ACCEPTED = 'ACCEPTED',
  PARTIALLY_FILLED = 'PARTIALLY_FILLED',
  FILLED = 'FILLED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED',
  SETTLED = 'SETTLED',
}

export interface Order {
  orderId: string;
  symbol: string;
  side: OrderSide;
  orderType: OrderType;
  quantity: number;
  price?: number;
  status: OrderStatus;
  filledQuantity: number;
  avgFillPrice?: number;
  createdAt: string;
  updatedAt?: string;
  rejectionReason?: string;
}

export interface PlaceOrderRequest {
  symbol: string;
  side: OrderSide;
  orderType: OrderType;
  quantity: number;
  price?: number;
  idempotencyKey: string;
}

export interface OrderResponse {
  orderId: string;
  status: OrderStatus;
  symbol: string;
  side: OrderSide;
  quantity: number;
  price?: number;
  timestamp: string;
}
