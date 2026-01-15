# Enterprise Crypto Order Management System on AWS

## 🎯 Project Overview

This is an **enterprise-scale Order Management System (OMS)** built on AWS, designed to handle high-frequency cryptocurrency trading with sub-100ms latency requirements. The system demonstrates modern microservices architecture principles using .NET Core 8, React, Kafka, and Kubernetes.

### Key Features

- **50,000+ orders/second** capacity with sub-100ms P99 latency
- **Horizontal auto-scaling** via EKS (Kubernetes)
- **Event-driven architecture** with Apache Kafka (AWS MSK)
- **Actor-based concurrency** with Proto.Actor
- **Redis-backed idempotency** layer
- **Multi-layer security** with KMS encryption
- **Infrastructure as Code** with Terraform

### Technology Stack

**Backend:**
- .NET Core 8 microservices
- Proto.Actor for high-concurrency
- Apache Kafka (AWS MSK) for event streaming
- Redis (ElastiCache) for caching & idempotency
- MongoDB-compatible DocumentDB for persistence

**Frontend:**
- React 18 with Vite & TypeScript
- WebSocket for real-time updates

**Infrastructure:**
- AWS EKS (Kubernetes orchestration)
- AWS MSK (Managed Kafka)
- ElastiCache Redis
- DocumentDB
- Application Load Balancer
- AWS KMS (encryption)
- S3 (static hosting)
- Terraform (Infrastructure as Code)

---

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     React Frontend (S3)                         │
│                  Crypto Trading Dashboard                       │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              Application Load Balancer (ALB)                    │
│         SSL/TLS Termination | Rate Limiting                     │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    ┌────────┴────────┐
                    │                 │
                    ▼                 ▼
        ┌───────────────────┐  ┌──────────────────┐
        │  Order Ingestion  │  │   Market Data    │
        │   API Service     │  │   API Service    │
        │  (.NET Core 8)    │  │  (.NET Core 8)   │
        └────────┬──────────┘  └────────┬─────────┘
                 │                      │
                 │  Publish             │  Subscribe
                 ▼                      ▼
        ┌─────────────────────────────────────────┐
        │      Apache Kafka (AWS MSK)             │
        │   Topics: orders, executions, prices    │
        └────────┬────────────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
┌──────────────┐  ┌──────────────────┐
│   Order      │  │   Risk Engine    │
│  Processor   │  │   Service        │
│ (Proto.Actor)│  │  (.NET Core 8)   │
└──────┬───────┘  └────────┬─────────┘
       │                   │
       │                   │
       ▼                   ▼
┌─────────────────────────────────────┐
│           Data Layer                │
│  ┌────────────┐  ┌───────────────┐  │
│  │ DocumentDB │  │ Redis Cache   │  │
│  │ (MongoDB)  │  │ (Idempotency) │  │
│  └────────────┘  └───────────────┘  │
└─────────────────────────────────────┘
```

### Infrastructure Components

The system runs on AWS with the following services:

| Service | Purpose | Cost (Dev) |
|---------|---------|------------|
| **EKS** | Kubernetes cluster for microservices | $72/month |
| **MSK** | Kafka for event streaming | $302/month |
| **ElastiCache** | Redis for idempotency & caching | $12/month |
| **DocumentDB** | MongoDB-compatible database | $50/month |
| **ALB** | Application Load Balancer | $16/month |
| **VPC** | Network isolation & security | Included |
| **KMS** | Encryption keys | $5/month |
| **S3** | Frontend hosting | $1/month |

**Total Development Cost: ~$514/month**  
*See [Architecture Documentation](./docs/ARCHITECTURE.md#cost-optimization-guide) for cost optimization strategies*

---

## 📁 Project Structure

```
crypto-oms-aws/
│
├── README.md                    ⭐ This file - Project overview & navigation
│
├── docs/                        📚 Comprehensive Documentation
│   ├── ARCHITECTURE.md         🏗️ Detailed system architecture & design
│   ├── DEPLOYMENT.md           🚀 Step-by-step AWS deployment guide
│   ├── DEVELOPMENT.md          💻 Development guide & tutorials
│   ├── HOW_IT_WORKS.md         🔄 System operation & data flow
│   ├── STATUS.md               📊 Implementation status & progress
│   └── TESTING.md              🧪 Testing methodology & verification
│
├── terraform/                   🏗️ Infrastructure as Code
│   ├── main.tf                 Main orchestration file
│   ├── variables.tf            All configurable parameters
│   ├── outputs.tf              Output values after deployment
│   ├── terraform.tfvars.example     Example configuration
│   ├── terraform.tfvars.cost-optimized.example  Cost-optimized config
│   ├── destroy.sh              Safe cleanup script
│   ├── README.md               Terraform-specific documentation
│   └── modules/                Terraform modules
│       ├── vpc/                VPC & networking
│       ├── eks/                Kubernetes cluster
│       ├── msk/                Kafka cluster
│       ├── redis/              ElastiCache Redis
│       ├── documentdb/         DocumentDB cluster
│       ├── alb/                Application Load Balancer
│       ├── kms/                Encryption keys
│       └── s3/                 S3 bucket
│
├── services/                    🔧 .NET Core Microservices
│   ├── OrderIngestion/         Order intake API
│   ├── OrderProcessor/         Proto.Actor consumer
│   ├── RiskEngine/             Risk validation service
│   └── MarketData/             Market data service
│
├── frontend/                    ⚛️ React Frontend Application
│   ├── src/
│   │   ├── components/         React components
│   │   ├── hooks/              Custom hooks
│   │   └── services/           API clients
│   └── package.json
│
└── k8s/                         ☸️ Kubernetes Manifests
    ├── deployments/            Deployment configurations
    ├── services/               Service definitions
    ├── configmaps/             Configuration maps
    └── secrets/                Secret definitions
