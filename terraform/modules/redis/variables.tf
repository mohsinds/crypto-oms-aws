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

variable "redis_node_type" {
  description = "Redis node type"
  type        = string
}

variable "redis_num_cache_nodes" {
  description = "Number of cache nodes"
  type        = number
}

variable "redis_engine_version" {
  description = "Redis engine version"
  type        = string
}

variable "kms_key_id" {
  description = "KMS key ID for encryption"
  type        = string
  default     = null
}

variable "tags" {
  description = "Tags to apply"
  type        = map(string)
  default     = {}
}
