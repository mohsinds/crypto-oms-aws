# Terraform Infrastructure for Crypto OMS

This directory contains all Terraform configuration files for deploying the Crypto Order Management System on AWS.

## 📁 Directory Structure

```
terraform/
├── main.tf                    # Main orchestration file
├── variables.tf               # All configurable variables
├── outputs.tf                 # Output values after deployment
├── terraform.tfvars.example  # Example configuration (copy to terraform.tfvars)
├── .gitignore                # Git ignore rules
├── README.md                  # This file
└── modules/
    ├── vpc/                   # VPC and networking module
    ├── eks/                   # EKS Kubernetes cluster module
    ├── msk/                   # MSK Kafka cluster module
    ├── redis/                 # ElastiCache Redis module
    ├── documentdb/           # DocumentDB module
    ├── alb/                   # Application Load Balancer module
    ├── kms/                   # KMS encryption keys module
    └── s3/                    # S3 bucket module
```

## 🚀 Quick Start

1. **Copy the example variables file:**
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```

2. **Edit `terraform.tfvars` with your values:**
   - Set your AWS region
   - Adjust instance types for cost optimization
   - Configure environment-specific settings

3. **Initialize Terraform:**
   ```bash
   terraform init
   ```

4. **Review the deployment plan:**
   ```bash
   terraform plan
   ```

5. **Deploy the infrastructure:**
   ```bash
   terraform apply
   ```

6. **After testing, destroy everything:**
   ```bash
   terraform destroy
   ```

## 📋 Prerequisites

- AWS CLI configured with credentials
- Terraform >= 1.0 installed
- Appropriate AWS IAM permissions

## 💰 Cost Estimates

See `terraform.tfvars.example` for cost breakdown. Development configuration costs approximately **$514/month**.

## 📚 Documentation

For detailed deployment instructions, see:
- `../DEPLOYMENT_GUIDE.md` - Complete step-by-step guide
- `../README.md` - Architecture overview

## ⚠️ Important Notes

- **Always set up billing alarms** before deploying
- **Never commit `terraform.tfvars`** to version control
- **Run `terraform destroy`** when done testing to avoid ongoing charges
- Review all variables in `variables.tf` before deploying