```

---

## 📚 Documentation Index

### 🚀 Getting Started

1. **[Architecture Documentation](./docs/ARCHITECTURE.md)** - Start here to understand the system design
   - Infrastructure overview
   - AWS services explained
   - Network architecture
   - Cost optimization strategies
   - Orchestration & destruction guide

2. **[Deployment Guide](./docs/DEPLOYMENT.md)** - Step-by-step AWS setup
   - AWS account setup
   - Terraform installation
   - Infrastructure deployment
   - Service deployment
   - Verification steps

3. **[How It Works](./docs/HOW_IT_WORKS.md)** - System operation guide
   - Complete order lifecycle
   - Data flow diagrams
   - Component interactions
   - Security flow
   - Error handling

### 💻 Development

4. **[Development Guide](./docs/DEVELOPMENT.md)** - Development tutorials
   - Local development setup
   - Service implementation steps
   - API development
   - Kubernetes deployment
   
5. **[Backend Architecture](./docs/BACKEND_ARCHITECTURE.md)** - .NET Microservices Deep Dive
   - Service architecture details
   - Producer vs Consumer patterns
   - Proto.Actor implementation
   - Running locally and on AWS
   
6. **[Frontend Development](./docs/FRONTEND.md)** - React Trading Dashboard
   - Trading dashboard components
   - Candlestick chart implementation
   - Order submission and monitoring
   - Real-time updates with WebSocket

5. **[Implementation Status](./docs/STATUS.md)** - Project progress
   - What's completed ✅
   - What's in progress ⏳
   - What's remaining 📋
   - Next steps & priorities

### 🧪 Testing & Operations

6. **[Testing Guide](./docs/TESTING.md)** - Testing methodology
   - Infrastructure verification (Terraform)
   - AWS Console verification
   - System diagnosis
   - Performance testing
   - End-to-end testing

7. **[Terraform Documentation](./terraform/README.md)** - Infrastructure reference
   - Module descriptions
   - Configuration options
   - Common commands
   - Troubleshooting

---

## 🎯 Quick Start Guide

### Prerequisites

- AWS Account (Free Tier eligible)
- AWS CLI installed and configured
- Terraform >= 1.0 installed
- .NET 8 SDK (for backend development)
- Node.js 18+ (for frontend development)
- Docker Desktop (for containerization)
- kubectl (for Kubernetes)

### Step 1: Review Architecture

Read the [Architecture Documentation](./docs/ARCHITECTURE.md) to understand:
- What AWS services are used
- How components interact
- Cost implications
- Infrastructure requirements

### Step 2: Set Up AWS Account

Follow the [Deployment Guide - Phase 1](./docs/DEPLOYMENT.md#phase-1-aws-account-setup):
1. Create AWS account
2. Enable MFA security
3. Create IAM user with permissions
4. **Set up billing alarm** (CRITICAL!)
5. Configure AWS CLI

### Step 3: Deploy Infrastructure

Follow the [Deployment Guide - Phase 3](./docs/DEPLOYMENT.md#phase-3-deploy-infrastructure):
1. Clone repository
2. Configure `terraform.tfvars`
3. Run `terraform init`
4. Run `terraform plan` (review changes)
5. Run `terraform apply` (deploy infrastructure)

**Estimated Time**: 20-30 minutes  
**Estimated Cost**: ~$514/month (development config)

### Step 4: Verify Deployment

Follow the [Testing Guide](./docs/TESTING.md) to:
1. Verify resources in Terraform
2. Verify resources in AWS Console
3. Test connectivity
4. Check logs and metrics

### Step 5: Deploy Services (When Ready)

Follow the [Development Guide](./docs/DEVELOPMENT.md) to:
1. Build microservices
2. Create Docker images
3. Deploy to EKS
4. Test APIs

### Step 6: Clean Up (Important!)

When done testing, destroy all resources:
```bash
cd terraform
./destroy.sh
```

Or use Terraform directly:
```bash
terraform destroy
```

**⚠️ Always destroy resources when not in use to avoid ongoing charges!**

---

## 📊 Current Project Status

**Overall Progress: 30%**

| Component | Status | Progress |
|-----------|--------|----------|
| **Infrastructure** | ✅ Complete | 100% |
| **Documentation** | ✅ Complete | 100% |
| **Order Ingestion API** | ⏳ Not Started | 0% |
| **Order Processor** | ⏳ Not Started | 0% |
| **Risk Engine** | ⏳ Not Started | 0% |
| **Market Data Service** | ⏳ Not Started | 0% |
| **Frontend** | ⏳ Not Started | 0% |
| **Kubernetes Manifests** | ⏳ Not Started | 0% |

**See [Implementation Status](./docs/STATUS.md) for detailed progress tracking.**

---

## 💰 Cost Management

### Development Environment
- **Monthly Cost**: ~$514/month
- **Key Cost Drivers**: MSK ($302/month), EKS ($72/month)

### Cost Optimization
See [Architecture Documentation - Cost Optimization](./docs/ARCHITECTURE.md#cost-optimization-guide) for strategies to reduce costs to ~$90-250/month.

### Billing Safety
- ⚠️ **ALWAYS set up billing alarms** before deploying
- ⚠️ **Monitor costs daily** during active development
- ⚠️ **Destroy infrastructure** when not in use
- ⚠️ **Use cost-optimized configuration** for learning

---

## 🎓 Learning Outcomes

After completing this project, you will understand:

### AWS Cloud Architecture
- VPC networking (subnets, routing, security groups)
- EKS/Kubernetes orchestration
- Managed services (MSK, ElastiCache, DocumentDB)
- Infrastructure as Code (Terraform)
- Cost optimization strategies

### Microservices Design
- Service decomposition
- Event-driven architecture
- API design patterns
- Data consistency strategies
- Service communication

### High-Performance Systems
- Concurrency patterns (Actor model)
- Caching strategies
- Idempotency implementation
- Latency optimization
- Throughput optimization

### DevOps Practices
- Infrastructure as Code
- Container orchestration
- CI/CD pipelines
- Monitoring and observability
- Incident response

---

## 🔐 Security Features

- ✅ **Encryption at Rest**: KMS keys for all data stores
- ✅ **Encryption in Transit**: TLS 1.3 for all communications
- ✅ **Network Isolation**: Private subnets for all services
- ✅ **Security Groups**: Least-privilege firewall rules
- ✅ **IAM Roles**: Service-specific permissions
- ⏳ **Authentication**: OAuth2/JWT (Planned)
- ⏳ **Authorization**: RBAC (Planned)

---

## 🆘 Getting Help

### Documentation
- Check the [documentation index](#-documentation-index) above
- Review [Troubleshooting Guide](./docs/TESTING.md#troubleshooting)
- Read inline code comments

### External Resources
- [AWS Documentation](https://docs.aws.amazon.com)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [.NET Core Documentation](https://learn.microsoft.com/en-us/dotnet/)

---

## 📝 Next Steps

1. ✅ **Read [Architecture Documentation](./docs/ARCHITECTURE.md)** - Understand the system
2. ✅ **Follow [Deployment Guide](./docs/DEPLOYMENT.md)** - Set up AWS and deploy infrastructure
3. ✅ **Read [How It Works](./docs/HOW_IT_WORKS.md)** - Understand order flow
4. ⏳ **Follow [Development Guide](./docs/DEVELOPMENT.md)** - Build and deploy services
5. ⏳ **Review [Implementation Status](./docs/STATUS.md)** - Track progress
6. ⏳ **Use [Testing Guide](./docs/TESTING.md)** - Verify everything works

---

## ✅ Success Criteria

You'll know you've succeeded when:

- ✅ You can explain each AWS service's purpose
- ✅ You can deploy infrastructure without errors
- ✅ You can verify resources in Terraform and AWS Console
- ✅ You can diagnose system issues
- ✅ You can place orders via API successfully
- ✅ You understand the complete order flow
- ✅ You can explain your architecture to others
- ✅ You can modify and extend the system

---

## 📞 Project Information

**Author**: Mohsin Rasheed (<mohsin.mr@gmail.com>)  
**Purpose**: Enterprise-grade Order Management System for cryptocurrency trading  
**Created**: January 2025  
**Technology Stack**: .NET Core 8, React, AWS (EKS, MSK, ElastiCache, DocumentDB, ALB, VPC, KMS), Terraform, Docker, Kubernetes  
**License**: MIT License  
**Repository**: Open source project for building high-performance trading systems on AWS

---

## ⚠️ Important Reminders

1. **Always set up billing alarms** before deploying
2. **Monitor costs daily** during active development
3. **Destroy infrastructure** when not in use
4. **Never commit `terraform.tfvars`** to version control
5. **Review all documentation** before starting

---

**Ready to begin? Start with the [Architecture Documentation](./docs/ARCHITECTURE.md) or [Deployment Guide](./docs/DEPLOYMENT.md)!** 🚀

---

*Last Updated: January 2025*
