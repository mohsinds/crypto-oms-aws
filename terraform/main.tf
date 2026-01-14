# ============================================================================
# CRYPTO OMS AWS - MAIN TERRAFORM CONFIGURATION
# ============================================================================
# This is the main orchestration file that brings together all AWS services
# needed for the Order Management System.
#
# Architecture Overview:
# - VPC: Network foundation (subnets, routing, security)
# - EKS: Kubernetes cluster for microservices
# - MSK: Kafka cluster for event streaming
# - ElastiCache: Redis for idempotency and caching
# - DocumentDB: MongoDB-compatible database for order persistence
# - ALB: Application Load Balancer for API traffic
# - KMS: Encryption keys for data at rest
# - S3: Static website hosting for React frontend
# ============================================================================

terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # Optional: Use S3 backend for state management (recommended for production)
  # Uncomment and configure when ready:
  # backend "s3" {
  #   bucket         = "crypto-oms-terraform-state"
  #   key            = "terraform.tfstate"
  #   region         = "us-east-1"
  #   encrypt        = true
  #   dynamodb_table = "terraform-state-lock"
  # }
}

# ============================================================================
# AWS PROVIDER CONFIGURATION
# ============================================================================
# This tells Terraform which AWS account and region to use.
# Credentials come from:
# 1. AWS CLI configuration (~/.aws/credentials)
# 2. Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
# 3. IAM roles (if running on EC2)
# ============================================================================

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = merge(
      var.tags,
      {
        Project     = var.project_name
        Environment = var.environment
        ManagedBy   = "Terraform"
      }
    )
  }
}

# ============================================================================
# DATA SOURCES
# ============================================================================
# These fetch information about existing AWS resources we need to reference.
# ============================================================================

# Get current AWS account ID and caller identity
data "aws_caller_identity" "current" {}

# Get availability zones in the selected region
data "aws_availability_zones" "available" {
  state = "available"
}

# ============================================================================
# VPC MODULE
# ============================================================================
# Creates the network foundation:
# - VPC with CIDR block
# - Public subnets (for ALB, NAT Gateway)
# - Private subnets (for EKS, MSK, databases)
# - Internet Gateway (for public internet access)
# - NAT Gateway (for private subnet outbound access)
# - Security Groups (firewall rules)
# - VPC Endpoints (to reduce NAT Gateway costs)
# ============================================================================

module "vpc" {
  source = "./modules/vpc"

  project_name = var.project_name
  environment  = var.environment
  vpc_cidr     = var.vpc_cidr

  availability_zones = slice(
    data.aws_availability_zones.available.names,
    0,
    var.availability_zones_count
  )

  # NAT Gateway configuration (cost optimization)
  enable_nat_gateway = var.enable_nat_gateway
  single_nat_gateway = var.single_nat_gateway

  # VPC Endpoints reduce NAT Gateway data transfer costs
  enable_vpc_endpoints = var.enable_vpc_endpoints

  tags = var.tags
}

# ============================================================================
# KMS MODULE
# ============================================================================
# Creates encryption keys for:
# - EKS cluster encryption
# - MSK Kafka encryption
# - DocumentDB encryption
# - S3 bucket encryption
# ============================================================================

module "kms" {
  source = "./modules/kms"

  project_name = var.project_name
  environment  = var.environment
  enable_kms   = var.enable_kms_encryption

  tags = var.tags
}

# ============================================================================
# EKS CLUSTER
# ============================================================================
# Amazon Elastic Kubernetes Service - Managed Kubernetes cluster
# This is where our .NET Core microservices will run as Docker containers.
#
# Why EKS?
# - Auto-scaling: Automatically adds/removes nodes based on load
# - High availability: Spreads across multiple availability zones
# - Managed control plane: AWS handles Kubernetes API server, etcd, etc.
# - Cost: ~$0.10/hour for control plane + EC2 costs for worker nodes
# ============================================================================

module "eks" {
  source = "./modules/eks"

  project_name = var.project_name
  environment  = var.environment

  # VPC configuration
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  public_subnet_ids  = module.vpc.public_subnet_ids

  # EKS configuration
  eks_version              = var.eks_version
  eks_node_instance_types  = var.eks_node_instance_types
  eks_node_desired_size   = var.eks_node_desired_size
  eks_node_min_size       = var.eks_node_min_size
  eks_node_max_size       = var.eks_node_max_size
  use_spot_instances      = var.use_spot_instances

  # Encryption
  kms_key_id = module.kms.eks_key_id

