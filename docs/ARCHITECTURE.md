# 🏗️ System Architecture - Crypto OMS AWS

## 📐 Architecture Overview

This document provides a detailed technical architecture of the Crypto Order Management System, explaining each component, its responsibilities, and how they interact.

### 🔗 Related Files

- **Terraform Configuration**: [`../terraform/main.tf`](../terraform/main.tf) - Main infrastructure orchestration
- **Terraform Variables**: [`../terraform/variables.tf`](../terraform/variables.tf) - All configurable parameters
- **Terraform Outputs**: [`../terraform/outputs.tf`](../terraform/outputs.tf) - Output values after deployment
- **Cost-Optimized Config**: [`../terraform/terraform.tfvars.cost-optimized.example`](../terraform/terraform.tfvars.cost-optimized.example) - Cost-optimized configuration example

### 📋 Quick Reference

- **Total AWS Services**: 17 services/resources
- **Terraform Modules**: 8 modules
- **Estimated Deployment Time**: 20-30 minutes
- **Monthly Cost (Dev)**: ~$514/month
- **Availability Zones**: 2-3 (configurable)

---

## 🎯 Architecture Principles

1. **Microservices**: Loosely coupled, independently deployable services
2. **Event-Driven**: Asynchronous communication via Kafka
3. **Scalability**: Horizontal scaling via Kubernetes
4. **Resilience**: Fault tolerance and graceful degradation
5. **Security**: Defense in depth with encryption and isolation
6. **Observability**: Comprehensive logging, metrics, and tracing

---

## 🏗️ Infrastructure Overview (Terraform main.tf)

When you run `terraform apply` using the `main.tf` file, the following AWS services and resources will be created:

### AWS Services Created by main.tf

| # | AWS Service | Module | Purpose | Cost (Dev) | Optimization |
|---|------------|--------|---------|------------|--------------|
| 1 | **VPC** | `modules/vpc` | Virtual Private Cloud - Network isolation | Included | N/A |
| 2 | **Subnets** | `modules/vpc` | Public & Private subnets across AZs | Included | N/A |
| 3 | **Internet Gateway** | `modules/vpc` | Public internet access | Included | N/A |
| 4 | **NAT Gateway** | `modules/vpc` | Private subnet outbound access | ~$32/month | Use NAT Instance: -$25/month |
| 5 | **Security Groups** | `modules/vpc` | Firewall rules for all services | Included | N/A |
| 6 | **VPC Endpoints** | `modules/vpc` | Private AWS service access (S3, ECR) | ~$7/month | Already optimized |
| 7 | **EKS Cluster** | `modules/eks` | Kubernetes cluster for microservices | ~$72/month | Use ECS: -$72/month |
| 8 | **EKS Node Group** | `modules/eks` | EC2 instances for Kubernetes workers | ~$30/month | Use Spot: -$20/month |
| 9 | **MSK Cluster** | `modules/msk` | Managed Kafka for event streaming | ~$302/month | Self-hosted: -$250/month |
| 10 | **ElastiCache Redis** | `modules/redis` | In-memory cache for idempotency | ~$12/month | Already optimized |
| 11 | **DocumentDB Cluster** | `modules/documentdb` | MongoDB-compatible database | ~$50/month | RDS/Self-hosted: -$20-35/month |
| 12 | **Application Load Balancer** | `modules/alb` | Layer 7 load balancer | ~$16/month | Required |
| 13 | **S3 Bucket** | `modules/s3` | Static website hosting for frontend | ~$0.50/month | N/A |
| 14 | **KMS Keys** | `modules/kms` | Encryption keys (5 keys) | ~$5/month | N/A |
| 15 | **CloudWatch Logs** | `modules/eks`, `modules/msk` | Centralized logging | ~$5/month | N/A |
| 16 | **IAM Roles** | `modules/eks` | Service permissions | Included | N/A |
| 17 | **Secrets Manager** | `modules/documentdb` | Database credentials storage | ~$0.40/month | N/A |

**Total Estimated Monthly Cost (Development)**: ~$514/month

**💡 Cost Optimization Potential**: Can reduce to ~$90-250/month depending on optimization scenario (see Cost Optimization Guide below)

---

## 📊 Infrastructure Block Diagram

