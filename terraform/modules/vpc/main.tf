# ============================================================================
# VPC MODULE - NETWORKING FOUNDATION
# ============================================================================
# This module creates the complete networking infrastructure:
#
# 1. VPC (Virtual Private Cloud)
#    - Isolated network environment
#    - CIDR block defines IP address range
#
# 2. Subnets
#    - Public subnets: For ALB, NAT Gateway (internet-facing)
#    - Private subnets: For EKS, MSK, databases (no direct internet)
#
# 3. Internet Gateway
#    - Allows public subnets to access internet
#
# 4. NAT Gateway
#    - Allows private subnets to access internet (outbound only)
#    - Expensive: ~$0.045/hour + data transfer
#
# 5. Security Groups
#    - Firewall rules for each service
#    - Controls inbound/outbound traffic
#
# 6. VPC Endpoints
#    - Private connection to AWS services (S3, ECR, etc.)
#    - Reduces NAT Gateway data transfer costs
# ============================================================================

# ============================================================================
# VPC
# ============================================================================

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-vpc"
    }
  )
}

# ============================================================================
# INTERNET GATEWAY
# ============================================================================
# Allows resources in public subnets to access the internet
# ============================================================================

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-igw"
    }
  )
}

# ============================================================================
# PUBLIC SUBNETS
# ============================================================================
# These subnets have direct internet access via Internet Gateway
# Used for: ALB, NAT Gateway, Bastion hosts
# ============================================================================

resource "aws_subnet" "public" {
  count = length(var.availability_zones)

  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone        = var.availability_zones[count.index]
  map_public_ip_on_launch = true

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-public-${count.index + 1}"
      Type = "Public"
    }
  )
}

# ============================================================================
# PRIVATE SUBNETS
# ============================================================================
# These subnets have NO direct internet access
# Used for: EKS nodes, MSK brokers, Redis, DocumentDB
# Outbound internet via NAT Gateway
# ============================================================================

resource "aws_subnet" "private" {
  count = length(var.availability_zones)

  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 10)
  availability_zone = var.availability_zones[count.index]

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-private-${count.index + 1}"
      Type = "Private"
    }
  )
}

# ============================================================================
# ELASTIC IP FOR NAT GATEWAY
# ============================================================================
# NAT Gateway needs a static public IP address
# ============================================================================

resource "aws_eip" "nat" {
  count = var.enable_nat_gateway ? (var.single_nat_gateway ? 1 : length(var.availability_zones)) : 0

  domain = "vpc"

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-nat-eip-${count.index + 1}"
    }
  )

  depends_on = [aws_internet_gateway.main]
}

# ============================================================================
# NAT GATEWAY
# ============================================================================
# Allows private subnets to access internet (outbound only)
# Cost: ~$0.045/hour + $0.045/GB data transfer
# Optimization: Use single NAT Gateway for all AZs (single_nat_gateway = true)
# ============================================================================

resource "aws_nat_gateway" "main" {
  count = var.enable_nat_gateway ? (var.single_nat_gateway ? 1 : length(var.availability_zones)) : 0

  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-nat-${count.index + 1}"
    }
  )

  depends_on = [aws_internet_gateway.main]
}

# ============================================================================
# ROUTE TABLES
# ============================================================================

# Public Route Table: Routes to Internet Gateway
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-public-rt"
    }
  )
}

# Associate public subnets with public route table
resource "aws_route_table_association" "public" {
  count = length(aws_subnet.public)

  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Private Route Tables: Routes to NAT Gateway
resource "aws_route_table" "private" {
  count = var.enable_nat_gateway ? length(aws_subnet.private) : 0

  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = var.single_nat_gateway ? aws_nat_gateway.main[0].id : aws_nat_gateway.main[count.index].id
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-private-rt-${count.index + 1}"
    }
  )
}

