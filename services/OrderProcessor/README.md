# Order Processor Service

.NET 8 Worker Service with Proto.Actor for high-concurrency order processing.

## Overview

The Order Processor Service consumes order events from Kafka and processes them using the Actor model (Proto.Actor). It handles:
- Consuming order events from Kafka
- Processing orders using isolated actors
- Managing order state machine
- Persisting orders to DocumentDB
- Publishing execution events to Kafka

## Technology Stack

- **Framework**: .NET 8 Worker Service
- **Actor Model**: Proto.Actor
- **Message Queue**: Kafka Consumer (Confluent.Kafka)
- **Database**: DocumentDB/MongoDB (MongoDB.Driver) for order persistence
- **Logging**: Serilog

## Project Structure

```
OrderProcessor/
├── Actors/
│   └── OrderActor.cs              # Main order processing actor
├── Services/
│   ├── KafkaConsumerService.cs    # Kafka consumer loop
│   ├── OrderPersistenceService.cs # DocumentDB persistence
│   └── KafkaExecutionProducer.cs   # Kafka producer for executions
├── Models/
│   ├── OrderState.cs              # Actor state
│   ├── OrderCreatedEvent.cs       # Kafka event model
│   ├── RiskValidatedEvent.cs      # Risk validation event
│   └── ExecutionEvent.cs          # Execution event
├── Program.cs                      # Application bootstrap
├── appsettings.json                # Configuration
└── Dockerfile                      # Containerization
```

## Order State Machine

```
NEW → ACCEPTED → FILLED → SETTLED
  ↓       ↓
  └──→ REJECTED (Risk validation failed)
  └──→ CANCELLED (User cancelled)
```

## How It Works

### 1. Kafka Consumer
- Subscribes to `orders` topic
- Consumes `OrderCreatedEvent` messages
- Creates or retrieves Order Actor for each order

### 2. Order Actor
- Each order has its own isolated actor
- Manages order state machine
- Handles state transitions:
  - **NEW**: Order received from Kafka
  - **ACCEPTED**: Risk validation passed
  - **REJECTED**: Risk validation failed
  - **FILLED**: Order executed
  - **CANCELLED**: Order cancelled
  - **SETTLED**: Order settled

### 3. Risk Validation
- Actor sends HTTP request to Risk Engine
- Waits for validation result
- Updates order state based on result

### 4. Order Persistence
- Orders saved to DocumentDB
- State changes persisted
- Supports order retrieval

### 5. Execution Events
- When order is filled, publishes `ExecutionEvent` to Kafka
- Topic: `executions`
- Consumed by Market Data Service

## Configuration

### appsettings.json

```json
{
  "Database": {
    "ConnectionString": "mongodb://localhost:27017",
    "DatabaseName": "crypto_oms"
  },
  "Kafka": {
    "BootstrapServers": "localhost:9092",
    "OrdersTopic": "orders",
    "ExecutionsTopic": "executions"
  },
  "RiskEngine": {
    "BaseUrl": "http://localhost:5001"
  }
}
```

### Environment Variables

- `Database:ConnectionString` - MongoDB/DocumentDB connection string
- `Database:DatabaseName` - Database name (default: "crypto_oms")
- `Kafka:BootstrapServers` - Kafka bootstrap servers
- `Kafka:OrdersTopic` - Kafka topic for orders (default: "orders")
- `Kafka:ExecutionsTopic` - Kafka topic for executions (default: "executions")
- `RiskEngine:BaseUrl` - Risk Engine API base URL

## Running Locally

### Prerequisites

- .NET 8 SDK
- MongoDB/DocumentDB running on localhost:27017
- Kafka running on localhost:9092
- Risk Engine service running on localhost:5001

### Steps

1. **Start dependencies** (using Docker Compose from project root):
   ```bash
   docker-compose up -d
   ```

2. **Start Risk Engine service** (in separate terminal):
   ```bash
   cd ../RiskEngine
   dotnet run
   ```

3. **Restore dependencies**:
   ```bash
   dotnet restore
   ```

4. **Run the application**:
   ```bash
   dotnet run
   ```

## Proto.Actor Architecture

### Why Proto.Actor?

