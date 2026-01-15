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

## How It Works

### Request Flow

1. **Client Request**: Frontend sends HTTP POST to `/api/orders` with order details and `X-Idempotency-Key` header
2. **Idempotency Check**: Service checks Redis for existing idempotency key
   - If found: Returns cached response immediately (prevents duplicate orders)
   - If not found: Proceeds with order processing
3. **Validation**: FluentValidation validates request data (symbol, quantity, price, etc.)
4. **Order Creation**: Creates `Order` object with unique `OrderId` (GUID)
5. **Kafka Publishing**: Publishes `OrderCreatedEvent` to Kafka `orders` topic
   - Key: OrderId (ensures ordering per order)
   - Acks: All (waits for all replicas to acknowledge)
6. **Cache Response**: Stores order response in Redis with 24-hour TTL
7. **Return Response**: Returns order details to client immediately

### Idempotency Mechanism

**Purpose**: Prevent duplicate order processing if client retries request

**Implementation**:
- Client generates unique idempotency key (e.g., `{userId}-{timestamp}-{random}`)
- Key format in Redis: `idempotency:{client-key}`
- TTL: 24 hours
- If key exists, returns cached response without processing

**Example**:
```csharp
// First request
POST /api/orders
X-Idempotency-Key: user123-1234567890-abc
→ Processes order, returns OrderId: "order-123"

// Retry with same key
POST /api/orders
X-Idempotency-Key: user123-1234567890-abc
→ Returns cached response with OrderId: "order-123" (no duplicate processing)
```

### Kafka Integration

**Topic**: `orders` (configurable via `Kafka:OrdersTopic`)

**Message Format**:
```json
{
  "orderId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "user123",
  "symbol": "BTC/USD",
  "side": "BUY",
  "orderType": "LIMIT",
  "quantity": 0.1,
  "price": 45000,
  "timestamp": "2025-01-14T10:31:00Z",
  "idempotencyKey": "user123-1234567890-abc"
}
```

**Producer Configuration**:
- **Acks**: All (durability guarantee - waits for all replicas)
- **Compression**: Snappy (reduces network overhead)
- **Idempotence**: Enabled (prevents duplicate messages)
- **Retries**: 3 attempts with exponential backoff

**Consumer**: Order Processor Service consumes from this topic

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
Get order status (not yet implemented - requires DocumentDB integration).

### GET /api/orders
List orders with filters (not yet implemented - requires DocumentDB integration).

### GET /health
Health check endpoint. Checks Redis and Kafka connectivity.

**Response:**
```json
{
  "status": "Healthy",
  "timestamp": "2025-01-14T10:31:00Z",
  "checks": {
    "redis": "Healthy",
    "kafka": "Healthy"
  }
}
```

### GET /ready
Readiness check endpoint (same as health check).

## Configuration

### appsettings.json

```json
{
  "ConnectionStrings": {
    "Redis": "localhost:6379"
  },
  "Kafka": {
    "BootstrapServers": "localhost:9092",
    "OrdersTopic": "orders"
  },
  "Serilog": {
    "MinimumLevel": {
      "Default": "Information"
    }
  }
}
```

### Environment Variables

- `ConnectionStrings:Redis` - Redis connection string
- `Kafka:BootstrapServers` - Kafka bootstrap servers (comma-separated)
- `Kafka:OrdersTopic` - Kafka topic name (default: "orders")

## Running Locally

### Prerequisites

- .NET 8 SDK
- Docker Desktop (for Redis and Kafka)
- Redis running on localhost:6379
- Kafka running on localhost:9092

### Step 1: Start Infrastructure

```bash
# From project root, start Docker Compose
cd ../..
docker-compose up -d redis kafka zookeeper mongodb

# Verify services are running
docker-compose ps
```

### Step 2: Create Kafka Topic

```bash
# Enter Kafka container
docker exec -it crypto-oms-aws-kafka-1 bash

# Create orders topic
kafka-topics.sh --create \
  --bootstrap-server localhost:9092 \
  --topic orders \
  --partitions 3 \
  --replication-factor 1

# Verify topic created
kafka-topics.sh --list --bootstrap-server localhost:9092
```

### Step 3: Run Service

