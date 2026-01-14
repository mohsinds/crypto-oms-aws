variable "project_name" {
  description = "Project name"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID (for reference, not used in vpc_config)"
  type        = string
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs"
  type        = list(string)
}

variable "public_subnet_ids" {
  description = "List of public subnet IDs"
  type        = list(string)
}

variable "eks_version" {
  description = "EKS Kubernetes version"
  type        = string
}

variable "eks_node_instance_types" {
  description = "EC2 instance types for EKS nodes"
  type        = list(string)
}

variable "eks_node_desired_size" {
  description = "Desired number of nodes"
  type        = number
}

variable "eks_node_min_size" {
  description = "Minimum number of nodes"
  type        = number
}

variable "eks_node_max_size" {
  description = "Maximum number of nodes"
  type        = number
}

variable "use_spot_instances" {
  description = "Use Spot instances"
  type        = bool
  default     = false
}

variable "kms_key_id" {
  description = "KMS key ID for encryption"
  type        = string
}

variable "enable_logging" {
  description = "Enable CloudWatch logging"
  type        = bool
  default     = true
}

variable "enable_monitoring" {
  description = "Enable CloudWatch monitoring"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Tags to apply"
  type        = map(string)
  default     = {}
}
