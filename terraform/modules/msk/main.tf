# ============================================================================
# MSK MODULE - KAFKA CLUSTER
# ============================================================================
# Creates Amazon MSK (Managed Streaming for Apache Kafka) cluster
# ============================================================================

# ============================================================================
# MSK CLUSTER
# ============================================================================

resource "aws_msk_cluster" "main" {
  cluster_name           = "${var.project_name}-${var.environment}-msk"
  kafka_version          = var.kafka_version
  number_of_broker_nodes = var.kafka_broker_count

  broker_node_group_info {
    instance_type   = var.kafka_instance_type
    client_subnets  = var.private_subnet_ids
    security_groups = var.security_group_ids

    storage_info {
      ebs_storage_info {
        volume_size = var.kafka_ebs_volume_size
      }
    }
  }

  encryption_info {
    encryption_at_rest_kms_key_id = var.kms_key_id
    encryption_in_transit {
      client_broker = "TLS"
      in_cluster   = true
    }
  }

  client_authentication {
    sasl {
      iam = true
    }
    tls {
      certificate_authority_arns = []
    }
  }

  open_monitoring {
    prometheus {
      jmx_exporter {
        enabled_in_broker = true
      }
      node_exporter {
        enabled_in_broker = true
      }
    }
  }

  logging_info {
    broker_logs {
      cloudwatch_logs {
        enabled   = true
        log_group = aws_cloudwatch_log_group.msk.name
      }
    }
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-msk"
    }
  )
}

# ============================================================================
# CLOUDWATCH LOG GROUP
# ============================================================================

resource "aws_cloudwatch_log_group" "msk" {
  name              = "/aws/msk/${var.project_name}-${var.environment}"
  retention_in_days = 7

  tags = var.tags
}

# ============================================================================
# OUTPUTS
# ============================================================================

output "cluster_arn" {
  description = "MSK cluster ARN"
  value       = aws_msk_cluster.main.arn
}

output "bootstrap_brokers" {
  description = "MSK bootstrap brokers"
  value       = aws_msk_cluster.main.bootstrap_brokers
}

output "bootstrap_brokers_tls" {
  description = "MSK bootstrap brokers (TLS)"
  value       = aws_msk_cluster.main.bootstrap_brokers_tls
}

output "zookeeper_connect_string" {
  description = "Zookeeper connection string"
  value       = aws_msk_cluster.main.zookeeper_connect_string
}
