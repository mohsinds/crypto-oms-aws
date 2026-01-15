#!/bin/bash

# ============================================================================
# TERRAFORM DESTROY SCRIPT - Crypto OMS AWS
# ============================================================================
# This script safely destroys all AWS resources created by terraform/main.tf
#
# IMPORTANT: This script uses Terraform's destroy command under the hood.
# It adds safety checks, confirmations, cost estimation, and verification
# on top of the standard 'terraform destroy' command.
#
# Usage:
#   ./destroy.sh              # Interactive mode with confirmations
#   ./destroy.sh --auto       # Auto-approve (no confirmations)
#   ./destroy.sh --plan-only  # Show what will be destroyed (dry run)
#
# What this script does:
# 1. Verifies Terraform and AWS CLI are installed
# 2. Checks AWS credentials
# 3. Runs 'terraform plan -destroy' to show what will be destroyed
# 4. Estimates daily costs
# 5. Requires double confirmation (yes + DESTROY)
# 6. Backs up Terraform state
# 7. Runs 'terraform destroy' to destroy all resources
# 8. Verifies destruction by checking AWS Console
#
# For direct Terraform usage, see docs/ARCHITECTURE.md
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ============================================================================
# Functions
# ============================================================================

print_header() {
    echo -e "${BLUE}============================================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}============================================================================${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  WARNING: $1${NC}"
}

