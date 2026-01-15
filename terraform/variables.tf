# ============================================================================
# TERRAFORM VARIABLES - CRYPTO OMS AWS
# ============================================================================
# This file defines all configurable parameters for the infrastructure.
# Each variable includes:
# - Description: What it does
# - Type: Data type (string, number, list, map, bool)
# - Default: Default value (if any)
# - Validation: Rules to ensure valid values
#
# Usage:
# - Override defaults in terraform.tfvars
# - Pass via command line: terraform apply -var="environment=prod"
# ============================================================================

# ============================================================================
# PROJECT IDENTIFICATION
# ============================================================================

variable "project_name" {
  description = "Name of the project (used for resource naming)"
  type        = string
  default     = "crypto-oms"

  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.project_name))
    error_message = "Project name must contain only lowercase letters, numbers, and hyphens."
  }
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "aws_region" {
  description = "AWS region where resources will be created"
  type        = string
  default     = "us-east-1"

  validation {
    condition = contains([
      "us-east-1", "us-east-2", "us-west-1", "us-west-2",
      "eu-west-1", "eu-central-1", "ap-southeast-1"
    ], var.aws_region)
    error_message = "Region must be a valid AWS region."
  }
}

# ============================================================================
# NETWORKING CONFIGURATION
# ============================================================================

variable "vpc_cidr" {
  description = "CIDR block for the VPC (e.g., 10.0.0.0/16)"
  type        = string
  default     = "10.0.0.0/16"

  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0))
    error_message = "VPC CIDR must be a valid CIDR block."
  }
}

variable "availability_zones_count" {
  description = "Number of availability zones to use (2-3 recommended)"
  type        = number
  default     = 2

  validation {
    condition     = var.availability_zones_count >= 2 && var.availability_zones_count <= 3
    error_message = "Availability zones count must be between 2 and 3."
  }
}

variable "enable_nat_gateway" {
  description = "Enable NAT Gateway for private subnet internet access"
  type        = bool
  default     = true
}

variable "single_nat_gateway" {
  description = "Use single NAT Gateway for all AZs (cost optimization)"
  type        = bool
  default     = true
}

variable "enable_vpc_endpoints" {
  description = "Enable VPC endpoints to reduce NAT Gateway data transfer costs"
  type        = bool
  default     = true
}

# ============================================================================
# EKS (KUBERNETES) CONFIGURATION
# ============================================================================

variable "eks_version" {
  description = "Kubernetes version for EKS cluster"
  type        = string
  default     = "1.28"
}

variable "eks_node_instance_types" {
  description = "EC2 instance types for EKS worker nodes"
  type        = list(string)
  default     = ["t3.small"]

  # Common instance types:
  # - t3.small: 2 vCPU, 2 GB RAM - Good for dev (~$15/month)
  # - t3.medium: 2 vCPU, 4 GB RAM - Good for staging (~$30/month)
  # - t3.large: 2 vCPU, 8 GB RAM - Good for production (~$60/month)
  # - m5.large: 2 vCPU, 8 GB RAM - Better performance (~$70/month)
}

variable "eks_node_desired_size" {
  description = "Desired number of worker nodes in the EKS cluster"
  type        = number
  default     = 1

  validation {
    condition     = var.eks_node_desired_size >= 1
    error_message = "EKS node desired size must be at least 1."
  }
}

variable "eks_node_min_size" {
  description = "Minimum number of worker nodes (for auto-scaling)"
  type        = number
  default     = 1

  validation {
    condition     = var.eks_node_min_size >= 1
    error_message = "EKS node min size must be at least 1."
  }
}

variable "eks_node_max_size" {
  description = "Maximum number of worker nodes (for auto-scaling)"
  type        = number
  default     = 10

  validation {
    condition     = var.eks_node_max_size >= var.eks_node_min_size
    error_message = "EKS node max size must be >= min size."
  }
}

variable "use_spot_instances" {
  description = "Use EC2 Spot Instances for EKS nodes (cost savings, but can be interrupted)"
  type        = bool
  default     = false
}

# ============================================================================
# MSK (KAFKA) CONFIGURATION
# ============================================================================