The following diagram shows the complete AWS infrastructure created by `terraform/main.tf`:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           INTERNET / USERS                                  │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │ HTTPS/HTTP
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    AWS REGION (e.g., us-east-1)                             │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         VPC (10.0.0.0/16)                             │  │
│  │                                                                       │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │              PUBLIC SUBNETS (AZ-1, AZ-2)                        │  │  │
│  │  │                                                                 │  │  │
│  │  │  ┌──────────────────────┐  ┌──────────────────────────────┐     │  │  │
│  │  │  │  Internet Gateway    │  │  Application Load Balancer   │     │  │  │
│  │  │  │  (Public Access)     │  │  (ALB)                       │     │  │  │
│  │  │  │                      │  │  - HTTP/HTTPS Listener       │     │  │  │
│  │  │  │                      │  │  - Target Groups             │     │  │  │
│  │  │  │                      │  │  - Health Checks             │     │  │  │
│  │  │  └──────────────────────┘  └───────────┬──────────────────┘     │  │  │
│  │  │                                        │                        │  │  │
│  │  │  ┌──────────────────────┐              │                        │  │  │
│  │  │  │  NAT Gateway         │              │                        │  │  │
│  │  │  │  (Private→Internet)  │              │                        │  │  │
│  │  │  │  + Elastic IP        │              │                        │  │  │
│  │  │  └──────────────────────┘              │                        │  │  │
│  │  │                                        │                        │  │  │
│  │  │  ┌──────────────────────┐              │                        │  │  │
│  │  │  │  S3 Bucket           │              │                        │  │  │
│  │  │  │  (Frontend Hosting)  │              │                        │  │  │
│  │  │  │  - Static Website    │              │                        │  │  │
│  │  │  │  - KMS Encryption    │              │                        │  │  │
│  │  │  └──────────────────────┘              │                        │  │  │
│  │  └────────────────────────────────────────┼────────────────────────┘  │  |
│  │                                           │                           │  │
│  │                                           │ (Routes to EKS)           │  │
│  │                                           ▼                           │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │            PRIVATE SUBNETS (AZ-1, AZ-2)                         │  │  │
│  │  │                                                                 │  │  │
│  │  │  ┌───────────────────────────────────────────────────────────┐  │  │  │
│  │  │  │  EKS CLUSTER (Kubernetes)                                 │  │  │  │
│  │  │  │  ┌─────────────────────────────────────────────────────┐  │  │  │  │
│  │  │  │  │  Control Plane (Managed by AWS)                     │  │  │  │  │
│  │  │  │  │  - API Server                                       │  │  │  │  │
│  │  │  │  │  - etcd                                             │  │  │  │  │
│  │  │  │  │  - KMS Encryption                                   │  │  │  │  │
│  │  │  │  └─────────────────────────────────────────────────────┘  │  │  │  │
│  │  │  │                                                           │  │  │  │
│  │  │  │  ┌─────────────────────────────────────────────────────┐  │  │  │  │
│  │  │  │  │  Node Group (EC2 Instances)                         │  │  │  │  │
│  │  │  │  │  - t3.small (dev) / t3.medium (prod)                │  │  │  │  │
│  │  │  │  │  - Auto-scaling (1-10 nodes)                        │  │  │  │  │
│  │  │  │  │  - IAM Roles for EKS                                │  │  │  │  │
│  │  │  │  │                                                     │  │  │  │  │
│  │  │  │  │  ┌──────────────┐  ┌──────────────┐                 │  │  │  │  │
│  │  │  │  │  │  Order       │  │  Order       │                 │  │  │  │  │
│  │  │  │  │  │  Ingestion   │  │  Processor   │                 │  │  │  │  │
│  │  │  │  │  │  Pods        │  │  Pods        │                 │  │  │  │  │
│  │  │  │  │  └──────────────┘  └──────────────┘                 │  │  │  │  │
│  │  │  │  │                                                     │  │  │  │  │
│  │  │  │  │  ┌──────────────┐  ┌──────────────┐                 │  │  │  │  │
│  │  │  │  │  │  Risk        │  │  Market Data │                 │  │  │  │  │
│  │  │  │  │  │  Engine      │  │  Service     │                 │  │  │  │  │
│  │  │  │  │  │  Pods        │  │  Pods        │                 │  │  │  │  │
│  │  │  │  │  └──────────────┘  └──────────────┘                 │  │  │  │  │
│  │  │  │  └─────────────────────────────────────────────────────┘  │  │  │  │
│  │  │  └───────────────────────────────────────────────────────────┘  │  │  │
│  │  │                                                                 │  │  │
│  │  │  ┌───────────────────────────────────────────────────────────┐  │  │  │
│  │  │  │  MSK CLUSTER (Apache Kafka)                               │  │  │  │
│  │  │  │  - 2-5 Brokers (kafka.t3.small)                           │  │  │  │
│  │  │  │  - Topics: orders, executions, prices                     │  │  │  │
│  │  │  │  - KMS Encryption                                         │  │  │  │
│  │  │  │  - CloudWatch Logs                                        │  │  │  │
│  │  │  └───────────────────────────────────────────────────────────┘  │  │  │
│  │  │                                                                 │  │  │
│  │  │  ┌───────────────────────────────────────────────────────────┐  │  │  │
│  │  │  │  ELASTICACHE REDIS                                        │  │  │  │
│  │  │  │  - cache.t3.micro (dev)                                   │  │  │  │
│  │  │  │  - Idempotency keys                                       │  │  │  │
│  │  │  │  - Hot data cache                                         │  │  │  │
│  │  │  │  - KMS Encryption                                         │  │  │  │
│  │  │  └───────────────────────────────────────────────────────────┘  │  │  │
│  │  │                                                                 │  │  │
│  │  │  ┌───────────────────────────────────────────────────────────┐  │  │  │
│  │  │  │  DOCUMENTDB CLUSTER (MongoDB-compatible)                  │  │  │  │
│  │  │  │  - db.t3.medium (dev)                                     │  │  │  │
│  │  │  │  - 1-3 Instances                                          │  │  │  │
│  │  │  │  - Order persistence                                      │  │  │  │
│  │  │  │  - KMS Encryption                                         │  │  │  │
│  │  │  │  - Secrets Manager (credentials)                          │  │  │  │
│  │  │  └───────────────────────────────────────────────────────────┘  │  │  │
│  │  │                                                                 │  │  │
│  │  │  ┌───────────────────────────────────────────────────────────┐  │  │  │
│  │  │  │  VPC ENDPOINTS                                            │  │  │  │
│  │  │  │  - S3 Gateway Endpoint                                    │  │  │  │
│  │  │  │  - ECR Interface Endpoints (dkr, api)                     │  │  │  │
│  │  │  │  - Reduces NAT Gateway costs                              │  │  │  │
│  │  │  └───────────────────────────────────────────────────────────┘  │  │  │
│  │  │                                                                 │  │  │
│  │  │  ┌───────────────────────────────────────────────────────────┐  │  │  │
│  │  │  │  SECURITY GROUPS (Firewall Rules)                         │  │  │  │
│  │  │  │  - alb-sg: Allow 80, 443 from internet                    │  │  │  │
│  │  │  │  - eks-sg: Allow from ALB, internal only                  │  │  │  │
│  │  │  │  - msk-sg: Allow 9092-9098 from EKS                       │  │  │  │
│  │  │  │  - redis-sg: Allow 6379 from EKS                          │  │  │  │
│  │  │  │  - documentdb-sg: Allow 27017 from EKS                    │  │  │  │
│  │  │  └───────────────────────────────────────────────────────────┘  │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  │                                                                       │  │
│  │  ┌───────────────────────────────────────────────────────────────┐    │  │
│  │  │  AWS KMS (Key Management Service)                             │    │  │
│  │  │  - EKS Encryption Key                                         │    │  │
│  │  │  - MSK Encryption Key                                         │    │  │
│  │  │  - Redis Encryption Key                                       │    │  │
│  │  │  - DocumentDB Encryption Key                                  │    │  │
│  │  │  - S3 Encryption Key                                          │    │  │
│  │  │  - Key Rotation Enabled                                       │    │  │
│  │  └───────────────────────────────────────────────────────────────┘    │  │
│  │                                                                       │  │
│  │  ┌───────────────────────────────────────────────────────────────┐    │  │
│  │  │  CLOUDWATCH                                                   │    │  │
│  │  │  - Log Groups (EKS, MSK)                                      │    │  │
│  │  │  - Metrics Collection                                         │    │  │
│  │  │  - Alarms (optional)                                          │    │  │
│  │  └───────────────────────────────────────────────────────────────┘    │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────┐
│  AWS IAM (Identity and Access Management)                                 │
│  - EKS Cluster Role                                                       │
│  - EKS Node Role                                                          │
│  - Service-specific permissions                                           │
└───────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────┐
│  AWS SECRETS MANAGER                                                      │
│  - DocumentDB credentials                                                 │
│  - Encrypted storage                                                      │
└───────────────────────────────────────────────────────────────────────────┘
```

### Network Flow Explanation

1. **Internet → ALB**: Users access the system via HTTPS/HTTP through the Application Load Balancer
2. **ALB → EKS**: ALB routes requests to EKS pods based on path-based routing
3. **EKS → MSK**: Order Ingestion API publishes orders to Kafka
4. **EKS → Redis**: Services check idempotency and cache data in Redis
5. **EKS → DocumentDB**: Order Processor persists orders to DocumentDB
6. **EKS → NAT Gateway**: Private subnets access internet via NAT Gateway for updates
7. **VPC Endpoints**: Direct private access to S3 and ECR (reduces NAT Gateway costs)

### Security Layers

1. **Network Level**: Security Groups restrict traffic between services
2. **Encryption**: All data encrypted at rest (KMS) and in transit (TLS)
3. **Network Isolation**: Private subnets for all data stores and compute
4. **IAM**: Service-specific roles with least-privilege access

---

## 🔗 Terraform Module to AWS Service Mapping

The following table shows how each module in `terraform/main.tf` maps to AWS services:

| Terraform Module | AWS Services Created | Key Resources |
|-----------------|---------------------|---------------|
| **`module "vpc"`** | VPC, Subnets, IGW, NAT Gateway | - 1 VPC<br>- 2-3 Public Subnets<br>- 2-3 Private Subnets<br>- 1 Internet Gateway<br>- 1-3 NAT Gateways<br>- 5 Security Groups<br>- Route Tables<br>- VPC Endpoints (S3, ECR) |
| **`module "kms"`** | KMS Keys | - 5 KMS Keys (EKS, MSK, Redis, DocumentDB, S3)<br>- 5 KMS Aliases<br>- Key rotation enabled |
| **`module "eks"`** | EKS Cluster, EC2 Instances, IAM | - 1 EKS Cluster<br>- 1 Managed Node Group<br>- 1-10 EC2 Instances (t3.small)<br>- 2 IAM Roles (Cluster, Node)<br>- CloudWatch Log Group |
| **`module "msk"`** | MSK Cluster | - 1 MSK Cluster<br>- 2-5 Kafka Brokers<br>- EBS Volumes (50GB each)<br>- CloudWatch Log Group |
| **`module "redis"`** | ElastiCache Redis | - 1 Redis Replication Group<br>- 1-5 Cache Nodes<br>- 1 Subnet Group |
| **`module "documentdb"`** | DocumentDB Cluster, Secrets Manager | - 1 DocumentDB Cluster<br>- 1-3 DocumentDB Instances<br>- 1 Subnet Group<br>- 1 Parameter Group<br>- 1 Secrets Manager Secret |
| **`module "alb"`** | Application Load Balancer | - 1 ALB<br>- 1 Target Group<br>- 2 Listeners (HTTP, HTTPS) |
| **`module "s3"`** | S3 Bucket | - 1 S3 Bucket<br>- Bucket Policy<br>- Website Configuration<br>- CORS Configuration |

### Module Dependencies

```
main.tf
├── module "vpc" (no dependencies)
├── module "kms" (no dependencies)
├── module "eks" (depends on: vpc, kms)
├── module "msk" (depends on: vpc, kms)
├── module "redis" (depends on: vpc, kms)
├── module "documentdb" (depends on: vpc, kms)
├── module "alb" (depends on: vpc)
└── module "s3" (depends on: kms)
```

### Resource Creation Order

When you run `terraform apply`, resources are created in this order:

1. **VPC Module** - Network foundation (VPC, subnets, gateways)
2. **KMS Module** - Encryption keys
3. **EKS Module** - Kubernetes cluster (depends on VPC and KMS)
4. **MSK Module** - Kafka cluster (depends on VPC and KMS)
5. **Redis Module** - ElastiCache (depends on VPC and KMS)
6. **DocumentDB Module** - Database cluster (depends on VPC and KMS)
7. **ALB Module** - Load balancer (depends on VPC)
8. **S3 Module** - Frontend hosting (depends on KMS)

**Estimated Creation Time**: 20-30 minutes for all resources

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

## 💰 Cost Optimization Guide

### Why Infrastructure Costs Are High

The current infrastructure costs approximately **$514/month** for a development environment. This section explains why each service costs what it does and provides strategies to reduce costs by 60-80% depending on your requirements.

### Cost Breakdown Analysis

| Service | Monthly Cost | % of Total | Why It's Expensive | Can Reduce? |
|---------|-------------|------------|-------------------|-------------|
| **MSK Cluster** | $302 | 59% | Managed service with HA guarantees, 2 brokers required | ✅ Yes - Biggest savings |
| **EKS Cluster** | $72 | 14% | Fixed monthly fee for managed Kubernetes control plane | ✅ Yes - Use ECS instead |
| **EKS Node Group** | $30 | 6% | EC2 instance costs for worker nodes | ✅ Yes - Use Spot instances |
| **DocumentDB** | $50 | 10% | Managed MongoDB service with backups and monitoring | ✅ Yes - Use RDS or self-hosted |
| **NAT Gateway** | $32 | 6% | Fixed hourly cost + data transfer fees | ✅ Yes - Use NAT instance or VPC endpoints only |
| **ElastiCache Redis** | $12 | 2% | Already at minimum size (cache.t3.micro) | ⚠️ Limited - Already optimized |
| **ALB** | $16 | 3% | Application Load Balancer base cost | ⚠️ Limited - Required for routing |
| **Other** | $10 | 2% | KMS, CloudWatch, Secrets Manager | ⚠️ Limited - Minimal costs |

**Key Insight**: MSK (Kafka) is the largest cost driver at 59% of total infrastructure costs.

---

### Service-by-Service Optimization Strategies

#### 1. MSK Cluster ($302/month) - **BIGGEST COST DRIVER**

**Why it's expensive:**
- Managed service with high availability guarantees
- 2 brokers × $151/month = $302/month
- Includes automatic replication, monitoring, patching, and management overhead
- Minimum 2 brokers required for production (no single broker option)

**Optimization Options:**

| Option | Monthly Cost | Savings | Trade-offs | Best For |
|--------|-------------|---------|------------|----------|
| **A: Self-hosted Kafka on EC2** | $30-60 | ~$250/month | You manage patches, backups, monitoring. Less reliable. | Learning & Development |
| **B: Use SQS/SNS instead** | $0-5 | ~$300/month | Different API, fewer features, no replay capability | Simple event streaming |
| **C: Reduce to 1 broker** | $151 | ~$151/month | ⚠️ **NOT RECOMMENDED** - No replication, data loss risk | Local testing only |
| **D: Keep MSK (Current)** | $302 | $0 | Fully managed, production-ready, high availability | Production environments |

**Recommendation:**
- **For Learning/Development**: Use self-hosted Kafka on EC2 (Option A) - saves $250/month
- **For Production**: Keep MSK (Option D) - worth the cost for reliability

**Implementation for Option A (Self-hosted Kafka):**
```hcl
# In terraform.tfvars
enable_msk = false  # Disable MSK module
enable_self_hosted_kafka = true  # Enable EC2-based Kafka
kafka_instance_type = "t3.medium"
kafka_instance_count = 1  # Single instance for dev
```

---

#### 2. EKS Cluster ($72/month) - **FIXED COST**

**Why it's expensive:**
- Fixed monthly fee for managed Kubernetes control plane
- $0.10/hour × 24 hours × 30 days = $72/month
- No way to reduce this cost (it's the service fee, not usage-based)
- Control plane runs 24/7 regardless of workload

**Optimization Options:**

| Option | Monthly Cost | Savings | Trade-offs | Best For |
|--------|-------------|---------|------------|----------|
| **A: Use ECS Fargate** | $0 (cluster fee) | $72/month | Different orchestration (not Kubernetes), pay per task | Learning AWS, simpler deployments |
| **B: Use ECS EC2** | $0 (cluster fee) | $72/month | No cluster fee, but you manage EC2 instances | Cost-sensitive deployments |
| **C: Local Docker Compose** | $0 | $72/month | Not cloud-native, different environment | Local development only |
| **D: Keep EKS (Current)** | $72 | $0 | Kubernetes experience, industry standard | Production, Kubernetes learning |

**Recommendation:**
- **For Learning AWS**: Use ECS Fargate (Option A) - saves $72/month, simpler
- **For Kubernetes Experience**: Keep EKS (Option D) - worth it for resume/learning

**Note**: EKS control plane cost cannot be reduced - it's a fixed fee. The only way to save is to use a different orchestration platform.

---

#### 3. EKS Node Group ($30/month)

**Why it's expensive:**
- EC2 instance costs: t3.small = ~$15/month per instance
- Current config shows $30/month (likely 2 nodes or includes data transfer)
- Worker nodes run 24/7 even when idle

**Optimization Options:**

| Option | Monthly Cost | Savings | Trade-offs | Best For |
|--------|-------------|---------|------------|----------|
| **A: Use Spot Instances** | $5-9 | ~$20/month | Can be interrupted (not ideal for production) | Development & testing |
| **B: Scale to 0 when idle** | $0 (when idle) | $30/month | Cold start time when scaling up | Intermittent workloads |
| **C: Use smaller instances** | $15 | $15/month | Already at minimum (t3.small) | Already optimized |
| **D: Keep current (ON-DEMAND)** | $30 | $0 | Reliable, no interruptions | Production workloads |

**Recommendation:**
- **For Development**: Use Spot Instances (Option A) - saves ~$20/month
- **For Production**: Keep ON-DEMAND (Option D) - reliability worth the cost

**Implementation for Option A (Spot Instances):**
```hcl
# In terraform.tfvars
use_spot_instances = true  # Enable Spot instances
eks_node_desired_size = 1  # Start with 1 node
```

---

#### 4. DocumentDB ($50/month)

**Why it's expensive:**
- Managed MongoDB-compatible service
- db.t3.medium = ~$50/month
- Includes automated backups, monitoring, high availability, patching

**Optimization Options:**

| Option | Monthly Cost | Savings | Trade-offs | Best For |
|--------|-------------|---------|------------|----------|
| **A: Use RDS PostgreSQL** | $30 | ~$20/month | Different database (SQL vs NoSQL), may require code changes | If SQL works for your use case |
| **B: Self-hosted MongoDB on EC2** | $15 | ~$35/month | You manage backups, patches, monitoring | Learning & development |
| **C: Use DynamoDB** | $5-20 | ~$30/month | Different data model, vendor lock-in, pay-per-request | Serverless architectures |
| **D: Keep DocumentDB (Current)** | $50 | $0 | Fully managed, MongoDB-compatible, production-ready | Production environments |

**Recommendation:**
- **For Learning**: Self-hosted MongoDB (Option B) - saves $35/month, learn database management
- **For Production**: Keep DocumentDB (Option D) or use RDS if SQL works

**Implementation for Option B (Self-hosted MongoDB):**
```hcl
# In terraform.tfvars
enable_documentdb = false  # Disable DocumentDB module
enable_self_hosted_mongodb = true  # Enable EC2-based MongoDB
mongodb_instance_type = "t3.small"
```

---

#### 5. NAT Gateway ($32/month)

**Why it's expensive:**
- Fixed cost: $0.045/hour = $32.40/month
- Plus data transfer costs: $0.045/GB
- Already optimized with single NAT Gateway (saves $64/month vs 3 NATs)

**Optimization Options:**

| Option | Monthly Cost | Savings | Trade-offs | Best For |
|--------|-------------|---------|------------|----------|
| **A: Use NAT Instance** | $7 | ~$25/month | Less reliable, you manage it, single point of failure | Development only |
| **B: Disable NAT Gateway** | $0 | $32/month | No internet access from private subnets, requires VPC endpoints for everything | Fully isolated environments |
| **C: Keep NAT Gateway (Current)** | $32 | $0 | Reliable, managed, high availability | Production environments |

**Recommendation:**
- **For Development**: Use NAT Instance (Option A) - saves $25/month
- **For Production**: Keep NAT Gateway (Option C) - reliability worth the cost

**Note**: VPC Endpoints are already configured to reduce NAT Gateway data transfer costs.

---

#### 6. ElastiCache Redis ($12/month)

**Why it's relatively cheap:**
- cache.t3.micro = ~$12/month
- Already at minimum size
- Small cost relative to other services

**Optimization Options:**

| Option | Monthly Cost | Savings | Trade-offs | Best For |
|--------|-------------|---------|------------|----------|
| **A: Self-hosted Redis on EC2** | $7 | ~$5/month | You manage it, less reliable | Development |
| **B: In-memory cache in app** | $0 | $12/month | Lost on restart, no persistence | Simple use cases |
| **C: Keep ElastiCache (Current)** | $12 | $0 | Managed, reliable, already cheap | All environments |

**Recommendation:**
- **Keep ElastiCache** - It's already cheap ($12/month) and fully managed. The savings from alternatives are minimal and not worth the operational overhead.

---

### Cost Optimization Scenarios

#### Scenario 1: Maximum Savings (Development/Learning)
**Target: ~$100-150/month | Savings: 77%**

**Changes:**
- Replace MSK with self-hosted Kafka on EC2: **-$250/month**
- Replace EKS with ECS Fargate: **-$72/month**
- Replace DocumentDB with self-hosted MongoDB: **-$35/month**
- Use NAT Instance instead of NAT Gateway: **-$25/month**
- Use Spot Instances for ECS: **-$10/month**

**New Cost Breakdown:**
```
ECS Fargate (no cluster fee):     $0
EC2 (Kafka + MongoDB):            $45/month
NAT Instance:                     $7/month
ElastiCache Redis:                $12/month
ALB:                              $16/month
Other (KMS, CloudWatch):          $10/month
───────────────────────────────────────────
TOTAL:                            ~$90/month
```

**Trade-offs:**
- ✅ 77% cost savings
- ❌ You manage Kafka and MongoDB (patches, backups, monitoring)
- ❌ No Kubernetes experience
- ❌ Less production-ready

**Best For:** Learning AWS fundamentals, cost-sensitive development

---

#### Scenario 2: Moderate Savings (Staging/Testing)
**Target: ~$250-300/month | Savings: 55%**

**Changes:**
- Keep EKS but use Spot Instances: **-$15/month**
- Replace MSK with self-hosted Kafka: **-$250/month**
- Replace DocumentDB with RDS PostgreSQL: **-$20/month**
- Keep NAT Gateway (already optimized)

**New Cost Breakdown:**
```
EKS Cluster:                      $72/month
EKS Nodes (Spot):                  $9/month
EC2 (Self-hosted Kafka):          $30/month
RDS PostgreSQL:                    $30/month
ElastiCache Redis:                $12/month
NAT Gateway:                       $32/month
ALB:                              $16/month
Other:                             $10/month
───────────────────────────────────────────
TOTAL:                            ~$211/month
```

**Trade-offs:**
- ✅ 55% cost savings
- ✅ Keep Kubernetes experience
- ❌ You manage Kafka
- ❌ SQL instead of MongoDB (may require code changes)

**Best For:** Staging environments, testing, Kubernetes learning with cost optimization

---

#### Scenario 3: Keep Managed Services (Production-Ready)
**Target: ~$400-450/month | Savings: 7%**

**Changes:**
- Use Spot Instances for EKS nodes: **-$15/month**
- Keep MSK (already at 2 brokers minimum): **-$0/month**
- Use RDS PostgreSQL instead of DocumentDB: **-$20/month**
- Keep everything else managed

**New Cost Breakdown:**
```
EKS Cluster:                      $72/month
EKS Nodes (Spot):                  $9/month
MSK (2 brokers):                  $302/month
RDS PostgreSQL:                    $30/month
ElastiCache Redis:                $12/month
NAT Gateway:                       $32/month
ALB:                              $16/month
Other:                             $10/month
───────────────────────────────────────────
TOTAL:                            ~$483/month
```

**Trade-offs:**
- ✅ All services fully managed
- ✅ Production-ready
- ✅ High availability
- ⚠️ Only 7% savings
- ⚠️ Still expensive due to MSK

**Best For:** Production environments, maximum reliability, minimal operational overhead

---

### Cost Comparison Summary

| Scenario | Monthly Cost | Savings | Managed Services | Best For |
|----------|-------------|---------|------------------|----------|
| **Current (Development)** | $514 | Baseline | All managed | Learning all services |
| **Maximum Savings** | $90 | 77% | Minimal | Cost-sensitive learning |
| **Moderate Savings** | $211 | 55% | Partial | Staging, Kubernetes learning |
| **Production-Ready** | $483 | 7% | All managed | Production environments |

---

### Implementation Guide

#### Step 1: Choose Your Optimization Scenario

Based on your goals:
- **Learning AWS on a budget** → Scenario 1 (Maximum Savings)
- **Learning Kubernetes + AWS** → Scenario 2 (Moderate Savings)
- **Production deployment** → Scenario 3 (Keep Managed Services)

#### Step 2: Update Terraform Configuration

Create a cost-optimized `terraform.tfvars` file:

**For Scenario 1 (Maximum Savings):**
```hcl
# Disable expensive managed services
enable_msk = false
enable_eks = false
enable_documentdb = false

