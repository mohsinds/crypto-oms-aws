# 🏗️ System Architecture - Crypto OMS AWS

## 📐 Architecture Overview

This document provides a detailed technical architecture of the Crypto Order Management System, explaining each component, its responsibilities, and how they interact.

---

## 🎯 Architecture Principles

1. **Microservices**: Loosely coupled, independently deployable services
2. **Event-Driven**: Asynchronous communication via Kafka
3. **Scalability**: Horizontal scaling via Kubernetes
4. **Resilience**: Fault tolerance and graceful degradation
5. **Security**: Defense in depth with encryption and isolation
6. **Observability**: Comprehensive logging, metrics, and tracing

---

## 🏛️ System Layers

### Layer 1: Presentation Layer

#### React Frontend (S3)
- **Technology**: React 18 + Vite + TypeScript
- **Hosting**: AWS S3 Static Website Hosting
- **CDN**: CloudFront (optional)
- **Responsibilities**:
  - User interface for order entry
  - Real-time order book visualization
  - Position tracking
  - Trade history
  - WebSocket client for real-time updates

**Components**:
```
frontend/
├── src/
│   ├── components/
│   │   ├── OrderBook.tsx      # Order book display
│   │   ├── TradeForm.tsx      # Order entry form
│   │   ├── PositionTable.tsx # Position tracking
│   │   └── TradeHistory.tsx  # Trade history
│   ├── hooks/
│   │   ├── useOrders.ts      # Order API hooks
│   │   └── useWebSocket.ts   # WebSocket hook
│   ├── services/
│   │   ├── api.ts            # API client
│   │   └── websocket.ts      # WebSocket client
│   └── App.tsx
```

---

### Layer 2: API Gateway Layer

#### Application Load Balancer (ALB)
- **Type**: Application Load Balancer (Layer 7)
- **SSL/TLS**: Termination at ALB
- **Features**:
  - Path-based routing
  - Health checks
  - SSL/TLS termination
  - Request/response logging
  - Rate limiting (via WAF - optional)

**Routing Rules**:
- `/api/orders/*` → Order Ingestion API
- `/api/market-data/*` → Market Data API
- `/api/risk/*` → Risk Engine API
- `/health` → All services (health checks)

---

### Layer 3: Application Services Layer

#### Service 1: Order Ingestion API
- **Technology**: .NET Core 8, ASP.NET Core
- **Deployment**: EKS (Kubernetes)
- **Replicas**: 3-10 (auto-scaling)
- **Responsibilities**:
  - Receive order placement requests
  - Validate orders
  - Idempotency enforcement (Redis)
  - Publish orders to Kafka
  - Return immediate response

**API Endpoints**:
```
POST   /api/orders              # Place new order
GET    /api/orders/{id}         # Get order status
GET    /api/orders              # List orders (with filters)
GET    /health                  # Health check
GET    /ready                   # Readiness check
```

**Dependencies**:
- Redis (idempotency)
- Kafka (event publishing)
- DocumentDB (optional - for order lookup)

**Key Features**:
- Idempotency middleware
- Request validation
- Structured logging
- Metrics collection
- Circuit breaker pattern

---

#### Service 2: Order Processor
- **Technology**: .NET Core 8, Proto.Actor
- **Deployment**: EKS (Kubernetes)
- **Replicas**: 5-20 (auto-scaling)
- **Responsibilities**:
  - Consume orders from Kafka
  - Process orders via Actor model
  - Manage order state machine
  - Persist orders to DocumentDB
  - Publish execution events

**Actor Model**:
```
OrderActor
├── State: OrderState
├── Behaviors:
│   ├── OnOrderCreated()
│   ├── OnRiskValidated()
│   ├── OnOrderFilled()
│   └── OnOrderCancelled()
└── Persistence: DocumentDB
```

**Order State Machine**:
```
NEW → ACCEPTED → FILLED → SETTLED
  ↓       ↓
  └──→ REJECTED
  └──→ CANCELLED
```

**Dependencies**:
- Kafka (order consumption)
- DocumentDB (order persistence)
- Risk Engine (validation)

---

#### Service 3: Risk Engine
- **Technology**: .NET Core 8, ASP.NET Core
- **Deployment**: EKS (Kubernetes)
- **Replicas**: 2-5 (auto-scaling)
- **Responsibilities**:
  - Position tracking
  - Risk limit validation
  - Margin calculations
  - Real-time risk checks