```bash
cd services/OrderIngestion

# Restore dependencies
dotnet restore

# Run the application
dotnet run

# Service will start on http://localhost:5000
```

### Step 4: Access Swagger UI

```
http://localhost:5000/swagger
```

## Testing Locally

### Using curl

```bash
# Place an order
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

# Test idempotency (same key, should return cached response)
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

# Health check
curl http://localhost:5000/health
```

### Using Swagger

1. Navigate to `http://localhost:5000/swagger`
2. Expand the `POST /api/orders` endpoint
3. Click "Try it out"
4. Enter the request body and idempotency key in headers
5. Click "Execute"

### Verify Kafka Message

```bash
# Consume from Kafka to verify message was published
docker exec -it crypto-oms-aws-kafka-1 kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 \
  --topic orders \
  --from-beginning \
  --max-messages 1
```

### Verify Redis Cache

```bash
# Check idempotency key in Redis
docker exec -it crypto-oms-aws-redis-1 redis-cli GET "idempotency:test-123"
```

## Running on AWS

### Prerequisites

- AWS account with EKS cluster deployed
- ECR repository created
- AWS CLI configured
- kubectl configured for EKS cluster
- Terraform outputs available (Redis endpoint, Kafka bootstrap servers)

### Step 1: Get AWS Service Endpoints

```bash
cd ../../terraform

# Get Redis endpoint
REDIS_ENDPOINT=$(terraform output -raw redis_endpoint)

# Get Kafka bootstrap servers
KAFKA_BOOTSTRAP=$(terraform output -raw kafka_bootstrap_servers)

# Get EKS cluster name
EKS_CLUSTER=$(terraform output -raw eks_cluster_name)

# Configure kubectl
aws eks update-kubeconfig --name $EKS_CLUSTER --region us-east-1
```

### Step 2: Build Docker Image

```bash
cd ../services/OrderIngestion

# Build image
docker build -t crypto-oms/order-ingestion:latest .

# Get AWS account ID and region
AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=$(aws configure get region)

# Create ECR repository (if not exists)
aws ecr create-repository \
  --repository-name crypto-oms/order-ingestion \
  --region $AWS_REGION || true

# Login to ECR
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin \
  $AWS_ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com

# Tag image
docker tag crypto-oms/order-ingestion:latest \
  $AWS_ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com/crypto-oms/order-ingestion:latest

# Push image
docker push \
  $AWS_ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com/crypto-oms/order-ingestion:latest
```

### Step 3: Deploy to Kubernetes

```bash
cd ../../k8s

# Create namespace (if not exists)
kubectl create namespace crypto-oms || true

# Apply ConfigMap (update with your values)
kubectl apply -f configmaps/app-config.yaml

# Apply Secrets (update with your values)
kubectl apply -f secrets/app-secrets.yaml

# Apply Deployment
kubectl apply -f deployments/order-ingestion-deployment.yaml

# Apply Service
kubectl apply -f services/order-ingestion-service.yaml

# Apply HPA (Horizontal Pod Autoscaler)
kubectl apply -f deployments/order-ingestion-hpa.yaml

# Verify deployment
kubectl get pods -n crypto-oms -l app=order-ingestion
kubectl get svc -n crypto-oms -l app=order-ingestion
```

### Step 4: Verify Deployment

```bash
# Check pod status
kubectl get pods -n crypto-oms -l app=order-ingestion

# Check pod logs
kubectl logs -n crypto-oms -l app=order-ingestion --tail=50

# Check service endpoints
kubectl get endpoints -n crypto-oms order-ingestion

# Port forward for testing
kubectl port-forward -n crypto-oms svc/order-ingestion 5000:80

# Test health endpoint
curl http://localhost:5000/health
```

### Step 5: Configure ALB (Application Load Balancer)

The ALB should route `/api/orders/*` to the Order Ingestion service. This is typically configured via AWS Load Balancer Controller or Ingress.

## Docker

### Build Image

```bash
docker build -t crypto-oms/order-ingestion:latest .
```

### Run Container Locally

```bash
docker run -p 5000:80 \
  -e ConnectionStrings__Redis=redis:6379 \
  -e Kafka__BootstrapServers=kafka:9092 \
  crypto-oms/order-ingestion:latest
```

### Run with Docker Compose