# Enable self-hosted alternatives
enable_self_hosted_kafka = true
enable_ecs = true
enable_self_hosted_mongodb = true

# Use cheaper networking
enable_nat_gateway = false
use_nat_instance = true

# Cost-optimized instance sizes
kafka_instance_type = "t3.medium"
mongodb_instance_type = "t3.small"
```

**For Scenario 2 (Moderate Savings):**
```hcl
# Keep EKS but optimize
use_spot_instances = true
eks_node_desired_size = 1

# Replace MSK with self-hosted
enable_msk = false
enable_self_hosted_kafka = true

# Replace DocumentDB with RDS
enable_documentdb = false
enable_rds_postgresql = true
```

#### Step 3: Deploy and Monitor Costs

1. Apply Terraform changes: `terraform apply`
2. Monitor costs in AWS Cost Explorer
3. Set up billing alarms
4. Review costs weekly

#### Step 4: Iterate and Optimize

- Start with Scenario 1 for learning
- Move to Scenario 2 as you need Kubernetes
- Use Scenario 3 for production

---

### Alternative Architecture: ECS Instead of EKS

If you choose to replace EKS with ECS, here's the architecture difference:

**ECS Architecture:**
```
ALB → ECS Fargate Tasks (Order Ingestion, Order Processor, etc.)
     ↓
