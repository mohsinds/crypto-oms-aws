# ============================================================================
# DOCUMENTDB MODULE - MONGODB-COMPATIBLE DATABASE
# ============================================================================
# Creates DocumentDB cluster for order persistence
# ============================================================================

# ============================================================================
# DOCUMENTDB SUBNET GROUP
# ============================================================================

resource "aws_docdb_subnet_group" "main" {
  name       = "${var.project_name}-${var.environment}-documentdb-subnet"
  subnet_ids = var.private_subnet_ids

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-documentdb-subnet"
    }
  )
}

# ============================================================================
# DOCUMENTDB CLUSTER PARAMETER GROUP
# ============================================================================

resource "aws_docdb_cluster_parameter_group" "main" {
  family = "docdb5.0"
  name   = "${var.project_name}-${var.environment}-documentdb-params"

  parameter {
    name  = "tls"
    value = "enabled"
  }

  tags = var.tags
}

# ============================================================================
# DOCUMENTDB CLUSTER
# ============================================================================

resource "aws_docdb_cluster" "main" {
  cluster_identifier      = "${var.project_name}-${var.environment}-documentdb"
  engine                   = "docdb"
  engine_version           = var.documentdb_engine_version
  master_username          = "admin"
  master_password          = random_password.documentdb_password.result
  db_subnet_group_name     = aws_docdb_subnet_group.main.name
  vpc_security_group_ids   = var.security_group_ids
  storage_encrypted         = var.kms_key_id != null
  kms_key_id               = var.kms_key_id
  backup_retention_period   = 7
  preferred_backup_window  = "03:00-04:00"
  preferred_maintenance_window = "sun:04:00-sun:05:00"
  skip_final_snapshot      = true # Set to false in production
  deletion_protection       = false # Set to true in production

  db_cluster_parameter_group_name = aws_docdb_cluster_parameter_group.main.name

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-documentdb"
    }
  )
}

# ============================================================================
# DOCUMENTDB CLUSTER INSTANCES
# ============================================================================

resource "aws_docdb_cluster_instance" "main" {
  count              = var.documentdb_cluster_size
  identifier         = "${var.project_name}-${var.environment}-documentdb-${count.index + 1}"
  cluster_identifier  = aws_docdb_cluster.main.id
  instance_class      = var.documentdb_instance_class

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-documentdb-${count.index + 1}"
    }
  )
}

# ============================================================================
# RANDOM PASSWORD
# ============================================================================

resource "random_password" "documentdb_password" {
  length  = 32
  special = true
}

# ============================================================================
# SECRETS MANAGER (Store password securely)
# ============================================================================

resource "aws_secretsmanager_secret" "documentdb" {
  name = "${var.project_name}-${var.environment}-documentdb-password"

  tags = var.tags
}

resource "aws_secretsmanager_secret_version" "documentdb" {
  secret_id = aws_secretsmanager_secret.documentdb.id
  secret_string = jsonencode({
    username = aws_docdb_cluster.main.master_username
    password = random_password.documentdb_password.result
    endpoint = aws_docdb_cluster.main.endpoint
    port     = aws_docdb_cluster.main.port
  })
}

# ============================================================================
# OUTPUTS
# ============================================================================

output "cluster_endpoint" {
  description = "DocumentDB cluster endpoint"
  value       = aws_docdb_cluster.main.endpoint
}

output "cluster_port" {
  description = "DocumentDB cluster port"
  value       = aws_docdb_cluster.main.port
}

output "cluster_reader_endpoint" {
  description = "DocumentDB cluster reader endpoint"
  value       = aws_docdb_cluster.main.reader_endpoint
}

output "master_username" {
  description = "DocumentDB master username"
  value       = aws_docdb_cluster.main.master_username
  sensitive   = true
}

output "secret_arn" {
  description = "Secrets Manager secret ARN for DocumentDB credentials"
  value       = aws_secretsmanager_secret.documentdb.arn
}
