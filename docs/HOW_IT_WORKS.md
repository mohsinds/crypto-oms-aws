# 🔄 How It Works - Crypto OMS AWS

## 📖 System Operation Guide

This document explains how the Crypto Order Management System operates, from order placement to execution and persistence.

### 🔗 Related Documentation

- **Architecture**: [`ARCHITECTURE.md`](./ARCHITECTURE.md) - Detailed system architecture
- **Backend Architecture**: [`BACKEND_ARCHITECTURE.md`](./BACKEND_ARCHITECTURE.md) - .NET microservices and Proto.Actor
- **Frontend Development**: [`FRONTEND.md`](./FRONTEND.md) - React trading dashboard with candlestick charts
- **Deployment**: [`DEPLOYMENT.md`](./DEPLOYMENT.md) - AWS deployment guide
- **Development**: [`DEVELOPMENT.md`](./DEVELOPMENT.md) - Service development guide
- **Testing**: [`TESTING.md`](./TESTING.md) - Testing and verification guide

---

## 🔄 Order Lifecycle

### Complete Order Flow

```
1. User Places Order
   ↓
2. Frontend → ALB → Order Ingestion API
   ↓
3. Idempotency Check (Redis)
   ↓
4. Order Validation
   ↓
5. Publish to Kafka (acks=all)
   ↓
6. Return Response to User
   ↓
7. Order Processor Consumes from Kafka
   ↓
8. Order Actor Processes Order
   ↓
9. Risk Engine Validates Order
   ↓
10. Persist to DocumentDB
    ↓
11. Publish Execution Events
    ↓
12. Frontend Updates via WebSocket
```

---

## 📝 Detailed Step-by-Step Process

### Step 1: Order Placement (Frontend)

**Location**: React Trading Dashboard

**Process**:
1. User fills out order form:
   - Symbol (e.g., "BTC/USD")
   - Side (BUY/SELL)
   - Quantity
   - Price (for LIMIT orders)
   - Order Type (MARKET/LIMIT)
2. Frontend generates idempotency key:
   ```typescript
   const idempotencyKey = `${userId}-${Date.now()}-${Math.random()}`
   ```
3. Frontend sends HTTP POST request:
   ```typescript
   POST https://alb-dns-name/api/orders
   Headers:
     - Content-Type: application/json
     - X-Idempotency-Key: <generated-key>
   Body:
     {
       "symbol": "BTC/USD",
       "side": "BUY",
       "quantity": 0.1,
       "price": 45000,
       "orderType": "LIMIT"
     }
   ```

**Technologies**:
- React (UI)
- Axios (HTTP client)
- WebSocket (real-time updates)

---

### Step 2: Load Balancing (ALB)

**Location**: AWS Application Load Balancer

**Process**:
1. ALB receives HTTPS request
2. SSL/TLS termination
3. Health check validation
4. Route to healthy EKS pod (Order Ingestion API)
5. Load distribution across multiple pods

**Configuration**:
- Target Group: EKS service endpoints
- Health Check: `/health` endpoint
- Listener: Port 443 (HTTPS), Port 80 (HTTP redirect)

---

### Step 3: Order Ingestion API

**Location**: .NET Core 8 Web API (EKS Pod)

**Process**:

#### 3.1 Request Reception
```csharp
[HttpPost("/api/orders")]
public async Task<IActionResult> PlaceOrder(
    [FromBody] PlaceOrderRequest request,
    [FromHeader(Name = "X-Idempotency-Key")] string idempotencyKey)
{
    // Process order...
}
```

#### 3.2 Idempotency Check
```csharp
// Check Redis for existing idempotency key
var existingOrder = await _redis.GetAsync(idempotencyKey);
if (existingOrder != null)
{
    return Ok(existingOrder); // Return cached response
}
```

**Redis Key Format**: `idempotency:{idempotencyKey}`
**TTL**: 24 hours

#### 3.3 Order Validation
- Validate required fields
- Check symbol exists
- Validate quantity > 0
- Validate price format
- Check order type compatibility

#### 3.4 Create Order Object
```csharp
var order = new Order
{
    OrderId = Guid.NewGuid(),
    Symbol = request.Symbol,
    Side = request.Side,
    Quantity = request.Quantity,
    Price = request.Price,
    OrderType = request.OrderType,
    Status = OrderStatus.NEW,
    CreatedAt = DateTime.UtcNow,
    IdempotencyKey = idempotencyKey
};
```

