# ============================================================================
# REDIS MODULE - ELASTICACHE REDIS
# ============================================================================
# Creates ElastiCache Redis cluster for idempotency and caching
# ============================================================================

# ============================================================================
# ELASTICACHE REDIS CLUSTER
# ============================================================================

resource "aws_elasticache_subnet_group" "redis" {
  name       = "${var.project_name}-${var.environment}-redis-subnet"
  subnet_ids = var.private_subnet_ids

  tags = var.tags
}

resource "aws_elasticache_replication_group" "redis" {
  replication_group_id       = "${var.project_name}-${var.environment}-redis"
  description                = "Redis cluster for ${var.project_name}-${var.environment}"
  node_type                  = var.redis_node_type
  port                       = 6379
  parameter_group_name       = "default.redis7"
  engine_version             = var.redis_engine_version
  num_cache_clusters         = var.redis_num_cache_nodes
  subnet_group_name          = aws_elasticache_subnet_group.redis.name
  security_group_ids         = var.security_group_ids
  at_rest_encryption_enabled = var.kms_key_id != null
  kms_key_id                 = var.kms_key_id
  transit_encryption_enabled = true

  automatic_failover_enabled = var.redis_num_cache_nodes > 1

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-redis"
    }
  )
}

# ============================================================================
# OUTPUTS
# ============================================================================

output "redis_endpoint" {
  description = "Redis primary endpoint"
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
}

output "redis_port" {
  description = "Redis port"
  value       = aws_elasticache_replication_group.redis.port
}

output "redis_reader_endpoint" {
  description = "Redis reader endpoint (for read replicas)"
  value       = var.redis_num_cache_nodes > 1 ? aws_elasticache_replication_group.redis.reader_endpoint_address : null
}
