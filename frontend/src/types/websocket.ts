export interface WebSocketMessage {
  type: 'ORDER_UPDATE' | 'ORDER_FILLED' | 'PRICE_UPDATE' | 'EXECUTION' | 'TRADE';
  data: any;
}

export interface OrderUpdateMessage {
  type: 'ORDER_UPDATE';
  data: {
    orderId: string;
    status: string;
    filledQuantity?: number;
    fillPrice?: number;
  };
}

export interface PriceUpdateMessage {
  type: 'PRICE_UPDATE';
  data: {
    symbol: string;
    price: number;
    timestamp: number;
  };
}

export interface ExecutionMessage {
  type: 'EXECUTION';
  data: {
    orderId: string;
    symbol: string;
    filledQuantity: number;
    fillPrice: number;
    timestamp: number;
  };
}