1. **Isolated State**: Each order has its own actor with isolated state
2. **Concurrent Processing**: Thousands of orders processed in parallel
3. **State Machine**: Natural fit for order lifecycle
4. **Fault Tolerance**: Actors can restart and recover state
5. **Message-Driven**: Asynchronous, non-blocking processing

### Actor Lifecycle

```
OrderCreated Event → Spawn Order Actor
  ↓
Order Actor receives OrderCreatedEvent
  ↓
Order Actor requests Risk Validation (HTTP)
  ↓
Order Actor receives RiskValidationResult
  ↓
Order Actor persists to DocumentDB
  ↓
Order Actor publishes Execution Event (if filled)
  ↓
Order Actor can be passivated (state saved to DocumentDB)
```

## Kafka Integration

### Consumer
- **Topic**: `orders`
- **Consumer Group**: `order-processor-group`
- **Auto Offset Reset**: Latest
- **Message Format**: JSON `OrderCreatedEvent`

### Producer
- **Topic**: `executions`
- **Key**: OrderId
- **Acks**: All (durability guarantee)
- **Compression**: Snappy
- **Message Format**: JSON `ExecutionEvent`

## Order Processing Flow

1. **Kafka Consumer** receives `OrderCreatedEvent`
2. **Order Actor** is created/spawned for the order
3. **Order Actor** sends HTTP request to Risk Engine
4. **Risk Engine** validates order and returns result
5. **Order Actor** updates state:
   - If approved → `ACCEPTED`, persist to DocumentDB
   - If rejected → `REJECTED`, persist with reason
6. **Order Actor** simulates execution (for MARKET orders)
7. **Order Actor** publishes `ExecutionEvent` to Kafka
8. **Order Actor** updates state to `FILLED`

## Logging

Uses Serilog for structured logging:
- Console output (JSON format in production)
- Log levels: Debug (Development), Information (Production)
- Actor lifecycle events logged
- Order state transitions logged

## Docker

### Build Image

```bash
docker build -t crypto-oms/order-processor:latest .
```

### Run Container

```bash
docker run \
  -e Database:ConnectionString="mongodb://documentdb:27017" \
  -e Kafka:BootstrapServers="kafka:9092" \
  -e RiskEngine:BaseUrl="http://risk-engine:5001" \
  crypto-oms/order-processor:latest
```

## Testing

### Manual Testing

1. **Publish order event to Kafka**:
   ```bash
   # Using kafka-console-producer
   echo '{"orderId":"550e8400-e29b-41d4-a716-446655440000","symbol":"BTC/USD","side":"BUY","orderType":"LIMIT","quantity":0.1,"price":45000,"timestamp":"2025-01-14T10:31:00Z"}' | \
     kafka-console-producer.sh --bootstrap-server localhost:9092 --topic orders --property "parse.key=true" --property "key.separator=:" \
     --property "key.serializer=org.apache.kafka.common.serialization.StringSerializer" \
     --property "value.serializer=org.apache.kafka.common.serialization.StringSerializer"
   ```

2. **Check DocumentDB** for persisted order:
   ```bash
   mongosh mongodb://localhost:27017/crypto_oms
   db.orders.find().pretty()
   ```

3. **Check Kafka** for execution event:
   ```bash
   kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic executions --from-beginning
   ```

## Error Handling

- **Kafka Consumer Errors**: Logged and retried
- **Risk Engine Errors**: Order marked as REJECTED
- **DocumentDB Errors**: Logged, actor retries persistence
- **Actor Crashes**: Actor restarts, state recovered from DocumentDB

## Performance

- **Concurrent Processing**: Each order processed by isolated actor
- **No Shared State**: No contention between orders
- **Scalability**: Spawn thousands of actors for thousands of orders
- **Throughput**: Designed for 50,000+ orders/second

## Next Steps

- [ ] Implement actor persistence (save state to DocumentDB on passivation)
- [ ] Add actor clustering for distributed processing
- [ ] Implement order cancellation handling
- [ ] Add unit tests for OrderActor
- [ ] Add integration tests
- [ ] Add metrics collection (Prometheus)
- [ ] Implement real exchange integration (replace simulation)