Self-hosted Kafka (EC2)
     ↓
RDS PostgreSQL (instead of DocumentDB)
     ↓
ElastiCache Redis
```

**Benefits:**
- No cluster fee ($72/month savings)
- Simpler deployment
- Pay only for running tasks

**Trade-offs:**
- No Kubernetes experience
- Different orchestration model
- Less industry-standard

---

### Alternative Architecture: SQS/SNS Instead of Kafka

If you choose to replace MSK with SQS/SNS:

**SQS/SNS Architecture:**
```
Order Ingestion API → SQS Queue → Order Processor
                    ↓
                  SNS Topic → Multiple Subscribers
```

**Benefits:**
- Much cheaper (~$5/month vs $302/month)
- Fully managed
- No infrastructure to manage

**Trade-offs:**
- Different API (not Kafka)
- No message replay
- Less features than Kafka
- May require code changes

---

### Cost Monitoring Best Practices

1. **Set Up Billing Alarms**
   ```bash
   # Create CloudWatch alarm for $50 threshold
   aws cloudwatch put-metric-alarm \
     --alarm-name billing-alarm \
     --metric-name EstimatedCharges \
     --threshold 50
   ```

2. **Use AWS Cost Explorer**
   - Review costs daily during development
   - Identify cost drivers
   - Set up cost budgets

3. **Tag All Resources**
   - Use consistent tags for cost allocation
   - Track costs by project/environment

4. **Regular Cleanup**
   - Run `terraform destroy` when not in use
   - Delete unused resources
   - Review and optimize monthly

---

### Quick Reference: Cost Optimization Checklist

- [ ] **MSK**: Consider self-hosted Kafka for development (saves $250/month)
- [ ] **EKS**: Consider ECS Fargate if Kubernetes not required (saves $72/month)
- [ ] **EKS Nodes**: Use Spot instances for development (saves ~$20/month)
- [ ] **DocumentDB**: Consider RDS PostgreSQL or self-hosted MongoDB (saves $20-35/month)
- [ ] **NAT Gateway**: Use NAT instance for development (saves $25/month)
- [ ] **Redis**: Keep ElastiCache (already optimized at $12/month)
- [ ] **Set up billing alarms** before deploying
- [ ] **Monitor costs daily** during active development
- [ ] **Destroy infrastructure** when not in use

---

## 🎮 Infrastructure Orchestration & Destruction

### Deploying All Services (Terraform Apply)

The infrastructure is orchestrated through `terraform/main.tf`, which creates all AWS services in the correct order with proper dependencies.

#### Step-by-Step Deployment Process

1. **Prerequisites**
   ```bash
   # Ensure you have:
   - AWS CLI configured with credentials
   - Terraform >= 1.0 installed
   - Appropriate IAM permissions
   - Billing alarm set up (CRITICAL!)
   ```

2. **Initialize Terraform**
   ```bash
   cd terraform
   terraform init
   ```
   - Downloads AWS provider plugins
   - Prepares backend for state management
   - Sets up Terraform working directory

3. **Configure Variables**
   ```bash
   # Copy example configuration
   cp terraform.tfvars.example terraform.tfvars
   
   # Edit terraform.tfvars with your values
   # - Set AWS region
   - Adjust instance types for cost optimization
   - Configure environment settings
   ```

4. **Review Deployment Plan**
   ```bash
   terraform plan
   ```
   - Shows all resources that will be created
   - Displays estimated costs (check the plan output)
   - **NO CHARGES YET** - this is just a preview

5. **Deploy Infrastructure**
   ```bash
   terraform apply
   ```
   - Creates all AWS resources
   - Estimated time: 20-30 minutes
   - You'll be prompted to confirm (type `yes`)

6. **Verify Deployment**
   ```bash
   # Check outputs
   terraform output
   
   # Verify in AWS Console
   # - EKS cluster should be creating
   # - MSK cluster should be creating
   # - All resources should be in "creating" state
   ```

#### Resource Creation Order

Terraform automatically creates resources in the correct dependency order:

```
1. VPC Module
   ↓
