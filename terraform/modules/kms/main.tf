# ============================================================================
# KMS MODULE - ENCRYPTION KEYS
# ============================================================================
# Creates AWS KMS (Key Management Service) keys for encrypting data at rest
# ============================================================================

# ============================================================================
# EKS KMS KEY
# ============================================================================

resource "aws_kms_key" "eks" {
  count = var.enable_kms ? 1 : 0

  description             = "KMS key for EKS cluster encryption"
  deletion_window_in_days = 7
  enable_key_rotation    = true

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-eks-key"
    }
  )
}

resource "aws_kms_alias" "eks" {
  count = var.enable_kms ? 1 : 0

  name          = "alias/${var.project_name}-${var.environment}-eks"
  target_key_id = aws_kms_key.eks[0].key_id
}

# ============================================================================
# MSK KMS KEY
# ============================================================================

resource "aws_kms_key" "msk" {
  count = var.enable_kms ? 1 : 0

  description             = "KMS key for MSK Kafka encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-msk-key"
    }
  )
}

resource "aws_kms_alias" "msk" {
  count = var.enable_kms ? 1 : 0

  name          = "alias/${var.project_name}-${var.environment}-msk"
  target_key_id = aws_kms_key.msk[0].key_id
}

# ============================================================================
# REDIS KMS KEY
# ============================================================================

resource "aws_kms_key" "redis" {
  count = var.enable_kms ? 1 : 0

  description             = "KMS key for ElastiCache Redis encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-redis-key"
    }
  )
}

resource "aws_kms_alias" "redis" {
  count = var.enable_kms ? 1 : 0

  name          = "alias/${var.project_name}-${var.environment}-redis"
  target_key_id = aws_kms_key.redis[0].key_id
}

# ============================================================================
# DOCUMENTDB KMS KEY
# ============================================================================

resource "aws_kms_key" "documentdb" {
  count = var.enable_kms ? 1 : 0

  description             = "KMS key for DocumentDB encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-documentdb-key"
    }
  )
}

resource "aws_kms_alias" "documentdb" {
  count = var.enable_kms ? 1 : 0

  name          = "alias/${var.project_name}-${var.environment}-documentdb"
  target_key_id = aws_kms_key.documentdb[0].key_id
}

# ============================================================================
# S3 KMS KEY
# ============================================================================

resource "aws_kms_key" "s3" {
  count = var.enable_kms ? 1 : 0

  description             = "KMS key for S3 bucket encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-s3-key"
    }
  )
}

resource "aws_kms_alias" "s3" {
  count = var.enable_kms ? 1 : 0

  name          = "alias/${var.project_name}-${var.environment}-s3"
  target_key_id = aws_kms_key.s3[0].key_id
}

# ============================================================================
# OUTPUTS
# ============================================================================

output "eks_key_id" {
  description = "EKS KMS key ID"
  value       = var.enable_kms ? aws_kms_key.eks[0].arn : null
}

output "msk_key_id" {
  description = "MSK KMS key ID"
  value       = var.enable_kms ? aws_kms_key.msk[0].arn : null
}

output "redis_key_id" {
  description = "Redis KMS key ID"
  value       = var.enable_kms ? aws_kms_key.redis[0].arn : null
}

output "documentdb_key_id" {
  description = "DocumentDB KMS key ID"
  value       = var.enable_kms ? aws_kms_key.documentdb[0].arn : null
}

output "s3_key_id" {
  description = "S3 KMS key ID"
  value       = var.enable_kms ? aws_kms_key.s3[0].arn : null
}