  # Monitoring
  enable_logging    = var.enable_logging
  enable_monitoring = var.enable_monitoring

  tags = var.tags
}

# ============================================================================
# MSK (KAFKA) CLUSTER
# ============================================================================
# Amazon Managed Streaming for Apache Kafka
# This handles event streaming for order flow:
# - Order Ingestion API publishes orders to Kafka
# - Order Processor consumes from Kafka
# - Provides durability guarantees (acks=all)
#
# Why MSK?
# - Fully managed: No need to manage Kafka brokers yourself
# - High throughput: Handles 50K+ messages/second
# - Durability: Replicates across AZs
# - Cost: ~$0.21/hour per broker (most expensive component)
# ============================================================================

module "msk" {
  source = "./modules/msk"

  project_name = var.project_name
  environment  = var.environment

  # VPC configuration
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  security_group_ids = [module.vpc.msk_security_group_id]

  # MSK configuration
  kafka_version        = var.kafka_version
  kafka_instance_type  = var.kafka_instance_type
  kafka_broker_count   = var.kafka_broker_count
  kafka_ebs_volume_size = var.kafka_ebs_volume_size

  # Encryption
  kms_key_id = module.kms.msk_key_id

  tags = var.tags
}

# ============================================================================
# ELASTICACHE (REDIS)
# ============================================================================
# In-memory cache for:
# - Idempotency keys (prevents duplicate order processing)
# - Session data
# - Hot data (frequently accessed orders)
#
# Why ElastiCache?
# - Sub-millisecond latency
# - Automatic failover (if using cluster mode)
# - Managed: AWS handles patching, backups
# - Cost: ~$0.017/hour for cache.t3.micro
# ============================================================================

module "redis" {
  source = "./modules/redis"

  project_name = var.project_name
  environment  = var.environment

  # VPC configuration
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  security_group_ids = [module.vpc.redis_security_group_id]

  # Redis configuration
  redis_node_type        = var.redis_node_type
  redis_num_cache_nodes  = var.redis_num_cache_nodes
  redis_engine_version   = var.redis_engine_version

  # Encryption
  kms_key_id = module.kms.redis_key_id

  tags = var.tags
}

# ============================================================================
# DOCUMENTDB (MONGODB-COMPATIBLE)
# ============================================================================
# NoSQL database for:
# - Order persistence
# - User data
# - Position tracking
#
# Why DocumentDB?
# - MongoDB-compatible: Use existing MongoDB drivers
# - Fully managed: AWS handles backups, patching
# - High availability: Multi-AZ with automatic failover
# - Cost: ~$0.07/hour for db.t3.medium
# ============================================================================

module "documentdb" {
  source = "./modules/documentdb"

  project_name = var.project_name
  environment  = var.environment

  # VPC configuration
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  security_group_ids = [module.vpc.documentdb_security_group_id]

  # DocumentDB configuration
  documentdb_instance_class = var.documentdb_instance_class
  documentdb_cluster_size   = var.documentdb_cluster_size
  documentdb_engine_version  = var.documentdb_engine_version

  # Encryption
  kms_key_id = module.kms.documentdb_key_id

  tags = var.tags
}

# ============================================================================
# APPLICATION LOAD BALANCER (ALB)
# ============================================================================
# Layer 7 load balancer for:
# - Routing API requests to EKS pods
# - SSL/TLS termination
# - Health checks
# - Rate limiting
#
# Why ALB?
# - Intelligent routing: Path-based, host-based routing
# - Auto-scaling: Handles traffic spikes automatically
# - Cost: ~$0.0225/hour + data processing fees
# ============================================================================

module "alb" {
  source = "./modules/alb"

  project_name = var.project_name
  environment  = var.environment

  # VPC configuration
  vpc_id           = module.vpc.vpc_id
  public_subnet_ids = module.vpc.public_subnet_ids
  security_group_ids = [module.vpc.alb_security_group_id]

  # SSL/TLS (optional - configure when you have a domain)
  # certificate_arn = var.certificate_arn

  tags = var.tags
}

# ============================================================================
# S3 BUCKET FOR FRONTEND
# ============================================================================
# Static website hosting for React frontend
#
# Why S3?
# - Cost-effective: $0.023/GB/month
# - Scalable: Handles any traffic volume
# - Simple: Just upload files
# ============================================================================

module "s3" {
  source = "./modules/s3"

  project_name = var.project_name
  environment  = var.environment

  # Encryption
  kms_key_id = module.kms.s3_key_id

  tags = var.tags
}