2. KMS Module (parallel with VPC)
   ↓
3. EKS Module (depends on VPC + KMS)
   ↓
4. MSK Module (depends on VPC + KMS)
   ↓
5. Redis Module (depends on VPC + KMS)
   ↓
6. DocumentDB Module (depends on VPC + KMS)
   ↓
7. ALB Module (depends on VPC)
   ↓
8. S3 Module (depends on KMS)
```

**Why This Order?**
- VPC must exist before any services that need networking
- KMS keys must exist before services that need encryption
- EKS/MSK/Databases need VPC subnets and security groups
- ALB needs public subnets
- S3 needs KMS for encryption

#### Deployment Time Estimates

| Service | Creation Time | Status |
|---------|--------------|--------|
| VPC & Networking | 1-2 minutes | Fast |
| KMS Keys | < 1 minute | Very fast |
| EKS Cluster | 10-15 minutes | Slow (managed service) |
| MSK Cluster | 10-15 minutes | Slow (managed service) |
| Redis | 5-10 minutes | Moderate |
| DocumentDB | 10-15 minutes | Slow (managed service) |
| ALB | 2-3 minutes | Fast |
| S3 | < 1 minute | Very fast |
| **Total** | **20-30 minutes** | |

---

### Destroying All Services (Terraform Destroy)

**⚠️ CRITICAL WARNING**: Destroying infrastructure will **PERMANENTLY DELETE** all resources and data. This cannot be undone!

#### Method 1: Using the Safe Destroy Script (Recommended)

The `destroy.sh` script provides extra safety checks:

```bash
cd terraform

