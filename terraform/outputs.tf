# ============================================================================
# TERRAFORM OUTPUTS
# ============================================================================
# These values are displayed after `terraform apply` completes
# Use them to configure your applications and connect to services
# ============================================================================

# ============================================================================
# EKS OUTPUTS
# ============================================================================

output "eks_cluster_name" {
  description = "EKS cluster name"
  value       = module.eks.cluster_name
}

output "eks_cluster_endpoint" {
  description = "EKS cluster API endpoint"
  value       = module.eks.cluster_endpoint
}

output "eks_cluster_security_group_id" {
  description = "EKS cluster security group ID"
  value       = module.eks.cluster_security_group_id
}

# ============================================================================
# MSK (KAFKA) OUTPUTS
# ============================================================================

output "kafka_bootstrap_brokers" {
  description = "MSK Kafka bootstrap brokers (TLS)"
  value       = module.msk.bootstrap_brokers_tls
  sensitive   = true
}

output "kafka_cluster_arn" {
  description = "MSK cluster ARN"
  value       = module.msk.cluster_arn
}

# ============================================================================
# REDIS OUTPUTS
# ============================================================================

output "redis_endpoint" {
  description = "Redis primary endpoint"
  value       = module.redis.redis_endpoint
}

output "redis_port" {
  description = "Redis port"
  value       = module.redis.redis_port
}

# ============================================================================
# DOCUMENTDB OUTPUTS
# ============================================================================

output "documentdb_endpoint" {
  description = "DocumentDB cluster endpoint"
  value       = module.documentdb.cluster_endpoint
}

output "documentdb_port" {
  description = "DocumentDB cluster port"
  value       = module.documentdb.cluster_port
}

output "documentdb_secret_arn" {
  description = "Secrets Manager ARN for DocumentDB credentials"
  value       = module.documentdb.secret_arn
  sensitive   = true
}

# ============================================================================
# ALB OUTPUTS
# ============================================================================

output "alb_dns_name" {
  description = "Application Load Balancer DNS name"
  value       = module.alb.alb_dns_name
}

output "alb_target_group_arn" {
  description = "ALB target group ARN (for Kubernetes service annotation)"
  value       = module.alb.target_group_arn
}

# ============================================================================
# S3 OUTPUTS
# ============================================================================

output "s3_bucket_name" {
  description = "S3 bucket name for frontend"
  value       = module.s3.bucket_id
}

output "s3_website_endpoint" {
  description = "S3 website endpoint URL"
  value       = module.s3.website_endpoint
}

# ============================================================================
# VPC OUTPUTS
# ============================================================================

output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "private_subnet_ids" {
  description = "List of private subnet IDs"
  value       = module.vpc.private_subnet_ids
}

output "public_subnet_ids" {
  description = "List of public subnet IDs"
  value       = module.vpc.public_subnet_ids
}

# ============================================================================
# CONNECTION STRINGS (for application configuration)
# ============================================================================

output "connection_strings" {
  description = "Connection strings for applications"
  value = {
    kafka = "bootstrap.servers=${module.msk.bootstrap_brokers_tls}"
    redis = "${module.redis.redis_endpoint}:${module.redis.redis_port}"
    mongodb = "mongodb://${module.documentdb.cluster_endpoint}:${module.documentdb.cluster_port}"
  }
  sensitive = true
}
