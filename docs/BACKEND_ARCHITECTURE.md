# 🏗️ Backend Architecture - .NET Microservices

## Overview

This document provides a detailed explanation of the .NET Core 8 microservices architecture, including project structure, service responsibilities, Proto.Actor implementation, and how to run all services locally and on AWS.

---

## 📋 Microservices Overview

The Crypto OMS consists of **4 main microservices** built with .NET Core 8:

| Service | Type | Technology | Purpose |
|---------|------|-----------|---------|
| **Order Ingestion API** | REST API (Producer) | ASP.NET Core 8 | Receives orders, validates, publishes to Kafka |
| **Order Processor** | Consumer (Proto.Actor) | .NET 8 + Proto.Actor | Processes orders using Actor model |
| **Risk Engine** | REST API | ASP.NET Core 8 | Validates orders, manages risk limits |
| **Market Data Service** | REST API + WebSocket | ASP.NET Core 8 | Provides market data and order book |

---

## 🏗️ Service Architecture Details

### Service 1: Order Ingestion API (Producer)

**Type**: REST API Web Application  
**Project Type**: ASP.NET Core 8 Web API  
**Pattern**: Producer (Kafka Producer)

#### Responsibilities
- Accept HTTP POST requests for order placement
- Validate order data
- Enforce idempotency using Redis
- Publish order events to Kafka
- Return immediate response to client

#### Technology Stack
- **Framework**: ASP.NET Core 8 Web API
- **Database**: Redis (for idempotency keys)
- **Message Queue**: Kafka Producer (Confluent.Kafka)
- **Validation**: FluentValidation
- **Logging**: Serilog

#### Project Structure
```
services/OrderIngestion/
├── OrderIngestion.csproj
├── Program.cs                      # Application bootstrap
├── Controllers/
│   └── OrdersController.cs        # REST API endpoints
├── Services/
│   ├── IdempotencyService.cs      # Redis idempotency logic
│   └── KafkaProducerService.cs    # Kafka producer
├── Models/
│   ├── Order.cs                   # Domain model
│   ├── PlaceOrderRequest.cs       # Request DTO
│   └── OrderResponse.cs           # Response DTO
├── Middleware/
│   └── IdempotencyMiddleware.cs   # Request deduplication
├── Validators/
│   └── PlaceOrderRequestValidator.cs
├── appsettings.json
├── appsettings.Development.json
└── Dockerfile
```

#### Key Components

**1. OrdersController (REST Endpoints)**
```csharp
[ApiController]
[Route("api/orders")]
public class OrdersController : ControllerBase
{
    private readonly IdempotencyService _idempotency;
    private readonly KafkaProducerService _kafka;
    
    [HttpPost]
    public async Task<IActionResult> PlaceOrder(
        [FromBody] PlaceOrderRequest request,
        [FromHeader(Name = "X-Idempotency-Key")] string idempotencyKey)
    {
        // 1. Check idempotency (Redis)
        // 2. Validate request
        // 3. Create order object
        // 4. Publish to Kafka
        // 5. Cache response in Redis
        // 6. Return response
    }
}
```

**2. KafkaProducerService**
- **Purpose**: Publishes order events to Kafka
- **Topic**: `orders`
- **Key**: OrderId (ensures ordering per order)
- **Acks**: All (durability guarantee)

**3. IdempotencyService**
- **Purpose**: Prevents duplicate order processing
- **Storage**: Redis
- **Key Format**: `idempotency:{client-provided-key}`
- **TTL**: 24 hours

---

### Service 2: Order Processor (Consumer with Proto.Actor)

**Type**: Background Service (Consumer)  
**Project Type**: .NET 8 Worker Service / Console Application  
**Pattern**: Kafka Consumer + Actor Model

#### Responsibilities
- Consume order events from Kafka
- Process orders using Actor model (Proto.Actor)
- Manage order state machine
- Persist orders to DocumentDB
- Publish execution events back to Kafka