# Interactive mode (recommended - safest)
./destroy.sh

# What the script does:
# 1. Checks Terraform and AWS CLI are installed
# 2. Verifies AWS credentials
# 3. Shows destroy plan
# 4. Displays cost estimates
# 5. Requires double confirmation
# 6. Backs up Terraform state
# 7. Destroys all resources
# 8. Verifies destruction
```

**Script Features:**
- ✅ Pre-flight checks
- ✅ Cost estimation before destruction
- ✅ Double confirmation prompts
- ✅ State backup
- ✅ Post-destruction verification
- ✅ Error handling

#### Method 2: Direct Terraform Destroy

If you prefer to use Terraform directly:

```bash
cd terraform

# 1. Review what will be destroyed (dry run)
terraform plan -destroy

# 2. Destroy all resources (requires confirmation)
terraform destroy

# 3. Auto-approve (no confirmation - DANGEROUS!)
terraform destroy -auto-approve
```

**⚠️ Warning**: Direct `terraform destroy -auto-approve` has no safety checks. Only use if you're absolutely certain!

#### Method 3: Selective Destruction

To destroy specific services only:

```bash
# Destroy only MSK (saves $302/month)
terraform destroy -target=module.msk

# Destroy only DocumentDB (saves $50/month)
terraform destroy -target=module.documentdb