variable "kafka_version" {
  description = "Apache Kafka version for MSK cluster"
  type        = string
  default     = "3.5.1"
}

variable "kafka_instance_type" {
  description = "EC2 instance type for Kafka brokers"
  type        = string
  default     = "kafka.t3.small"

  # Common instance types:
  # - kafka.t3.small: 2 vCPU, 2 GB RAM - Dev (~$150/month per broker)
  # - kafka.m5.large: 2 vCPU, 8 GB RAM - Production (~$300/month per broker)
  # - kafka.r5.xlarge: 4 vCPU, 32 GB RAM - High throughput (~$600/month per broker)
}

variable "kafka_broker_count" {
  description = "Number of Kafka brokers (minimum 2 for dev, 3+ for production)"
  type        = number
  default     = 2

  validation {
    condition     = var.kafka_broker_count >= 2 && var.kafka_broker_count <= 15
    error_message = "Kafka broker count must be between 2 and 15."
  }
}

variable "kafka_ebs_volume_size" {
  description = "EBS volume size (GB) for each Kafka broker"
  type        = number
  default     = 50

  validation {
    condition     = var.kafka_ebs_volume_size >= 20 && var.kafka_ebs_volume_size <= 16384
    error_message = "Kafka EBS volume size must be between 20 and 16384 GB."
  }
}

# ============================================================================
# ELASTICACHE (REDIS) CONFIGURATION
# ============================================================================

variable "redis_node_type" {
  description = "ElastiCache node type for Redis"
  type        = string
  default     = "cache.t3.micro"

  # Common node types:
  # - cache.t3.micro: 0.5 GB RAM - Dev (~$12/month)
  # - cache.t3.small: 1.37 GB RAM - Staging (~$24/month)
  # - cache.t3.medium: 3.09 GB RAM - Production (~$48/month)
}

variable "redis_num_cache_nodes" {
  description = "Number of cache nodes (1 for dev, 2+ for production with replication)"
  type        = number
  default     = 1

  validation {
    condition     = var.redis_num_cache_nodes >= 1 && var.redis_num_cache_nodes <= 5
    error_message = "Redis cache nodes must be between 1 and 5."
  }
}

variable "redis_engine_version" {
  description = "Redis engine version"
  type        = string
  default     = "7.0"
}

# ============================================================================
# DOCUMENTDB (MONGODB) CONFIGURATION
# ============================================================================

variable "documentdb_instance_class" {
  description = "DocumentDB instance class"
  type        = string
  default     = "db.t3.medium"

  # Common instance classes:
  # - db.t3.medium: 2 vCPU, 4 GB RAM - Dev (~$50/month)
  # - db.r5.large: 2 vCPU, 16 GB RAM - Production (~$200/month)
  # - db.r5.xlarge: 4 vCPU, 32 GB RAM - High performance (~$400/month)
}

variable "documentdb_cluster_size" {
  description = "Number of DocumentDB instances in the cluster (1 for dev, 3+ for production)"
  type        = number
  default     = 1

  validation {
    condition     = var.documentdb_cluster_size >= 1 && var.documentdb_cluster_size <= 16
    error_message = "DocumentDB cluster size must be between 1 and 16."
  }
}

variable "documentdb_engine_version" {
  description = "DocumentDB engine version"
  type        = string
  default     = "5.0.0"
}

# ============================================================================
# SECURITY & ENCRYPTION
# ============================================================================

variable "enable_kms_encryption" {
  description = "Enable KMS encryption for all resources"
  type        = bool
  default     = true
}

# ============================================================================
# MONITORING & LOGGING
# ============================================================================

variable "enable_monitoring" {
  description = "Enable CloudWatch monitoring"
  type        = bool
  default     = true
}

variable "enable_logging" {
  description = "Enable CloudWatch logging for EKS"
  type        = bool
  default     = true
}

# ============================================================================
# TAGS
# ============================================================================

variable "tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default = {
    Owner       = "Crypto-OMS-Dev"
    Purpose     = "Development"
    CostCenter  = "Engineering"
    ManagedBy   = "Terraform"
  }
}
