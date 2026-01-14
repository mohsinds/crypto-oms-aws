# 📋 Crypto OMS AWS - Project Overview

## 🎯 Project Scope

This project is an **enterprise-scale Order Management System (OMS)** for cryptocurrency trading, built entirely on AWS cloud infrastructure. The system is designed to handle high-frequency trading with strict latency requirements and demonstrates modern microservices architecture principles.

### Core Objectives

1. **High Performance**: Handle 50,000+ orders/second with sub-100ms P99 latency
2. **Scalability**: Auto-scaling infrastructure that adapts to load
3. **Reliability**: Event-driven architecture with durability guarantees
4. **Security**: Multi-layer encryption and security best practices
5. **Learning**: Comprehensive documentation for AWS beginners

### Target Use Cases

- **Cryptocurrency Exchange**: Order matching and execution
- **Trading Platform**: Real-time order management
- **Portfolio Management**: Position tracking and risk management
- **Market Data**: Real-time price feeds and order book updates

---

## 🏗️ System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend (S3)                      │
│              Crypto Trading Dashboard                       │
└────────────────────────────┬────────────────────────────────┘
                             │ HTTPS
                             ▼
┌─────────────────────────────────────────────────────────────┐
│              Application Load Balancer (ALB)                │
│         SSL/TLS Termination | Rate Limiting                │
└────────────────────────────┬────────────────────────────────┘
                             │
                    ┌────────┴────────┐
                    │                 │
                    ▼                 ▼
        ┌───────────────────┐  ┌──────────────────┐
        │  Order Ingestion   │  │  Market Data      │
        │   API Service      │  │   API Service     │
        │  (.NET Core 8)     │  │  (.NET Core 8)    │
        └────────┬───────────┘  └────────┬──────────┘
                 │                      │
                 │  Publish             │  Subscribe
                 ▼                      ▼
        ┌─────────────────────────────────────────┐
        │      Apache Kafka (AWS MSK)             │
        │   Topics: orders, executions, prices     │
        └────────┬────────────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
┌──────────────┐  ┌──────────────────┐
│   Order      │  │   Risk Engine    │
│  Processor   │  │   Service        │
│ (Proto.Actor)│  │  (.NET Core 8)   │
└──────┬───────┘  └────────┬──────────┘
       │                   │
       │                   │
       ▼                   ▼