#### Technology Stack
- **Framework**: .NET 8 Worker Service / Console App
- **Actor Model**: Proto.Actor
- **Message Queue**: Kafka Consumer (Confluent.Kafka)
- **Database**: DocumentDB (MongoDB driver)
- **Logging**: Serilog

#### Why Proto.Actor?

Proto.Actor is used for **high-concurrency order processing**:

1. **Isolated State**: Each order has its own actor with isolated state
2. **Concurrent Processing**: Thousands of orders processed in parallel
3. **State Machine**: Natural fit for order lifecycle (NEW → ACCEPTED → FILLED)
4. **Fault Tolerance**: Actors can restart and recover state
5. **Message-Driven**: Asynchronous, non-blocking processing

#### Project Structure
```
services/OrderProcessor/
├── OrderProcessor.csproj
├── Program.cs                      # Application bootstrap
├── Actors/
│   ├── OrderActor.cs              # Main order processing actor
│   └── OrderState.cs              # Actor state
├── Services/
│   ├── KafkaConsumerService.cs    # Kafka consumer loop
│   └── OrderPersistenceService.cs # DocumentDB persistence
├── Models/
│   ├── OrderCreatedEvent.cs       # Kafka event model
│   ├── RiskValidatedEvent.cs      # Risk validation event
│   └── OrderStateMachine.cs       # Order state transitions
├── Handlers/
│   └── OrderEventHandler.cs       # Event handlers
├── appsettings.json
└── Dockerfile
```

#### Key Components

**1. KafkaConsumerService (Background Service)**
```csharp
public class KafkaConsumerService : BackgroundService
{
    private readonly IConsumer<string, string> _consumer;
    private readonly ActorSystem _actorSystem;
    
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _consumer.Subscribe("orders");
        
        while (!stoppingToken.IsCancellationRequested)
        {
            var result = _consumer.Consume(stoppingToken);
            
            // Get or create Order Actor
            var actor = _actorSystem.Root.Spawn(
                Props.FromProducer(() => new OrderActor())
            );
            
            // Send message to actor
            await _actorSystem.Root.SendAsync(
                actor,
                new OrderCreatedEvent { ... }
            );
        }
    }
}
```

**2. OrderActor (Proto.Actor)**
```csharp
public class OrderActor : IActor
{
    private OrderState _state = new();
    private readonly IPersistenceContext _persistence;
    
    public async Task ReceiveAsync(IContext context)
    {
        switch (context.Message)
        {
            case OrderCreatedEvent evt:
                _state.OrderId = evt.OrderId;
                _state.Status = OrderStatus.NEW;
                _state.Symbol = evt.Symbol;
                _state.Quantity = evt.Quantity;
                _state.Price = evt.Price;
                
                // Request risk validation
                await context.RequestAsync<RiskValidationResult>(
                    _riskEngineActor,
                    new ValidateOrderRequest(_state)
                );
                break;
                
            case RiskValidationResult result:
                if (result.Approved)
                {
                    _state.Status = OrderStatus.ACCEPTED;
                    await _persistence.SaveOrderAsync(_state);
                }
                else
                {
                    _state.Status = OrderStatus.REJECTED;
                    _state.RejectionReason = result.Reason;
                }
                break;
                
            case OrderFilledEvent evt:
                _state.Status = OrderStatus.FILLED;
                _state.FilledQuantity = evt.FilledQuantity;
                _state.FillPrice = evt.FillPrice;
                await _persistence.UpdateOrderAsync(_state);
                break;
        }
    }
}
```

**3. Order State Machine**
```
NEW → ACCEPTED → FILLED → SETTLED
  ↓       ↓
  └──→ REJECTED (Risk validation failed)
  └──→ CANCELLED (User cancelled)
```

#### Actor System Setup
```csharp
// Program.cs
var actorSystem = new ActorSystem();

// Spawn actors as needed
var orderActor = actorSystem.Root.Spawn(
    Props.FromProducer(() => new OrderActor())
);

// Send messages to actors
await actorSystem.Root.SendAsync(
    orderActor,
    new OrderCreatedEvent { OrderId = "123" }
);
```

