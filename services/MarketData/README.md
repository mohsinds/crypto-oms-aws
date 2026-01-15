# Market Data Service

ASP.NET Core 8 Web API service with SignalR WebSocket support for providing real-time market data and order book information.

## Overview

The Market Data Service aggregates price feeds, maintains order book state, and provides real-time updates via WebSocket. It handles:
- Price aggregation from Kafka
- Order book management (cached in Redis)
- Real-time price updates via SignalR
- REST API for price and order book queries

## Technology Stack

- **Framework**: ASP.NET Core 8 Web API
- **WebSocket**: SignalR
- **Cache**: Redis (StackExchange.Redis) for order book
- **Message Queue**: Kafka Consumer (Confluent.Kafka) for price feeds
- **Logging**: Serilog

## Project Structure

```
MarketData/
├── Controllers/
│   └── MarketDataController.cs    # REST API endpoints
├── Hubs/
│   └── PriceHub.cs                # SignalR hub for real-time prices
├── Services/
│   ├── OrderBookService.cs        # Order book management
│   ├── PriceAggregationService.cs # Price feed aggregation
│   └── KafkaPriceConsumerService.cs # Kafka consumer
├── Models/
│   ├── Price.cs                   # Price model
│   ├── OrderBook.cs               # Order book model
│   ├── Candlestick.cs            # Candlestick model
│   └── PriceUpdateEvent.cs       # Kafka event model
├── Program.cs                     # Application bootstrap
├── appsettings.json               # Configuration
└── Dockerfile                     # Containerization
```

## API Endpoints

### GET /api/market-data/prices/{symbol}
Get current price for a symbol.

**Response:**
```json
{
  "symbol": "BTC/USD",
  "priceValue": 45000.50,
  "change24h": 500.50,
  "changePercent24h": 1.12,
  "high24h": 45500.00,
  "low24h": 44500.00,
  "volume24h": 1000000.00,
  "timestamp": "2025-01-14T10:31:00Z"
}
```

### GET /api/market-data/prices
Get all available prices.

### GET /api/market-data/orderbook/{symbol}
Get order book for a symbol.

**Response:**
```json
{
  "symbol": "BTC/USD",
  "bids": [
    { "price": 44999.00, "quantity": 0.5 },
    { "price": 44998.00, "quantity": 1.0 }
  ],
  "asks": [
    { "price": 45001.00, "quantity": 0.3 },
    { "price": 45002.00, "quantity": 0.8 }
  ],
  "timestamp": "2025-01-14T10:31:00Z"
}
```

### GET /api/market-data/candlestick/{symbol}
Get candlestick data (not yet implemented).

**Query Parameters:**
- `interval`: 1m, 5m, 15m, 1h, 1d (default: 5m)
- `limit`: Number of candles (default: 100)

### WebSocket: /ws/market-data
SignalR hub for real-time price updates.

**Client Connection:**
```javascript
const connection = new signalR.HubConnectionBuilder()
    .withUrl("http://localhost:5002/ws/market-data")
    .build();

connection.on("PriceUpdate", (price) => {
    console.log("Price update:", price);
});

connection.start();

// Subscribe to specific symbol
connection.invoke("SubscribeToSymbol", "BTC/USD");
```

## Configuration

### appsettings.json

```json
{
  "Redis": {
    "ConnectionString": "localhost:6379"
  },
  "Kafka": {
    "BootstrapServers": "localhost:9092",
    "PricesTopic": "prices",
    "ExecutionsTopic": "executions"
  },
  "WebSocket": {
    "Enabled": true,
    "Path": "/ws/market-data"
  }
}
```

### Environment Variables

- `Redis:ConnectionString` - Redis connection string
- `Kafka:BootstrapServers` - Kafka bootstrap servers
- `Kafka:PricesTopic` - Kafka topic for price updates (default: "prices")
- `Kafka:ExecutionsTopic` - Kafka topic for execution events (default: "executions")

## Running Locally

### Prerequisites

- .NET 8 SDK
- Redis running on localhost:6379
- Kafka running on localhost:9092

### Steps

1. **Start Redis and Kafka** (using Docker Compose from project root):
   ```bash
   docker-compose up -d
   ```

2. **Restore dependencies**:
   ```bash
   dotnet restore
   ```

3. **Run the application**:
   ```bash
   dotnet run
   ```

4. **Access Swagger UI**:
   ```
   http://localhost:5002/swagger
   ```

## Kafka Consumer

The service runs a background Kafka consumer that:
- Subscribes to `prices` topic for price updates
- Subscribes to `executions` topic for execution events
- Updates in-memory price cache
- Broadcasts updates to SignalR clients
- Updates order book cache in Redis

**Consumer Group**: `market-data-group`

## SignalR WebSocket

### Connection

Connect to `/ws/market-data` endpoint using SignalR client.

### Methods

**Server → Client:**
- `PriceUpdate` - Broadcasts price updates to all clients

**Client → Server:**
- `SubscribeToSymbol(symbol)` - Subscribe to price updates for a specific symbol
- `UnsubscribeFromSymbol(symbol)` - Unsubscribe from symbol updates

### Example (JavaScript)

```javascript
import * as signalR from "@microsoft/signalr";

const connection = new signalR.HubConnectionBuilder()
    .withUrl("http://localhost:5002/ws/market-data")
    .withAutomaticReconnect()
    .build();

connection.on("PriceUpdate", (price) => {
    console.log(`Price update for ${price.symbol}: $${price.priceValue}`);
    // Update UI
});

connection.start()
    .then(() => {
        console.log("Connected to Market Data WebSocket");
        connection.invoke("SubscribeToSymbol", "BTC/USD");
    })
    .catch(err => console.error(err));
```

## Order Book Management

- Order book data is cached in Redis with 1-second TTL
- Key format: `orderbook:{SYMBOL}`
- Updates are triggered by execution events from Kafka

## Price Aggregation

- Prices are stored in-memory (ConcurrentDictionary)
- Updated from Kafka price feed events
- Broadcasted to SignalR clients in real-time

## Health Checks

- `/health` - Overall health check (Redis + Kafka)
- `/ready` - Readiness check (same as health)

## Logging

Uses Serilog for structured logging:
- Console output (JSON format in production)
- Log levels: Debug (Development), Information (Production)
- Request/response logging enabled

## Docker

### Build Image

```bash
docker build -t crypto-oms/market-data:latest .
```

### Run Container

```bash
docker run -p 5002:80 \
  -e Redis:ConnectionString=redis:6379 \
  -e Kafka:BootstrapServers=kafka:9092 \
  crypto-oms/market-data:latest
```

## Next Steps

- [ ] Implement GET /api/market-data/candlestick/{symbol} endpoint
- [ ] Add order book updates from execution events
- [ ] Add unit tests
- [ ] Add integration tests
- [ ] Add metrics collection (Prometheus)
- [ ] Implement price feed aggregation from multiple sources