┌─────────────────────────────────────┐
│       Data Layer                    │
│  ┌──────────┐  ┌──────────────┐   │
│  │ MongoDB  │  │ Redis Cache   │   │
│  │ (Orders) │  │ (Idempotency)│   │
│  └──────────┘  └──────────────┘   │
└─────────────────────────────────────┘
```

### Technology Stack

#### Frontend
- **React** (Vite) - Modern UI framework
- **TypeScript** - Type-safe development
- **WebSocket** - Real-time updates

#### Backend Services
- **.NET Core 8** - High-performance API framework
- **Proto.Actor** - Actor model for concurrency
- **ASP.NET Core** - Web API framework

#### Infrastructure
- **AWS EKS** - Kubernetes orchestration
- **AWS MSK** - Managed Kafka
- **ElastiCache Redis** - In-memory cache
- **DocumentDB** - MongoDB-compatible database
- **Application Load Balancer** - Traffic distribution
- **AWS KMS** - Encryption key management
- **S3** - Static website hosting

#### DevOps
- **Terraform** - Infrastructure as Code
- **Docker** - Containerization
- **Kubernetes** - Container orchestration

---

## 📊 Performance Requirements

| Metric | Target | Status |
|--------|--------|--------|
| Orders/Second | 50,000+ | ⏳ Pending |
| P99 Latency | < 100ms | ⏳ Pending |
| Availability | 99.9% | ⏳ Pending |
| Idempotency | 100% | ⏳ Pending |
| Data Durability | 100% | ⏳ Pending |

---

## 🔐 Security Features

- ✅ **Encryption at Rest**: KMS keys for all data stores
- ✅ **Encryption in Transit**: TLS 1.3 for all communications
- ✅ **Network Isolation**: Private subnets for all services
- ✅ **Security Groups**: Least-privilege firewall rules
- ✅ **IAM Roles**: Service-specific permissions
- ⏳ **Authentication**: OAuth2/JWT (Pending)
- ⏳ **Authorization**: RBAC (Pending)
- ⏳ **API Rate Limiting**: (Pending)

---

## 💰 Cost Structure

### Development Environment
- **Monthly Cost**: ~$514/month
- **Breakdown**:
  - EKS Cluster: $72
  - MSK (2 brokers): $302
  - ElastiCache: $12
  - DocumentDB: $50
  - EC2 (t3.small): $30
  - NAT Gateway: $32
  - ALB: $16

### Production Environment
- **Monthly Cost**: ~$1,500-2,000/month
- **Optimizations**: Multi-AZ, larger instances, redundancy

---

## 🎓 Learning Outcomes

After completing this project, you will understand:

1. **AWS Cloud Architecture**
   - VPC networking fundamentals
   - EKS/Kubernetes orchestration
   - Managed services (MSK, ElastiCache, DocumentDB)
   - Security best practices

2. **Microservices Design**
   - Service decomposition
   - Event-driven architecture
   - API design patterns
   - Data consistency strategies

3. **High-Performance Systems**
   - Concurrency patterns (Actor model)
   - Caching strategies
   - Idempotency implementation
   - Latency optimization

4. **DevOps Practices**
   - Infrastructure as Code (Terraform)
   - Container orchestration
   - CI/CD pipelines
   - Monitoring and observability

---

## 📅 Project Timeline

### Phase 1: Infrastructure (Week 1-2) ✅ COMPLETE
- [x] Terraform infrastructure code
- [x] VPC and networking
- [x] EKS cluster setup
- [x] MSK Kafka cluster
- [x] Redis and DocumentDB
- [x] ALB and S3 configuration

### Phase 2: Core Services (Week 3-4) ⏳ IN PROGRESS
- [ ] Order Ingestion API
- [ ] Order Processor with Proto.Actor
- [ ] Risk Engine Service
- [ ] Market Data Service

### Phase 3: Frontend (Week 5-6) ⏳ PENDING
- [ ] React trading dashboard
- [ ] Order entry form
- [ ] Order book visualization
- [ ] Position tracking

### Phase 4: Integration & Testing (Week 7-8) ⏳ PENDING
- [ ] End-to-end testing
- [ ] Performance testing
- [ ] Security audit
- [ ] Documentation completion

### Phase 5: Deployment & Monitoring (Week 9-10) ⏳ PENDING
- [ ] Production deployment
- [ ] Monitoring dashboards
- [ ] Alerting configuration
- [ ] Cost optimization

---

## 🎯 Success Criteria

The project will be considered complete when:

1. ✅ Infrastructure can be deployed with `terraform apply`
2. ⏳ All microservices are deployed to EKS
3. ⏳ Frontend is accessible via S3 website
4. ⏳ Orders can be placed and processed end-to-end
5. ⏳ System handles 1,000+ orders/second (initial target)
6. ⏳ P99 latency is under 200ms (initial target)
7. ⏳ All documentation is complete
8. ⏳ Cost monitoring is in place

---

## 📚 Documentation Structure

- **PROJECT_OVERVIEW.md** (This file) - High-level project scope
- **ARCHITECTURE.md** - Detailed system architecture
- **IMPLEMENTATION_STATUS.md** - What's done and what's remaining
- **HOW_IT_WORKS.md** - System operation and data flow
- **API_SPECIFICATION.md** - API endpoints and contracts
- **DEPLOYMENT_GUIDE.md** - Step-by-step deployment instructions
- **DEVELOPMENT_GUIDE.md** - Local development setup
- **TROUBLESHOOTING.md** - Common issues and solutions

---

*Last Updated: January 2025*