---

### Service 3: Risk Engine (REST API)

**Type**: REST API Web Application  
**Project Type**: ASP.NET Core 8 Web API  
**Pattern**: Request/Response API

#### Responsibilities
- Validate orders against risk limits
- Check position limits
- Calculate margin requirements
- Track user positions
- Return validation results

#### Technology Stack
- **Framework**: ASP.NET Core 8 Web API
- **Database**: DocumentDB (for position data)
- **Cache**: Redis (for hot position data)
- **Message Queue**: Kafka (publishes risk events)

#### Project Structure
```
services/RiskEngine/
├── RiskEngine.csproj
├── Program.cs
├── Controllers/
│   └── RiskController.cs
├── Services/
│   ├── PositionService.cs        # Position tracking
│   ├── MarginCalculationService.cs
│   └── RiskValidationService.cs  # Risk checks
├── Models/
│   ├── RiskValidationRequest.cs
│   ├── RiskValidationResult.cs
│   └── Position.cs
└── Dockerfile
```

---

### Service 4: Market Data Service (REST API + WebSocket)

**Type**: REST API + WebSocket Server  
**Project Type**: ASP.NET Core 8 Web API  
**Pattern**: Request/Response + Streaming

#### Responsibilities
- Aggregate price feeds from exchanges
- Maintain order book state
- Provide REST API for price queries
- Provide WebSocket server for real-time updates
- Publish price events to Kafka

#### Technology Stack
- **Framework**: ASP.NET Core 8 Web API
- **WebSocket**: SignalR or raw WebSocket
- **Cache**: Redis (for order book)
- **Message Queue**: Kafka (consumes price feeds, publishes updates)

#### Project Structure
```
services/MarketData/
├── MarketData.csproj
├── Program.cs
├── Controllers/
│   └── MarketDataController.cs
├── Hubs/
│   └── PriceHub.cs                # SignalR hub for real-time prices
├── Services/
│   ├── OrderBookService.cs        # Order book management
│   ├── PriceAggregationService.cs # Price feed aggregation
│   └── KafkaPriceConsumerService.cs
├── Models/
│   ├── Price.cs
│   ├── OrderBook.cs
│   └── Candlestick.cs
└── Dockerfile
```

---

## 🔄 Producer vs Consumer Architecture

### Producer Services (Publish to Kafka)

**Order Ingestion API** (Primary Producer)
- **Topic**: `orders`
- **Event Type**: `OrderCreated`
- **When**: Immediately after order validation
- **Key**: OrderId

**Market Data Service** (Producer for price updates)
- **Topic**: `prices`
- **Event Type**: `PriceUpdate`
- **When**: When price changes detected
- **Key**: Symbol

**Order Processor** (Producer for execution events)
- **Topic**: `executions`
- **Event Type**: `OrderFilled`, `OrderCancelled`
- **When**: When order status changes
- **Key**: OrderId

### Consumer Services (Consume from Kafka)

**Order Processor** (Primary Consumer)
- **Topic**: `orders`
- **Consumer Group**: `order-processor-group`
- **Purpose**: Process orders using Actor model

**Risk Engine** (Consumer for price updates)
- **Topic**: `prices`
- **Consumer Group**: `risk-engine-group`
- **Purpose**: Update margin calculations based on price changes

**Market Data Service** (Consumer for price feeds)
- **Topic**: `price-feeds` (external)
- **Consumer Group**: `market-data-group`
- **Purpose**: Aggregate prices from multiple sources

**Frontend** (Consumer via WebSocket)
- **Topic**: `executions`, `price-updates`
- **Pattern**: Server-Sent Events or WebSocket
- **Purpose**: Real-time UI updates

---

## 🚀 Running Services Locally

### Prerequisites for Local Development

```bash
# Required services
- Docker Desktop (for Redis, Kafka, MongoDB)
- .NET 8 SDK
- Node.js 18+ (for frontend)
```