# Destroy only EKS (saves $102/month)
terraform destroy -target=module.eks

# Destroy networking only (careful - breaks everything!)
terraform destroy -target=module.vpc
```

**⚠️ Warning**: Selective destruction can leave orphaned resources. Destroy everything together when possible.

---

### Destruction Order & Process

Terraform automatically destroys resources in reverse dependency order:

```
1. S3 Module (no dependencies)
   ↓
2. ALB Module (depends on VPC)
   ↓
3. DocumentDB Module (depends on VPC + KMS)
   ↓
4. Redis Module (depends on VPC + KMS)
   ↓
5. MSK Module (depends on VPC + KMS)
   ↓
6. EKS Module (depends on VPC + KMS)
   ↓
7. KMS Module (some services may still reference keys)
   ↓
8. VPC Module (destroyed last - breaks everything else)
```

**Important Notes:**
- Some resources may fail to delete if dependencies still exist
- Terraform will show errors for dependent resources
- You may need to run `terraform destroy` multiple times
- Check AWS Console for any remaining resources

---

### Safety Best Practices

#### Before Destroying

1. **Backup Important Data**
   ```bash
   # DocumentDB data will be LOST
   # Export any data you need before destroying
   
   # S3 bucket contents will be LOST
   # Download any files you need
   ```

2. **Set Billing Alarm**
   ```bash
   # Ensure billing alarm is active
   # You'll be notified of any unexpected charges
   ```

3. **Verify You're in Correct Account**
   ```bash
   aws sts get-caller-identity
   # Double-check AWS account ID
   ```

4. **Review Costs**
   ```bash
   # Check current daily costs in AWS Console
   # Know what you're about to stop paying for
   ```

#### During Destruction

1. **Use the Safe Script**
   - Run `./destroy.sh` instead of direct `terraform destroy`
   - Script provides confirmations and safety checks

2. **Watch for Errors**
   - Some resources may fail to delete
   - Note any errors for manual cleanup

3. **Be Patient**
   - Destruction takes 10-20 minutes
   - Some services (EKS, MSK) take longer to delete

#### After Destruction

1. **Verify in AWS Console**
   - Check EKS clusters are gone
   - Check MSK clusters are gone
   - Check DocumentDB clusters are gone
   - Check VPC is deleted

2. **Check Billing**
   ```bash
   # Wait 24 hours
   # Check AWS Cost Explorer
   # Verify no charges
   ```

3. **Clean Up State Files**
   ```bash
   # Optional: Remove local state if using remote backend
   rm -rf .terraform/
   rm -f terraform.tfstate*
   ```

---

### Troubleshooting Destruction

#### Issue: "Error: Resource still in use"

**Problem**: Resource cannot be deleted because another resource depends on it.

**Solution**:
```bash
# Check what's using the resource
terraform state list

