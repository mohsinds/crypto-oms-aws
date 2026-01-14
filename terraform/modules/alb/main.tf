# ============================================================================
# ALB MODULE - APPLICATION LOAD BALANCER
# ============================================================================
# Creates Application Load Balancer for routing API traffic to EKS pods
# ============================================================================

# ============================================================================
# APPLICATION LOAD BALANCER
# ============================================================================

resource "aws_lb" "main" {
  name               = "${var.project_name}-${var.environment}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = var.security_group_ids
  subnets            = var.public_subnet_ids

  enable_deletion_protection = false # Set to true in production

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-alb"
    }
  )
}

# ============================================================================
# TARGET GROUP (for EKS pods)
# ============================================================================
# This will be configured later when deploying Kubernetes services
# For now, we create a placeholder target group
# ============================================================================

resource "aws_lb_target_group" "api" {
  name     = "${var.project_name}-${var.environment}-api-tg"
  port     = 80
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 2
    timeout             = 5
    interval            = 30
    path                = "/health"
    matcher             = "200"
  }

  deregistration_delay = 30

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-api-tg"
    }
  )
}

# ============================================================================
# LISTENER (HTTP)
# ============================================================================

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }

  tags = var.tags
}

# ============================================================================
# LISTENER (HTTPS) - Uncomment when you have SSL certificate
# ============================================================================

# resource "aws_lb_listener" "https" {
#   load_balancer_arn = aws_lb.main.arn
#   port              = "443"
#   protocol          = "HTTPS"
#   ssl_policy        = "ELBSecurityPolicy-TLS-1-2-2017-01"
#   certificate_arn   = var.certificate_arn
#
#   default_action {
#     type             = "forward"
#     target_group_arn = aws_lb_target_group.api.arn
#   }
# }

# ============================================================================
# OUTPUTS
# ============================================================================

output "alb_arn" {
  description = "ALB ARN"
  value       = aws_lb.main.arn
}

output "alb_dns_name" {
  description = "ALB DNS name"
  value       = aws_lb.main.dns_name
}

output "target_group_arn" {
  description = "Target group ARN"
  value       = aws_lb_target_group.api.arn
}