### Step 1: Start Local Infrastructure with Docker Compose

Create `docker-compose.yml` in project root:

```yaml
version: '3.8'

services:
  # Redis for idempotency
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis-data:/data

  # Zookeeper for Kafka
  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
    ports:
      - "2181:2181"

  # Kafka broker
  kafka:
    image: confluentinc/cp-kafka:7.5.0
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
      - "9093:9093"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092,PLAINTEXT_INTERNAL://kafka:29092
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,PLAINTEXT_INTERNAL:PLAINTEXT
      KAFKA_INTER_BROKER_LISTENER_NAME: PLAINTEXT_INTERNAL
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: "true"
    volumes:
      - kafka-data:/var/lib/kafka/data

  # MongoDB for DocumentDB simulation
  mongodb:
    image: mongo:7
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_DATABASE: crypto_oms
    volumes:
      - mongodb-data:/data/db

volumes:
  redis-data:
  kafka-data:
  mongodb-data:
```

**Start infrastructure:**
```bash
docker-compose up -d

# Verify services are running
docker-compose ps

# Expected output:
# redis      Up   0.0.0.0:6379->6379/tcp
# zookeeper  Up   0.0.0.0:2181->2181/tcp
# kafka      Up   0.0.0.0:9092->9092/tcp
# mongodb    Up   0.0.0.0:27017->27017/tcp
```

### Step 2: Create Kafka Topics

```bash
# Enter Kafka container
docker exec -it crypto-oms-aws-kafka-1 bash

# Create topics
kafka-topics.sh --create \
  --bootstrap-server localhost:9092 \
  --topic orders \
  --partitions 3 \
  --replication-factor 1

kafka-topics.sh --create \
  --bootstrap-server localhost:9092 \
  --topic executions \
  --partitions 3 \
  --replication-factor 1

kafka-topics.sh --create \
  --bootstrap-server localhost:9092 \
  --topic prices \
  --partitions 3 \
  --replication-factor 1

# List topics
kafka-topics.sh --list --bootstrap-server localhost:9092
```

### Step 3: Configure Local appsettings

**Order Ingestion API** (`services/OrderIngestion/appsettings.Development.json`):
```json
{
  "Redis": {
    "ConnectionString": "localhost:6379"
  },
  "Kafka": {
    "BootstrapServers": "localhost:9092",
    "OrdersTopic": "orders"
  },
  "Database": {
    "ConnectionString": "mongodb://localhost:27017/crypto_oms"
  }
}
```

**Order Processor** (`services/OrderProcessor/appsettings.Development.json`):
```json
{
  "Kafka": {
    "BootstrapServers": "localhost:9092",
    "OrdersTopic": "orders",
    "ConsumerGroup": "order-processor-group-local"
  },
  "Database": {
    "ConnectionString": "mongodb://localhost:27017/crypto_oms"
  },
  "ActorSystem": {
    "ClusterEnabled": false
  }
}
```

**Risk Engine** (`services/RiskEngine/appsettings.Development.json`):
```json
{
  "Database": {
    "ConnectionString": "mongodb://localhost:27017/crypto_oms"
  },
  "Redis": {
    "ConnectionString": "localhost:6379"
  }
}
```

**Market Data Service** (`services/MarketData/appsettings.Development.json`):
```json
{
  "Kafka": {
    "BootstrapServers": "localhost:9092",
    "PricesTopic": "prices"
  },
  "Redis": {
    "ConnectionString": "localhost:6379"
  },
  "WebSocket": {
    "Enabled": true,
    "Path": "/ws/market-data"
  }
}
```

### Step 4: Run Services Locally

**Terminal 1: Order Ingestion API**
```bash
cd services/OrderIngestion
dotnet run

# Expected: Application started. Listening on: http://localhost:5000
```

**Terminal 2: Order Processor**
```bash
cd services/OrderProcessor
dotnet run

# Expected: Kafka consumer started. Proto.Actor system initialized.
```