#### 3.5 Publish to Kafka
```csharp
var orderEvent = new OrderCreatedEvent
{
    OrderId = order.OrderId,
    Symbol = order.Symbol,
    Side = order.Side,
    Quantity = order.Quantity,
    Price = order.Price,
    Timestamp = DateTime.UtcNow
};

await _kafkaProducer.ProduceAsync(
    topic: "orders",
    key: order.OrderId.ToString(),
    value: orderEvent,
    acks: Acks.All // Wait for all replicas
);
```

**Kafka Configuration**:
- Topic: `orders`
- Partitions: 3 (for parallelism)
- Replication Factor: 3 (for durability)
- Acks: All (durability guarantee)

#### 3.6 Cache Response in Redis
```csharp
await _redis.SetAsync(
    key: $"idempotency:{idempotencyKey}",
    value: order,
    expiry: TimeSpan.FromHours(24)
);
```

#### 3.7 Return Response
```json
{
  "orderId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "ACCEPTED",
  "symbol": "BTC/USD",
  "side": "BUY",
  "quantity": 0.1,
  "price": 45000,
  "timestamp": "2025-01-14T10:31:00Z"
}
```

**Response Time**: < 50ms (target)

---

### Step 4: Kafka Message Queue

**Location**: AWS MSK (Managed Streaming for Kafka)

**Process**:
1. Order Ingestion API publishes order event
2. Kafka receives message
3. Message is replicated to 3 brokers (acks=all)
4. Message is persisted to disk
5. Order Processor consumes message

**Kafka Topics**:
- `orders` - New order events
- `executions` - Order execution events
- `prices` - Market price updates
- `risk-events` - Risk validation events

**Message Format**:
```json
{
  "eventType": "OrderCreated",
  "orderId": "550e8400-e29b-41d4-a716-446655440000",
  "symbol": "BTC/USD",
  "side": "BUY",
  "quantity": 0.1,
  "price": 45000,
  "timestamp": "2025-01-14T10:31:00Z"
}
```

---

### Step 5: Order Processor Service

**Location**: .NET Core 8 Service with Proto.Actor (EKS Pod)

**Process**:

#### 5.1 Kafka Consumer
```csharp
await _kafkaConsumer.SubscribeAsync("orders");
var message = await _kafkaConsumer.ConsumeAsync();
var orderEvent = Deserialize<OrderCreatedEvent>(message.Value);
```

#### 5.2 Actor Selection
```csharp
// Get or create Order Actor for this order
var orderActor = _actorSystem.Root.Spawn(
    Props.FromProducer(() => new OrderActor())
);
```

#### 5.3 Order Processing
```csharp
public class OrderActor : IActor
{
    private OrderState _state;
    
    public async Task ReceiveAsync(IContext context)
    {
        switch (context.Message)
        {
            case OrderCreatedEvent evt:
                _state = new OrderState
                {
                    OrderId = evt.OrderId,
                    Status = OrderStatus.ACCEPTED,
                    CreatedAt = evt.Timestamp
                };
                
                // Send to Risk Engine
                await context.SendAsync(
                    _riskEngineActor,
                    new ValidateOrderRequest(_state)
                );
                break;
                
            case RiskValidationResult result:
                if (result.Approved)
                {
                    _state.Status = OrderStatus.ACCEPTED;
                    await PersistOrder(_state);
                }
                else
                {
                    _state.Status = OrderStatus.REJECTED;
                    _state.RejectionReason = result.Reason;
                }
                break;
        }
    }
}
```

**Actor Benefits**:
- Isolated state per order
- Concurrent processing
- Fault tolerance
- Message-driven architecture

---

### Step 6: Risk Engine Service

**Location**: .NET Core 8 Service (EKS Pod)

**Process**:

#### 6.1 Receive Validation Request
```csharp
[HttpPost("/api/risk/validate")]
public async Task<RiskValidationResult> ValidateOrder(Order order)
{
    // Check position limits
    var currentPosition = await GetPosition(order.UserId, order.Symbol);
    var newPosition = CalculateNewPosition(currentPosition, order);
    
    if (newPosition.ExceedsLimit(order.UserId))
    {
        return new RiskValidationResult
        {
            Approved = false,
            Reason = "Position limit exceeded"
        };
    }
    
    // Check margin requirements
    var requiredMargin = CalculateMargin(order);
    var availableMargin = await GetAvailableMargin(order.UserId);
    
    if (requiredMargin > availableMargin)
    {
        return new RiskValidationResult
        {
            Approved = false,
            Reason = "Insufficient margin"
        };
    }
    
    return new RiskValidationResult { Approved = true };
}
```