# Associate private subnets with private route tables
resource "aws_route_table_association" "private" {
  count = var.enable_nat_gateway ? length(aws_subnet.private) : 0

  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

# ============================================================================
# VPC ENDPOINTS (COST OPTIMIZATION)
# ============================================================================
# Private connection to AWS services without going through NAT Gateway
# Reduces data transfer costs significantly
# ============================================================================

resource "aws_vpc_endpoint" "s3" {
  count = var.enable_vpc_endpoints ? 1 : 0

  vpc_id            = aws_vpc.main.id
  service_name      = "com.amazonaws.${data.aws_region.current.name}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = concat([aws_route_table.public.id], aws_route_table.private[*].id)

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-s3-endpoint"
    }
  )
}

resource "aws_vpc_endpoint" "ecr_dkr" {
  count = var.enable_vpc_endpoints ? 1 : 0

  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${data.aws_region.current.name}.ecr.dkr"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.vpc_endpoint[0].id]
  private_dns_enabled = true

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-ecr-dkr-endpoint"
    }
  )
}

resource "aws_vpc_endpoint" "ecr_api" {
  count = var.enable_vpc_endpoints ? 1 : 0

  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${data.aws_region.current.name}.ecr.api"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.vpc_endpoint[0].id]
  private_dns_enabled = true

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-ecr-api-endpoint"
    }
  )
}

# Security group for VPC endpoints
resource "aws_security_group" "vpc_endpoint" {
  count = var.enable_vpc_endpoints ? 1 : 0

  name        = "${var.project_name}-${var.environment}-vpc-endpoint-sg"
  description = "Security group for VPC endpoints"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-vpc-endpoint-sg"
    }
  )
}

# ============================================================================
# SECURITY GROUPS
# ============================================================================
# Firewall rules for each service
# ============================================================================

# ALB Security Group
resource "aws_security_group" "alb" {
  name        = "${var.project_name}-${var.environment}-alb-sg"
  description = "Security group for Application Load Balancer"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTP from internet"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS from internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "Allow all outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-alb-sg"
    }
  )
}

# EKS Security Group
resource "aws_security_group" "eks" {
  name        = "${var.project_name}-${var.environment}-eks-sg"
  description = "Security group for EKS cluster"
  vpc_id      = aws_vpc.main.id

  egress {
    description = "Allow all outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-eks-sg"
    }
  )
}

# MSK Security Group
resource "aws_security_group" "msk" {
  name        = "${var.project_name}-${var.environment}-msk-sg"
  description = "Security group for MSK Kafka cluster"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "Kafka from EKS"
    from_port       = 9092
    to_port         = 9098
    protocol        = "tcp"
    security_groups = [aws_security_group.eks.id]
  }

  ingress {
    description     = "Kafka from ALB"
    from_port       = 9092
    to_port         = 9098
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    description = "Allow all outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-msk-sg"
    }
  )
}

# Redis Security Group
resource "aws_security_group" "redis" {
  name        = "${var.project_name}-${var.environment}-redis-sg"
  description = "Security group for ElastiCache Redis"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "Redis from EKS"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.eks.id]
  }

  egress {
    description = "Allow all outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-redis-sg"
    }
  )
}

# DocumentDB Security Group
resource "aws_security_group" "documentdb" {
  name        = "${var.project_name}-${var.environment}-documentdb-sg"
  description = "Security group for DocumentDB"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "MongoDB from EKS"
    from_port       = 27017
    to_port         = 27017
    protocol        = "tcp"
    security_groups = [aws_security_group.eks.id]
  }

  egress {
    description = "Allow all outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-documentdb-sg"
    }
  )
}

# ============================================================================
# DATA SOURCES
# ============================================================================

data "aws_region" "current" {}

# ============================================================================
# OUTPUTS
# ============================================================================

output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "List of public subnet IDs"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "List of private subnet IDs"
  value       = aws_subnet.private[*].id
}

output "alb_security_group_id" {
  description = "ALB security group ID"
  value       = aws_security_group.alb.id
}

output "eks_security_group_id" {
  description = "EKS security group ID"
  value       = aws_security_group.eks.id
}

output "msk_security_group_id" {
  description = "MSK security group ID"
  value       = aws_security_group.msk.id
}

output "redis_security_group_id" {
  description = "Redis security group ID"
  value       = aws_security_group.redis.id
}

output "documentdb_security_group_id" {
  description = "DocumentDB security group ID"
  value       = aws_security_group.documentdb.id
}