**Terminal 3: Risk Engine**
```bash
cd services/RiskEngine
dotnet run

# Expected: Application started. Listening on: http://localhost:5001
```

**Terminal 4: Market Data Service**
```bash
cd services/MarketData
dotnet run

# Expected: Application started. Listening on: http://localhost:5002
# WebSocket server started on: ws://localhost:5002/ws/market-data
```

### Step 5: Test Local Setup

```bash
# Test Order Ingestion API
curl -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: test-123" \
  -d '{
    "symbol": "BTC/USD",
    "side": "BUY",
    "quantity": 0.1,
    "price": 45000,
    "orderType": "LIMIT"
  }'

# Check Kafka for message
docker exec -it crypto-oms-aws-kafka-1 kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 \
  --topic orders \
  --from-beginning \
  --max-messages 1

# Check Redis for idempotency key
docker exec -it crypto-oms-aws-redis-1 redis-cli GET "idempotency:test-123"

# Check MongoDB for persisted order
docker exec -it crypto-oms-aws-mongodb-1 mongosh \
  --eval 'use crypto_oms; db.orders.find().pretty()'
```

---

## ☁️ Running Services on AWS

### Step 1: Deploy Infrastructure

Follow the [Deployment Guide](./DEPLOYMENT.md) to deploy AWS infrastructure:
- EKS cluster
- MSK Kafka cluster
- ElastiCache Redis
- DocumentDB cluster

### Step 2: Configure AWS appsettings

**Order Ingestion API** (`appsettings.Production.json`):
```json
{
  "Redis": {
    "ConnectionString": "${REDIS_ENDPOINT}:6379"
  },
  "Kafka": {
    "BootstrapServers": "${KAFKA_BOOTSTRAP_SERVERS}",
    "OrdersTopic": "orders"
  },
  "Database": {
    "ConnectionString": "mongodb://${DOCUMENTDB_ENDPOINT}:27017/?ssl=true&sslCAFile=/etc/ssl/certs/rds-ca-2019-root.pem"
  }
}
```

### Step 3: Build Docker Images

```bash
# Build Order Ingestion API
cd services/OrderIngestion
docker build -t crypto-oms/order-ingestion:latest .

# Build Order Processor
cd ../OrderProcessor
docker build -t crypto-oms/order-processor:latest .

# Build Risk Engine
cd ../RiskEngine
docker build -t crypto-oms/risk-engine:latest .

# Build Market Data Service
cd ../MarketData
docker build -t crypto-oms/market-data:latest .
```

### Step 4: Push to AWS ECR

```bash
# Get AWS account ID and region
AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=$(aws configure get region)

# Create ECR repositories
aws ecr create-repository --repository-name crypto-oms/order-ingestion
aws ecr create-repository --repository-name crypto-oms/order-processor
aws ecr create-repository --repository-name crypto-oms/risk-engine
aws ecr create-repository --repository-name crypto-oms/market-data

# Login to ECR
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin $AWS_ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com

# Tag and push images
docker tag crypto-oms/order-ingestion:latest \
  $AWS_ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com/crypto-oms/order-ingestion:latest

docker push $AWS_ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com/crypto-oms/order-ingestion:latest

# Repeat for other services...
```

### Step 5: Get AWS Service Endpoints

```bash
cd terraform

# Get Redis endpoint
REDIS_ENDPOINT=$(terraform output -raw redis_endpoint)

# Get Kafka bootstrap servers
KAFKA_BOOTSTRAP=$(terraform output -raw kafka_bootstrap_servers)

# Get DocumentDB endpoint
DOCUMENTDB_ENDPOINT=$(terraform output -raw documentdb_endpoint)
```

### Step 6: Create Kubernetes ConfigMap

```bash
kubectl create namespace crypto-oms

# Create ConfigMap with AWS service endpoints
kubectl create configmap app-config -n crypto-oms \
  --from-literal=redis-endpoint=$REDIS_ENDPOINT \
  --from-literal=kafka-bootstrap-servers=$KAFKA_BOOTSTRAP \
  --from-literal=documentdb-endpoint=$DOCUMENTDB_ENDPOINT
```