**API Endpoints**:
```
POST   /api/risk/validate       # Validate order
GET    /api/risk/positions      # Get positions
GET    /api/risk/limits         # Get risk limits
```

**Risk Checks**:
- Position limits
- Margin requirements
- Daily loss limits
- Concentration limits
- Velocity checks

**Dependencies**:
- DocumentDB (position data)
- Redis (risk cache)

---

#### Service 4: Market Data Service
- **Technology**: .NET Core 8, ASP.NET Core
- **Deployment**: EKS (Kubernetes)
- **Replicas**: 2-5 (auto-scaling)
- **Responsibilities**:
  - Aggregate price feeds
  - Maintain order book
  - Publish market data events
  - WebSocket server for real-time updates

**API Endpoints**:
```
GET    /api/market-data/prices/{symbol}  # Get current price
GET    /api/market-data/orderbook/{symbol} # Get order book
WS     /ws/market-data                   # WebSocket stream
```

**Dependencies**:
- Kafka (price events)
- Redis (order book cache)

---

### Layer 4: Data Layer

#### Event Streaming: Apache Kafka (MSK)
- **Service**: AWS MSK (Managed Streaming for Kafka)
- **Brokers**: 2-5 (depending on environment)
- **Topics**:
  - `orders` (3 partitions, replication factor 3)
  - `executions` (3 partitions, replication factor 3)
  - `prices` (3 partitions, replication factor 3)
  - `risk-events` (3 partitions, replication factor 3)

**Kafka Configuration**:
- **Acks**: All (durability guarantee)
- **Retention**: 7 days
- **Compression**: Snappy
- **Partitioning**: By orderId (ensures ordering)

**Consumer Groups**:
- `order-processor-group` - Order Processor service
- `risk-engine-group` - Risk Engine service
- `market-data-group` - Market Data service

---

#### Cache: ElastiCache Redis
- **Service**: AWS ElastiCache for Redis
- **Node Type**: cache.t3.micro (dev) / cache.t3.medium (prod)
- **Use Cases**:
  - Idempotency keys (TTL: 24 hours)
  - Hot order data (TTL: 1 hour)
  - Order book cache (TTL: 1 second)
  - Session data (TTL: 30 minutes)

**Redis Structure**:
```
idempotency:{key} → Order (JSON)
order:{orderId} → Order (JSON)
orderbook:{symbol} → OrderBook (JSON)
position:{userId}:{symbol} → Position (JSON)
```

---

#### Database: DocumentDB
- **Service**: AWS DocumentDB (MongoDB-compatible)
- **Instance**: db.t3.medium (dev) / db.r5.large (prod)
- **Cluster Size**: 1 (dev) / 3 (prod)
- **Collections**:
  - `orders` - Order documents
  - `executions` - Trade execution records
  - `positions` - User positions
  - `users` - User accounts

**Indexes**:
```javascript
// orders collection
{ orderId: 1 } // Unique
{ userId: 1, createdAt: -1 }
{ symbol: 1, status: 1 }
{ createdAt: -1 }

// positions collection
{ userId: 1, symbol: 1 } // Unique compound
```

**Backup Strategy**:
- Automated daily backups
- 7-day retention
- Point-in-time recovery

---

### Layer 5: Infrastructure Layer

#### Compute: Amazon EKS
- **Service**: Amazon Elastic Kubernetes Service
- **Kubernetes Version**: 1.28
- **Node Group**: Managed node groups
- **Instance Types**: t3.small (dev) / t3.medium (prod)
- **Auto-scaling**: Cluster Autoscaler
- **Scaling Range**: 1-10 nodes (dev) / 3-50 nodes (prod)

**Namespace Structure**:
```
crypto-oms/
├── order-ingestion/
├── order-processor/
├── risk-engine/
└── market-data/
```

**Resource Limits** (per service):
- CPU: 500m-2000m
- Memory: 512Mi-2Gi
- Replicas: 2-10 (HPA)

---

#### Networking: VPC
- **CIDR**: 10.0.0.0/16
- **Subnets**:
  - Public: 10.0.1.0/24, 10.0.2.0/24 (ALB, NAT)
  - Private: 10.0.11.0/24, 10.0.12.0/24 (EKS, MSK, DBs)