```yaml
# docker-compose.yml
services:
  order-ingestion:
    build: ./services/OrderIngestion
    ports:
      - "5000:80"
    environment:
      ConnectionStrings__Redis: "redis:6379"
      Kafka__BootstrapServers: "kafka:9092"
    depends_on:
      - redis
      - kafka
```

## Health Checks

- `/health` - Overall health check (Redis + Kafka)
  - Returns 200 if both services are healthy
  - Returns 503 if any service is unhealthy
- `/ready` - Readiness check (same as health)

**Health Check Logic**:
1. Tests Redis connection (PING command)
2. Tests Kafka connection (metadata request)
3. Returns aggregated status

## Logging

Uses Serilog for structured logging:
- **Console Output**: JSON format in production, readable in development
- **Log Levels**: 
  - Development: Debug
  - Production: Information
- **Request/Response Logging**: Enabled for all API endpoints
- **Correlation IDs**: Each request gets unique correlation ID for tracing

**Log Format** (Production):
```json
{
  "Timestamp": "2025-01-14T10:31:00Z",
  "Level": "Information",
  "Message": "Order placed successfully",
  "OrderId": "550e8400-e29b-41d4-a716-446655440000",
  "CorrelationId": "abc-123"
}
```

## Error Handling

### Validation Errors (400 Bad Request)
- Missing required fields
- Invalid data types
- Business rule violations (e.g., negative quantity)

**Response**:
```json
{
  "errors": {
    "quantity": ["Quantity must be greater than 0"]
  }
}
```

### Kafka Errors (500 Internal Server Error)
- Broker unavailable
- Topic doesn't exist
- Network issues

**Handling**: Retries with exponential backoff (3 attempts)

### Redis Errors (Best Effort)
- If Redis is unavailable, idempotency check is skipped
- Order processing continues (idempotency is best-effort)
- Error is logged but doesn't fail the request

## Performance

- **Target Latency**: < 50ms (P95)
- **Throughput**: 1,000+ orders/second per pod
- **Scalability**: Horizontal scaling via Kubernetes HPA
- **Resource Usage**: 
  - CPU: 100-500m per pod
  - Memory: 256-512Mi per pod

## Security

- **Input Validation**: All inputs validated via FluentValidation
- **Idempotency**: Prevents duplicate order processing
- **TLS**: HTTPS in production (terminated at ALB)
- **CORS**: Configured for frontend domain
- **Rate Limiting**: Can be added via API Gateway or ALB

## Monitoring

### Metrics to Monitor

- **Request Rate**: Orders per second
- **Latency**: P50, P95, P99 response times
- **Error Rate**: 4xx and 5xx errors
- **Idempotency Hit Rate**: Percentage of requests using cached responses
- **Kafka Publish Success Rate**: Percentage of successful Kafka publishes

### Logs to Monitor

- Order placement events
- Kafka publish failures
- Redis connection errors
- Validation errors

## Troubleshooting

### Issue: Cannot connect to Redis

**Symptoms**: Health check fails, idempotency not working

**Solutions**:
1. Check Redis endpoint in configuration
2. Verify security group allows traffic from EKS
3. Check Redis cluster status in AWS Console
4. Verify connection string format

### Issue: Cannot publish to Kafka

**Symptoms**: Orders accepted but not appearing in Kafka

**Solutions**:
1. Check Kafka bootstrap servers configuration
2. Verify security group allows traffic from EKS
3. Check Kafka cluster status in AWS Console
4. Verify topic exists: `kafka-topics.sh --list --bootstrap-server <endpoint>`

### Issue: High latency

**Symptoms**: Response times > 200ms

**Solutions**:
1. Check Redis connection latency
2. Check Kafka publish latency
3. Monitor pod CPU/memory usage
4. Scale horizontally (increase pod replicas)

## Next Steps

- [ ] Implement GET /api/orders/{id} endpoint (requires DocumentDB integration)
- [ ] Implement GET /api/orders endpoint with filtering (requires DocumentDB integration)
- [ ] Add unit tests (target: 80% coverage)
- [ ] Add integration tests
- [ ] Add metrics collection (Prometheus)
- [ ] Add distributed tracing (OpenTelemetry)
- [ ] Implement rate limiting
- [ ] Add request/response compression