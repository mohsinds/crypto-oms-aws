# Terraform Infrastructure for Crypto OMS

This directory contains all Terraform configuration files for deploying the Crypto Order Management System on AWS.

## 📁 Directory Structure

```
terraform/
├── main.tf                    # Main orchestration file
├── variables.tf               # All configurable variables
├── outputs.tf                 # Output values after deployment
├── terraform.tfvars.example  # Example configuration (copy to terraform.tfvars)
├── terraform.tfvars.cost-optimized.example  # Cost-optimized configuration
├── destroy.sh                 # Safe cleanup script (destroys all resources)
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
   ./destroy.sh
   ```
   Or use Terraform directly:
   ```bash
   terraform destroy
   ```

## 🧹 Cleanup Script

The `destroy.sh` script provides a safe way to destroy all AWS resources:

### Usage

```bash
# Interactive mode (recommended)
./destroy.sh

# Auto-approve mode (no confirmations)
./destroy.sh --auto

# Dry run (show what will be destroyed)
./destroy.sh --plan-only

# Show help
./destroy.sh --help
```

### Features

- ✅ Pre-flight checks (Terraform, AWS CLI, credentials)
- ✅ Cost estimation before destruction
- ✅ Shows detailed destroy plan
- ✅ Double confirmation prompts
- ✅ State backup before destruction
- ✅ Post-destruction verification
- ✅ Error handling and troubleshooting tips

### What Gets Destroyed

The script will destroy ALL resources created by `main.tf`:
- EKS Kubernetes cluster and all workloads
- MSK Kafka cluster
- DocumentDB database (⚠️ ALL DATA WILL BE LOST)
- ElastiCache Redis cluster
- Application Load Balancer
- S3 bucket and all contents
- VPC, subnets, NAT Gateway, and all networking
- KMS encryption keys
- All associated IAM roles and policies

## 📋 Prerequisites

- AWS CLI configured with credentials
- Terraform >= 1.0 installed
- Appropriate AWS IAM permissions
- `jq` installed (for JSON parsing in destroy script)

## 💰 Cost Estimates

See `terraform.tfvars.example` for cost breakdown. Development configuration costs approximately **$514/month**.

For cost optimization options, see:
- [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) - Comprehensive cost optimization guide
- `terraform.tfvars.cost-optimized.example` - Cost-optimized configuration (~$186/month)

## 📚 Documentation

For detailed deployment instructions, see:
- [`../docs/DEPLOYMENT_GUIDE.md`](../docs/DEPLOYMENT_GUIDE.md) - Complete step-by-step guide
- [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) - Architecture and cost optimization
- [`../README.md`](../README.md) - Project overview

## ⚠️ Important Notes

- **Always set up billing alarms** before deploying
- **Never commit `terraform.tfvars`** to version control
- **Run `./destroy.sh` or `terraform destroy`** when done testing to avoid ongoing charges
- **Review all variables** in `variables.tf` before deploying
- **Check AWS Console** after destruction to verify all resources are deleted

## 🔧 Common Commands

```bash
# Initialize Terraform
terraform init

# Plan deployment (dry run)
terraform plan

# Apply changes
terraform apply

# Show current state
terraform show

# List all resources
terraform state list

# Destroy specific resource
terraform destroy -target=module.msk

# Destroy everything
terraform destroy
# OR use the script:
./destroy.sh

# Format Terraform files
terraform fmt

# Validate configuration
terraform validate
```

## 🆘 Troubleshooting

### Issue: "Error: AccessDenied"
**Solution**: Check IAM permissions for your user

### Issue: "Error: Quota exceeded"
**Solution**: Request limit increase in AWS Support

### Issue: "Destroy fails for some resources"
**Solution**: 
1. Check AWS Console for remaining resources
2. Manually delete any resources that failed
3. Run `terraform destroy` again

### Issue: "Costs higher than expected"
**Solution**: 
1. Run `./destroy.sh` immediately
2. Check AWS Cost Explorer
3. Review cost optimization guide in docs/ARCHITECTURE.md

## 📞 Getting Help

- Check [`../docs/DEPLOYMENT_GUIDE.md`](../docs/DEPLOYMENT_GUIDE.md) for detailed instructions
- Review [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) for architecture details
- AWS Documentation: https://docs.aws.amazon.com
- Terraform AWS Provider: https://registry.terraform.io/providers/hashicorp/aws/latest/docs

---

*Last Updated: January 2025*