- **Availability Zones**: 2-3
- **NAT Gateway**: 1 (cost optimization) or 3 (HA)
- **VPC Endpoints**: S3, ECR (cost optimization)

**Security Groups**:
- `alb-sg`: Allow 80, 443 from internet
- `eks-sg`: Allow from ALB, internal only
- `msk-sg`: Allow 9092-9098 from EKS
- `redis-sg`: Allow 6379 from EKS
- `documentdb-sg`: Allow 27017 from EKS

---

#### Security: AWS KMS
- **Service**: AWS Key Management Service
- **Keys**:
  - EKS encryption key
  - MSK encryption key
  - Redis encryption key
  - DocumentDB encryption key
  - S3 encryption key
- **Rotation**: Enabled (annual)

---

## 🔄 Data Flow Diagrams

### Order Placement Flow

```
User → React App → ALB → Order Ingestion API
                                    ↓
                              Redis (Idempotency)
                                    ↓
                              Kafka (orders topic)
                                    ↓
                              Order Processor
                                    ↓
                              Risk Engine
                                    ↓
                              DocumentDB
                                    ↓
                              Kafka (executions topic)
                                    ↓
                              React App (WebSocket)
```

### Real-Time Price Update Flow

```
External Exchange → Market Data Service
                            ↓
                    Kafka (prices topic)
                            ↓
                    Redis (order book cache)
                            ↓
                    React App (WebSocket)
```

---

## 🔐 Security Architecture

### Network Security
- **Public Subnets**: Only ALB and NAT Gateway
- **Private Subnets**: All application services and data stores
- **Security Groups**: Least-privilege rules
- **VPC Endpoints**: Private AWS service access

### Data Security
- **Encryption at Rest**: KMS keys for all data stores
- **Encryption in Transit**: TLS 1.3 for all communications
- **Secrets Management**: AWS Secrets Manager
- **IAM Roles**: Service-specific permissions

### Application Security
- **Input Validation**: All API inputs validated
- **Rate Limiting**: Per-user and per-IP limits
- **Authentication**: OAuth2/JWT (future)
- **Authorization**: RBAC (future)

---

## 📊 Scalability Design

### Horizontal Scaling
- **EKS**: Auto-scaling node groups
- **Services**: HPA based on CPU/memory
- **Kafka**: Add partitions for more parallelism
- **Redis**: Cluster mode for high availability

### Vertical Scaling
- **Instance Types**: Upgrade as needed
- **Database**: Scale up instance class
- **Kafka**: Larger broker instances

### Load Distribution
- **ALB**: Distributes across EKS pods
- **Kafka**: Partitions distribute load
- **Redis**: Consistent hashing

---

## 🚨 Resilience Patterns

### Circuit Breaker
- **Implementation**: Polly (C#)
- **Threshold**: 50% failure rate
- **Timeout**: 30 seconds
- **Recovery**: Exponential backoff

### Retry Logic
- **Strategy**: Exponential backoff
- **Max Attempts**: 3
- **Initial Delay**: 100ms
- **Max Delay**: 5 seconds

### Health Checks
- **Liveness**: `/health` endpoint
- **Readiness**: `/ready` endpoint
- **Interval**: 30 seconds
- **Timeout**: 5 seconds

---

## 📈 Monitoring Architecture

### Metrics Collection
- **Prometheus**: Service metrics
- **CloudWatch**: AWS service metrics
- **Grafana**: Visualization dashboards

### Logging
- **Structured Logging**: JSON format
- **CloudWatch Logs**: Centralized logging
- **Log Levels**: DEBUG, INFO, WARN, ERROR
- **Correlation IDs**: Request tracing

### Alerting
- **CloudWatch Alarms**: Critical metrics
- **SNS Notifications**: Email/SMS alerts
- **PagerDuty**: (Optional) On-call integration

---

## 🔧 Configuration Management

### Environment Variables
- **Kubernetes ConfigMaps**: Non-sensitive config
- **Kubernetes Secrets**: Sensitive data
- **AWS Secrets Manager**: Database credentials

### Service Discovery
- **Kubernetes DNS**: Internal service discovery
- **Service Names**: `order-ingestion.crypto-oms.svc.cluster.local`

---

*Last Updated: January 2025*
