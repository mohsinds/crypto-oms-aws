variable "project_name" {
  description = "Project name"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs"
  type        = list(string)
}

variable "security_group_ids" {
  description = "List of security group IDs"
  type        = list(string)
}

variable "kafka_version" {
  description = "Kafka version"
  type        = string
}

variable "kafka_instance_type" {
  description = "Kafka instance type"
  type        = string
}

variable "kafka_broker_count" {
  description = "Number of Kafka brokers"
  type        = number
}

variable "kafka_ebs_volume_size" {
  description = "EBS volume size for Kafka brokers"
  type        = number
}

variable "kms_key_id" {
  description = "KMS key ID for encryption"
  type        = string
}

variable "tags" {
  description = "Tags to apply"
  type        = map(string)
  default     = {}
}