print_error() {
    echo -e "${RED}❌ ERROR: $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# ============================================================================
# Pre-flight Checks
# ============================================================================

check_terraform() {
    if ! command -v terraform &> /dev/null; then
        print_error "Terraform is not installed or not in PATH"
        echo "Please install Terraform: https://www.terraform.io/downloads"
        exit 1
    fi
    
    TERRAFORM_VERSION=$(terraform version -json | jq -r '.terraform_version' 2>/dev/null || terraform version | head -n1)
    print_info "Terraform version: $TERRAFORM_VERSION"
}

check_aws_cli() {
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed or not in PATH"
        echo "Please install AWS CLI: https://aws.amazon.com/cli/"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS credentials not configured or invalid"
        echo "Please run: aws configure"
        exit 1
    fi
    
    AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
    AWS_REGION=$(aws configure get region || echo "us-east-1")
    print_info "AWS Account: $AWS_ACCOUNT"
    print_info "AWS Region: $AWS_REGION"
}

check_terraform_init() {
    if [ ! -d ".terraform" ]; then
        print_warning "Terraform not initialized. Running terraform init..."
        terraform init
    fi
}

# ============================================================================
# Cost Estimation
# ============================================================================

estimate_daily_cost() {
    print_info "Estimating current daily costs..."
    
    # This is a rough estimate based on the architecture
    # Actual costs may vary
    DAILY_COST=$(cat <<EOF
EKS Cluster:        \$2.40/day (\$72/month)
MSK (2 brokers):    \$10.07/day (\$302/month)
EKS Nodes:          \$1.00/day (\$30/month)
DocumentDB:         \$1.67/day (\$50/month)
NAT Gateway:        \$1.07/day (\$32/month)
ElastiCache:        \$0.40/day (\$12/month)
ALB:                \$0.53/day (\$16/month)
───────────────────────────────────────────
TOTAL:              ~\$17.14/day (\$514/month)
EOF
)
    echo "$DAILY_COST"
    echo ""
}

# ============================================================================
# Show Resources to be Destroyed
# ============================================================================

show_destroy_plan() {
    print_header "TERRAFORM DESTROY PLAN"
    
    print_info "The following AWS resources will be DESTROYED:"
    echo ""
    
    terraform plan -destroy -out=tfplan.destroy 2>&1 | tee destroy-plan.txt
    
    if [ $? -ne 0 ]; then
        print_error "Failed to create destroy plan"
        exit 1
    fi
    
    echo ""
    print_warning "Review the plan above carefully!"
    echo ""
}

# ============================================================================
# Confirmation Prompts
# ============================================================================

confirm_destroy() {
    if [ "$AUTO_APPROVE" = "true" ]; then
        return 0
    fi
    
    echo ""
    print_warning "This will PERMANENTLY DELETE all AWS resources created by this Terraform configuration!"
    echo ""
    print_warning "This includes:"
    echo "  - EKS Kubernetes cluster and all workloads"
    echo "  - MSK Kafka cluster"
    echo "  - DocumentDB database (ALL DATA WILL BE LOST)"
    echo "  - ElastiCache Redis cluster"
    echo "  - Application Load Balancer"
    echo "  - S3 bucket and all contents"
    echo "  - VPC, subnets, NAT Gateway, and all networking"
    echo "  - KMS encryption keys"
    echo "  - All associated IAM roles and policies"
    echo ""
    
    estimate_daily_cost
    
    read -p "Are you ABSOLUTELY SURE you want to destroy everything? (type 'yes' to confirm): " CONFIRM
    
    if [ "$CONFIRM" != "yes" ]; then
        print_info "Destroy cancelled by user"
        exit 0
    fi
    
    echo ""
    read -p "Type 'DESTROY' to proceed with destruction: " FINAL_CONFIRM
    
    if [ "$FINAL_CONFIRM" != "DESTROY" ]; then
        print_info "Destroy cancelled by user"
        exit 0
    fi
}

# ============================================================================
# Backup State (Optional)
# ============================================================================

backup_state() {
    if [ -f "terraform.tfstate" ]; then
        BACKUP_FILE="terraform.tfstate.backup.$(date +%Y%m%d_%H%M%S)"
        print_info "Backing up Terraform state to $BACKUP_FILE..."
        cp terraform.tfstate "$BACKUP_FILE" 2>/dev/null || true
        print_success "State backed up"
    fi
}

# ============================================================================
# Destroy Resources
# ============================================================================

destroy_resources() {
    print_header "DESTROYING AWS RESOURCES"
    
    print_warning "Starting destruction process..."
    echo ""
    
    # Use the plan file if it exists, otherwise use auto-approve
    if [ -f "tfplan.destroy" ] && [ "$PLAN_ONLY" != "true" ]; then
        print_info "Applying destroy plan..."
        terraform apply tfplan.destroy
    else
        print_info "Running terraform destroy..."
        if [ "$AUTO_APPROVE" = "true" ]; then
            terraform destroy -auto-approve
        else
            terraform destroy
        fi
    fi
    
    if [ $? -eq 0 ]; then
        print_success "All resources destroyed successfully!"
        
        # Clean up plan files
        rm -f tfplan.destroy destroy-plan.txt 2>/dev/null || true
        
        echo ""
        print_info "Next steps:"
        echo "  1. Verify in AWS Console that all resources are deleted"
        echo "  2. Check your AWS bill after 24 hours to confirm no charges"
        echo "  3. Review CloudWatch for any remaining resources"
    else
        print_error "Destroy failed. Some resources may still exist."
        echo ""
        print_info "Troubleshooting:"
        echo "  1. Check AWS Console for remaining resources"
        echo "  2. Review Terraform error messages above"
        echo "  3. Manually delete any remaining resources"
        echo "  4. Run 'terraform destroy' again if needed"
        exit 1
    fi
}

# ============================================================================
# Post-Destroy Verification
# ============================================================================

verify_destruction() {
    print_header "VERIFICATION"
    
    print_info "Checking for remaining resources..."
    echo ""
    
    # Check for EKS clusters
    EKS_CLUSTERS=$(aws eks list-clusters --query 'clusters' --output text 2>/dev/null || echo "")
    if [ -n "$EKS_CLUSTERS" ]; then
        print_warning "EKS clusters still exist: $EKS_CLUSTERS"
    else
        print_success "No EKS clusters found"
    fi
    
    # Check for MSK clusters
    MSK_CLUSTERS=$(aws kafka list-clusters --query 'ClusterInfoList[].ClusterName' --output text 2>/dev/null || echo "")
    if [ -n "$MSK_CLUSTERS" ]; then
        print_warning "MSK clusters still exist: $MSK_CLUSTERS"
    else
        print_success "No MSK clusters found"
    fi
    
    # Check for DocumentDB clusters
    DOCDB_CLUSTERS=$(aws docdb describe-db-clusters --query 'DBClusters[].DBClusterIdentifier' --output text 2>/dev/null || echo "")
    if [ -n "$DOCDB_CLUSTERS" ]; then
        print_warning "DocumentDB clusters still exist: $DOCDB_CLUSTERS"
    else
        print_success "No DocumentDB clusters found"
    fi
    
    # Check for ElastiCache clusters
    REDIS_CLUSTERS=$(aws elasticache describe-replication-groups --query 'ReplicationGroups[].ReplicationGroupId' --output text 2>/dev/null || echo "")
    if [ -n "$REDIS_CLUSTERS" ]; then
        print_warning "ElastiCache clusters still exist: $REDIS_CLUSTERS"
    else
        print_success "No ElastiCache clusters found"
    fi
    
    echo ""
    print_info "Note: Some resources may take a few minutes to fully delete"
    print_info "Check AWS Console for complete verification"
}

# ============================================================================
# Main Execution
# ============================================================================

main() {
    print_header "CRYPTO OMS AWS - TERRAFORM DESTROY SCRIPT"
    echo ""
    
    # Parse arguments
    AUTO_APPROVE="false"
    PLAN_ONLY="false"
    
    for arg in "$@"; do
        case $arg in
            --auto|--auto-approve)
                AUTO_APPROVE="true"
                shift
                ;;
            --plan-only|--plan)
                PLAN_ONLY="true"
                shift
                ;;
            --help|-h)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --auto, --auto-approve    Auto-approve destruction (no confirmations)"
                echo "  --plan-only, --plan       Show destroy plan only (dry run)"
                echo "  --help, -h                Show this help message"
                echo ""
                echo "Examples:"
                echo "  $0                       # Interactive mode"
                echo "  $0 --auto                # Auto-approve"
                echo "  $0 --plan-only           # Dry run"
                exit 0
                ;;
            *)
                print_error "Unknown option: $arg"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done
    
    # Pre-flight checks
    check_terraform
    check_aws_cli
    check_terraform_init
    
    echo ""
    
    # Show destroy plan
    show_destroy_plan
    
    # If plan-only mode, exit here
    if [ "$PLAN_ONLY" = "true" ]; then
        print_info "Dry run complete. No resources were destroyed."
        print_info "Review destroy-plan.txt for details."
        exit 0
    fi
    
    # Confirm destruction
    confirm_destroy
    
    # Backup state
    backup_state
    
    # Destroy resources
    destroy_resources
    
    # Verify destruction
    if [ "$AUTO_APPROVE" != "true" ]; then
        echo ""
        read -p "Would you like to verify destruction? (y/n): " VERIFY
        if [ "$VERIFY" = "y" ] || [ "$VERIFY" = "Y" ]; then
            verify_destruction
        fi
    fi
    
    echo ""
    print_header "DESTROY COMPLETE"
    print_success "All AWS resources have been destroyed (or are being destroyed)"
    print_info "Remember to check your AWS bill after 24 hours to confirm no charges"
    echo ""
}

# Run main function
main "$@"