# Destroy dependent resources first
terraform destroy -target=<dependent-resource>

# Then destroy the resource
terraform destroy -target=<resource>
```

#### Issue: "Error: Timeout waiting for cluster deletion"

**Problem**: EKS/MSK clusters take a long time to delete.

**Solution**:
```bash
# Wait longer (clusters can take 15-30 minutes to delete)
# Check AWS Console for cluster status
# Run terraform destroy again if needed
```

#### Issue: "Error: VPC has dependent resources"

**Problem**: VPC cannot be deleted until all resources are removed.

**Solution**:
```bash
# Destroy all resources first
terraform destroy

# If VPC still won't delete, check AWS Console manually
# Some resources may need manual deletion
```

#### Issue: Resources Still Exist After Destroy

**Problem**: Some resources remain in AWS Console.

**Solution**:
```bash
# Check Terraform state
terraform state list

# If resources exist in state but not AWS, refresh
terraform refresh

# If resources exist in AWS but not state, import them
terraform import <resource-address> <resource-id>

# Then destroy again
terraform destroy -target=<resource-address>
```

---

### Complete Orchestration Workflow

#### Full Deployment & Destruction Cycle

```bash
# ============================================================
# PHASE 1: DEPLOYMENT
# ============================================================

cd terraform

# 1. Initialize
terraform init

# 2. Configure
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars

# 3. Plan
terraform plan -out=tfplan

# 4. Review plan (check costs!)
cat tfplan  # or review in terminal

# 5. Apply
terraform apply tfplan

# 6. Get outputs (connection strings, endpoints)
terraform output

# ============================================================
# PHASE 2: USAGE
# ============================================================

# Deploy your applications to EKS
# Connect to services using outputs from terraform output

# ============================================================
# PHASE 3: CLEANUP
# ============================================================

# 1. Backup any important data
# 2. Review costs
# 3. Destroy using safe script
./destroy.sh

# OR destroy directly (if you're sure)
terraform destroy

# 4. Verify in AWS Console
# 5. Check billing after 24 hours
```

---

### Quick Reference Commands

#### Deployment Commands

```bash
# Initialize
terraform init

# Plan deployment
terraform plan

# Apply changes
terraform apply

# Show current state
terraform show

# List all resources
terraform state list

# Show outputs
terraform output
```

#### Destruction Commands

```bash
# Safe destroy (recommended)
./destroy.sh

# Plan destruction (dry run)
terraform plan -destroy

# Destroy with confirmation
terraform destroy

# Destroy specific resource
terraform destroy -target=module.msk

# Force destroy (dangerous - no confirmations)
terraform destroy -auto-approve
```

#### Verification Commands

```bash
# Verify AWS credentials
aws sts get-caller-identity

# List EKS clusters
aws eks list-clusters

# List MSK clusters
aws kafka list-clusters

# List DocumentDB clusters
aws docdb describe-db-clusters

# Check costs
aws ce get-cost-and-usage \
  --time-period Start=2025-01-01,End=2025-01-15 \
  --granularity DAILY \
  --metrics "BlendedCost"
```

---

### Resource Dependencies Map

Understanding dependencies helps with selective destruction:

```
VPC
├── EKS (needs VPC subnets + security groups)
├── MSK (needs VPC subnets + security groups)
├── Redis (needs VPC subnets + security groups)
├── DocumentDB (needs VPC subnets + security groups)
├── ALB (needs VPC public subnets + security groups)
└── NAT Gateway (needs VPC public subnet)

KMS
├── EKS (needs encryption key)
├── MSK (needs encryption key)
├── Redis (needs encryption key)
├── DocumentDB (needs encryption key)
└── S3 (needs encryption key)

ALB
└── EKS (routes traffic to EKS pods)

EKS
├── MSK (EKS pods connect to MSK)
├── Redis (EKS pods connect to Redis)
└── DocumentDB (EKS pods connect to DocumentDB)
```

**Rule**: Always destroy dependent resources before their dependencies.

---

*Last Updated: January 2025*

