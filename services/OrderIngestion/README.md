# Order Ingestion API

ASP.NET Core 8 Web API service for receiving and processing cryptocurrency trading orders.

## Overview

The Order Ingestion API is the entry point for order placement in the Crypto OMS system. It handles:
- Order validation
- Idempotency enforcement (via Redis)
- Publishing order events to Kafka
- Immediate response to clients

## Technology Stack

- **Framework**: ASP.NET Core 8 Web API
- **Database**: Redis (StackExchange.Redis) for idempotency
- **Message Queue**: Kafka Producer (Confluent.Kafka)
- **Validation**: FluentValidation
- **Logging**: Serilog

## Project Structure

```
OrderIngestion/
├── Controllers/
│   └── OrdersController.cs        # REST API endpoints
├── Services/
│   ├── IdempotencyService.cs      # Redis idempotency logic
│   └── KafkaProducerService.cs    # Kafka producer
├── Models/
│   ├── Order.cs                   # Domain model
│   ├── PlaceOrderRequest.cs       # Request DTO
│   ├── OrderResponse.cs           # Response DTO
│   └── OrderCreatedEvent.cs      # Kafka event model
├── Validators/
│   └── PlaceOrderRequestValidator.cs
├── Program.cs                     # Application bootstrap
├── appsettings.json               # Configuration
└── Dockerfile                     # Containerization
```

## API Endpoints

### POST /api/orders
Place a new order.

**Headers:**
- `X-Idempotency-Key` (required): Unique key for idempotency

**Request Body:**
```json
{
  "symbol": "BTC/USD",
  "side": "BUY",
  "orderType": "LIMIT",
  "quantity": 0.1,
  "price": 45000
}
```

**Response:**
```json
{
  "orderId": "550e8400-e29b-41d4-a716-446655440000",
  "symbol": "BTC/USD",
  "side": "BUY",
  "orderType": "LIMIT",
  "quantity": 0.1,
  "price": 45000,
  "status": "ACCEPTED",
  "createdAt": "2025-01-14T10:31:00Z"
}
```

### GET /api/orders/{id}
Get order status (not yet implemented).

### GET /api/orders
List orders with filters (not yet implemented).

### GET /health
Health check endpoint.

### GET /ready
Readiness check endpoint.

## Configuration

### appsettings.json

```json
{
  "Redis": {
    "ConnectionString": "localhost:6379"
  },
  "Kafka": {
    "BootstrapServers": "localhost:9092",
    "OrdersTopic": "orders"
  }
}
```

### Environment Variables

- `Redis:ConnectionString` - Redis connection string
- `Kafka:BootstrapServers` - Kafka bootstrap servers
- `Kafka:OrdersTopic` - Kafka topic name (default: "orders")

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
   http://localhost:5000/swagger
   ```

## Testing

### Using curl

```bash
curl -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: test-123" \
  -d '{
    "symbol": "BTC/USD",
    "side": "BUY",
    "orderType": "LIMIT",
    "quantity": 0.1,
    "price": 45000
  }'
```

### Using Swagger

1. Navigate to `http://localhost:5000/swagger`
2. Expand the `POST /api/orders` endpoint
3. Click "Try it out"
4. Enter the request body and idempotency key
5. Click "Execute"

## Docker

### Build Image

```bash
docker build -t crypto-oms/order-ingestion:latest .
```

### Run Container

```bash
docker run -p 5000:80 \
  -e Redis:ConnectionString=redis:6379 \
  -e Kafka:BootstrapServers=kafka:9092 \
  crypto-oms/order-ingestion:latest
```

## Idempotency

The API enforces idempotency using Redis:
- Client must provide `X-Idempotency-Key` header
- If key exists in Redis, cached response is returned
- Response is cached for 24 hours
- Key format: `idempotency:{client-provided-key}`

## Kafka Integration

- **Topic**: `orders` (configurable)
- **Key**: OrderId (ensures ordering per order)
- **Acks**: All (durability guarantee)
- **Compression**: Snappy
- **Idempotence**: Enabled

## Health Checks

- `/health` - Overall health check (Redis + Kafka)
- `/ready` - Readiness check (same as health)

## Logging

Uses Serilog for structured logging:
- Console output (JSON format in production)
- Log levels: Debug (Development), Information (Production)
- Request/response logging enabled

## Error Handling

- Validation errors return 400 Bad Request
- Kafka errors return 500 Internal Server Error
- Redis errors are logged but don't fail the request (idempotency is best-effort)

## Next Steps

- [ ] Implement GET /api/orders/{id} endpoint
- [ ] Implement GET /api/orders endpoint with filtering
- [ ] Add unit tests
- [ ] Add integration tests
- [ ] Add metrics collection (Prometheus)