#### 6.2 Publish Risk Event
```csharp
await _kafkaProducer.ProduceAsync(
    topic: "risk-events",
    key: order.OrderId.ToString(),
    value: riskResult
);
```

---

### Step 7: Order Persistence

**Location**: DocumentDB (MongoDB-compatible)

**Process**:

#### 7.1 Save Order to DocumentDB
```csharp
var orderDocument = new BsonDocument
{
    { "orderId", order.OrderId.ToString() },
    { "symbol", order.Symbol },
    { "side", order.Side },
    { "quantity", order.Quantity },
    { "price", order.Price },
    { "status", order.Status },
    { "createdAt", order.CreatedAt },
    { "updatedAt", DateTime.UtcNow }
};

await _documentDb.Orders.InsertOneAsync(orderDocument);
```

**Database Structure**:
- Collection: `orders`
- Indexes: `orderId` (unique), `userId`, `symbol`, `status`, `createdAt`

---

### Step 8: Event Publishing

**Location**: Kafka Topics

**Process**:
1. Order status changes trigger events
2. Events published to Kafka topics:
   - `executions` - Order fills
   - `order-updates` - Status changes
3. Frontend subscribes via WebSocket
4. Real-time UI updates

---

### Step 9: Frontend Updates

**Location**: React Trading Dashboard

**Process**:

#### 9.1 WebSocket Connection
```typescript
const ws = new WebSocket('wss://api-endpoint/ws');

ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  
  if (update.type === 'ORDER_UPDATE') {
    updateOrderInState(update.order);
  }
  
  if (update.type === 'EXECUTION') {
    addExecutionToHistory(update.execution);
  }
};
```

#### 9.2 UI Updates
- Order status changes
- Position updates
- Trade history
- Real-time price updates

---

## 🔐 Security Flow

### Authentication (Future)
1. User logs in via OAuth2
2. JWT token issued
3. Token included in API requests
4. API validates token
5. User context extracted

### Authorization
1. Check user permissions
2. Validate resource access
3. Enforce rate limits
4. Audit logging

---

## 📊 Monitoring & Observability

### Metrics Collected
- **Order Ingestion API**:
  - Request rate (orders/second)
  - Latency (P50, P95, P99)
  - Error rate
  - Idempotency hit rate

- **Order Processor**:
  - Processing rate
  - Actor count
  - Message queue depth
  - Processing latency

- **Kafka**:
  - Message throughput
  - Consumer lag
  - Partition distribution
  - Replication lag

- **Redis**:
  - Cache hit rate
  - Memory usage
  - Connection count
  - Command latency

- **DocumentDB**:
  - Query latency
  - Connection count
  - Storage usage
  - Replication lag

### Logging
- Structured logging (JSON)
- Log levels (DEBUG, INFO, WARN, ERROR)
- Correlation IDs for request tracing
- CloudWatch Logs integration

---

## 🚨 Error Handling

### Idempotency Failures
- **Scenario**: Redis unavailable
- **Handling**: Fallback to database check
- **Result**: Slightly slower but still idempotent

### Kafka Producer Failures
- **Scenario**: Kafka broker unavailable
- **Handling**: Retry with exponential backoff
- **Result**: Order queued, processed when Kafka recovers

### Order Processing Failures
- **Scenario**: Actor crashes
- **Handling**: Actor restarts, message replayed
- **Result**: At-least-once processing guarantee

### Database Failures
- **Scenario**: DocumentDB unavailable
- **Handling**: Retry with backoff
- **Result**: Order remains in Kafka, processed when DB recovers

---

## ⚡ Performance Optimizations

### 1. Redis Caching
- Idempotency keys cached for 24 hours
- Hot data cached (recent orders)
- Reduces database load

### 2. Kafka Batching
- Batch multiple orders in single Kafka message
- Reduces network overhead
- Increases throughput

### 3. Actor Concurrency
- Each order processed by isolated actor
- No shared state contention
- Parallel processing

### 4. Connection Pooling
- Redis connection pool
- DocumentDB connection pool
- Kafka producer pool

### 5. Async/Await
- Non-blocking I/O throughout
- Thread pool optimization
- No blocking calls

---

## 🔄 Data Consistency

### Eventual Consistency Model
- Orders eventually consistent across services
- Kafka provides ordering guarantees per partition
- DocumentDB provides strong consistency per document

### Idempotency Guarantees
- Client-generated idempotency keys
- Redis-backed deduplication
- 24-hour TTL

### Durability Guarantees
- Kafka: acks=all (all replicas must acknowledge)
- DocumentDB: Write concern majority
- Redis: Persistence enabled

---

*Last Updated: January 2025*
