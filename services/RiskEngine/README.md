# Risk Engine Service

ASP.NET Core 8 Web API service for risk validation, position tracking, and margin calculations.

## Overview

The Risk Engine Service validates orders against risk limits, tracks user positions, calculates margin requirements, and enforces risk controls. It handles:
- Position limit validation
- Margin requirement checks
- Daily loss limit enforcement
- Concentration limit checks
- Velocity checks (orders per minute)

## Technology Stack

- **Framework**: ASP.NET Core 8 Web API
- **Database**: DocumentDB/MongoDB (MongoDB.Driver) for position data
- **Cache**: Redis (StackExchange.Redis) for hot position data
- **Message Queue**: Kafka Producer (Confluent.Kafka) for risk events
- **Logging**: Serilog

## Project Structure

```
RiskEngine/
├── Controllers/
│   └── RiskController.cs           # REST API endpoints
├── Services/
│   ├── PositionService.cs          # Position tracking
│   ├── MarginCalculationService.cs # Margin calculations
│   ├── RiskValidationService.cs    # Risk checks
│   └── KafkaRiskEventProducer.cs   # Kafka producer
├── Models/
│   ├── Position.cs                 # Position model
│   ├── RiskValidationRequest.cs   # Validation request
│   ├── RiskValidationResult.cs    # Validation result
│   └── RiskLimits.cs              # Risk limits configuration
├── Program.cs                      # Application bootstrap
├── appsettings.json                # Configuration
└── Dockerfile                      # Containerization
```

## API Endpoints

### POST /api/risk/validate
Validate an order against risk limits.

**Request Body:**
```json
{
  "orderId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "user123",
  "symbol": "BTC/USD",
  "side": "BUY",
  "orderType": "LIMIT",
  "quantity": 0.1,
  "price": 45000,
  "currentPrice": 45000
}
```

**Response:**
```json
{
  "approved": true,
  "reason": "Order approved by risk engine",
  "requiredMargin": 4500.00,
  "availableMargin": 95500.00,
  "currentPositionValue": 4500.00,
  "newPositionValue": 9000.00,
  "failedChecks": [],
  "validatedAt": "2025-01-14T10:31:00Z"
}
```

### GET /api/risk/positions
Get all positions for a user.

**Query Parameters:**
- `userId` (required): User ID

**Response:**
```json
[
  {
    "userId": "user123",
    "symbol": "BTC/USD",
    "quantity": 0.5,
    "avgPrice": 45000,
    "currentPrice": 45500,
    "unrealizedPnl": 250,
    "realizedPnl": 0,
    "createdAt": "2025-01-14T10:00:00Z",
    "updatedAt": "2025-01-14T10:30:00Z"
  }
]
```

### GET /api/risk/positions/{userId}/{symbol}
Get a specific position.

### GET /api/risk/limits
Get risk limits for a user.

**Query Parameters:**
- `userId` (required): User ID

**Response:**
```json
{
  "userId": "user123",
  "maxPositionSize": 1000000,
  "maxDailyLoss": 50000,
  "maxLeverage": 10,
  "maxConcentration": 0.5,
  "maxOrdersPerMinute": 100,
  "initialMargin": 100000,
  "updatedAt": "2025-01-14T10:00:00Z"
}
```

## Risk Checks

The service performs the following risk validations:

### 1. Position Limits
- Checks if the new position value exceeds `MaxPositionSize`
- Calculates current and new position values

### 2. Margin Requirements
- Calculates required margin based on order value and leverage
- Checks if available margin is sufficient
- Default leverage: 10x

### 3. Daily Loss Limits
- Tracks daily realized PnL
- Rejects orders if daily loss exceeds `MaxDailyLoss`

### 4. Concentration Limits
- Checks if a single symbol exceeds `MaxConcentration` of total portfolio
- Default: 50% maximum concentration

### 5. Velocity Checks
- Tracks orders per minute per user
- Rejects orders if `MaxOrdersPerMinute` is exceeded
- Default: 100 orders per minute

## Configuration

### appsettings.json

```json
{
  "Database": {
    "ConnectionString": "mongodb://localhost:27017",
    "DatabaseName": "crypto_oms"
  },
  "Redis": {
    "ConnectionString": "localhost:6379"
  },
  "Kafka": {
    "BootstrapServers": "localhost:9092",
    "RiskEventsTopic": "risk-events"
  }
}
```

### Environment Variables

- `Database:ConnectionString` - MongoDB/DocumentDB connection string
- `Database:DatabaseName` - Database name (default: "crypto_oms")
- `Redis:ConnectionString` - Redis connection string
- `Kafka:BootstrapServers` - Kafka bootstrap servers
- `Kafka:RiskEventsTopic` - Kafka topic for risk events (default: "risk-events")

## Running Locally

### Prerequisites

- .NET 8 SDK
- MongoDB/DocumentDB running on localhost:27017
- Redis running on localhost:6379
- Kafka running on localhost:9092

### Steps

1. **Start dependencies** (using Docker Compose from project root):
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
   http://localhost:5001/swagger
   ```

## Testing

### Using curl

```bash
# Validate an order
curl -X POST http://localhost:5001/api/risk/validate \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "user123",
    "symbol": "BTC/USD",
    "side": "BUY",
    "orderType": "LIMIT",
    "quantity": 0.1,
    "price": 45000,
    "currentPrice": 45000
  }'

# Get positions
curl http://localhost:5001/api/risk/positions?userId=user123

# Get risk limits
curl http://localhost:5001/api/risk/limits?userId=user123
```

## Position Management

- Positions are stored in MongoDB/DocumentDB
- Hot position data is cached in Redis (5-minute TTL)
- Cache key format: `position:{userId}:{SYMBOL}`
- Positions are updated when orders are executed

## Margin Calculation

- **Required Margin**: Order value / Leverage (default 10x)
- **Available Margin**: Initial Margin - Used Margin
- **Used Margin**: Total Position Value / Leverage

## Kafka Integration

- **Topic**: `risk-events` (configurable)
- **Key**: OrderId
- **Acks**: All (durability guarantee)
- **Compression**: Snappy
- **Idempotence**: Enabled

Publishes risk validation results to Kafka for downstream processing.

## Health Checks

- `/health` - Overall health check (Redis + MongoDB + Kafka)
- `/ready` - Readiness check (same as health)

## Logging

Uses Serilog for structured logging:
- Console output (JSON format in production)
- Log levels: Debug (Development), Information (Production)
- Request/response logging enabled

## Error Handling

- Validation errors return 200 OK with `approved: false`
- Internal errors return 500 Internal Server Error
- Missing required fields return 400 Bad Request

## Docker

### Build Image

```bash
docker build -t crypto-oms/risk-engine:latest .
```

### Run Container

```bash
docker run -p 5001:80 \
  -e Database:ConnectionString="mongodb://documentdb:27017" \
  -e Redis:ConnectionString="redis:6379" \
  -e Kafka:BootstrapServers="kafka:9092" \
  crypto-oms/risk-engine:latest
```

## Next Steps

- [ ] Load risk limits from DocumentDB or configuration service
- [ ] Implement position updates from execution events
- [ ] Add unit tests
- [ ] Add integration tests
- [ ] Add metrics collection (Prometheus)
- [ ] Implement real-time position updates via WebSocket