### Step 7: Deploy Services to EKS

See [Development Guide - Kubernetes Deployment](./DEVELOPMENT.md#-kubernetes-deployment) for detailed Kubernetes manifests.

---

## 🔄 Service Communication Flow

### Complete Order Flow (Local & AWS)

```
1. Frontend → Order Ingestion API (REST)
   ↓
2. Order Ingestion API checks Redis (idempotency)
   ↓
3. Order Ingestion API publishes to Kafka (topic: orders)
   ↓
4. Order Processor consumes from Kafka
   ↓
5. Order Processor creates Order Actor
   ↓
6. Order Actor sends validation request to Risk Engine (HTTP)
   ↓
7. Risk Engine validates order
   ↓
8. Risk Engine returns result to Order Actor
   ↓
9. Order Actor persists order to DocumentDB
   ↓
10. Order Actor publishes execution event to Kafka (topic: executions)
   ↓
11. Market Data Service consumes execution event
   ↓
12. Market Data Service updates order book in Redis
   ↓
13. Market Data Service publishes price update to WebSocket clients
   ↓
14. Frontend receives real-time update
```

### Service Endpoints

| Service | Local Port | AWS Endpoint | Purpose |
|---------|-----------|--------------|---------|
| Order Ingestion API | 5000 | ALB → EKS Service | Order placement |
| Risk Engine | 5001 | ALB → EKS Service | Risk validation |
| Market Data Service | 5002 | ALB → EKS Service | Market data queries |
| Order Processor | N/A (Background) | EKS Pod (no ingress) | Order processing |
| WebSocket (Market Data) | ws://localhost:5002/ws | wss://ALB/ws/market-data | Real-time updates |

---

## 📊 Proto.Actor Architecture Deep Dive

### Why Proto.Actor for Order Processing?

1. **Concurrent Order Processing**: Each order processed by isolated actor
2. **State Isolation**: Order state changes don't affect other orders
3. **Fault Tolerance**: Actor crashes don't affect other orders
4. **Scalability**: Spawn thousands of actors for thousands of orders
5. **Message-Driven**: Asynchronous, non-blocking operations

### Actor Lifecycle

```
OrderCreated Event → Spawn Order Actor
  ↓
Order Actor receives OrderCreatedEvent
  ↓
Order Actor requests Risk Validation
  ↓
Order Actor receives RiskValidationResult
  ↓
Order Actor persists to DocumentDB
  ↓
Order Actor publishes Execution Event
  ↓
Order Actor can be passivated (state saved to DocumentDB)
```

### Actor Clustering (Production)

For production, Proto.Actor supports clustering:

```csharp
// Cluster configuration
var clusterConfig = new ClusterConfig(
    "crypto-oms",
    "order-processor",
    "consul",
    new ConsulProvider(new ConsulProviderOptions())
);

var system = new ActorSystem()
    .WithCluster(clusterConfig);

// Actors can be accessed across nodes
var actor = cluster.GetAsync("order-123").Result;
await cluster.RequestAsync<OrderStatus>(actor, new GetOrderStatus());
```

---

## 🔧 Development Workflow

### Local Development Workflow

1. **Start Infrastructure**: `docker-compose up -d`
2. **Run Services**: Each service in separate terminal
3. **Test API**: Use curl or Postman
4. **Monitor Kafka**: `kafka-console-consumer.sh`
5. **Monitor Redis**: `redis-cli monitor`
6. **Check MongoDB**: `mongosh`

### AWS Deployment Workflow

1. **Deploy Infrastructure**: `terraform apply`
2. **Build Docker Images**: Build locally or in CI/CD
3. **Push to ECR**: Tag and push images
4. **Create ConfigMaps**: Kubernetes configuration
5. **Deploy to EKS**: `kubectl apply`
6. **Monitor**: CloudWatch logs and metrics

---

*Last Updated: January 2025*
