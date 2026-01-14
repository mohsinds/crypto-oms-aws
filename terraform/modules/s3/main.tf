# ============================================================================
# S3 MODULE - FRONTEND HOSTING
# ============================================================================
# Creates S3 bucket for hosting React frontend static files
# ============================================================================

# ============================================================================
# S3 BUCKET
# ============================================================================

resource "aws_s3_bucket" "frontend" {
  bucket = "${var.project_name}-${var.environment}-frontend"

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-frontend"
    }
  )
}

# ============================================================================
# S3 BUCKET VERSIONING
# ============================================================================

resource "aws_s3_bucket_versioning" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  versioning_configuration {
    status = "Enabled"
  }
}

# ============================================================================
# S3 BUCKET ENCRYPTION
# ============================================================================

resource "aws_s3_bucket_server_side_encryption_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = var.kms_key_id != null ? "aws:kms" : "AES256"
      kms_master_key_id = var.kms_key_id
    }
    bucket_key_enabled = true
  }
}

# ============================================================================
# S3 BUCKET PUBLIC ACCESS BLOCK
# ============================================================================
# Restrict public access (we'll enable it selectively for static website)
# ============================================================================

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# ============================================================================
# S3 BUCKET POLICY (Allow public read for static website)
# ============================================================================

resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.frontend.arn}/*"
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.frontend]
}

# ============================================================================
# S3 BUCKET WEBSITE CONFIGURATION
# ============================================================================

resource "aws_s3_bucket_website_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "index.html" # SPA fallback
  }
}

# ============================================================================
# S3 BUCKET CORS CONFIGURATION
# ============================================================================

resource "aws_s3_bucket_cors_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# ============================================================================
# OUTPUTS
# ============================================================================

output "bucket_id" {
  description = "S3 bucket ID"
  value       = aws_s3_bucket.frontend.id
}

output "bucket_arn" {
  description = "S3 bucket ARN"
  value       = aws_s3_bucket.frontend.arn
}

output "website_endpoint" {
  description = "S3 website endpoint"
  value       = aws_s3_bucket_website_configuration.frontend.website_endpoint
}

output "website_domain" {
  description = "S3 website domain"
  value       = aws_s3_bucket_website_configuration.frontend.website_domain
}
