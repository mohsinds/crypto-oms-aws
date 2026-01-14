# 🚀 STEP-BY-STEP AWS DEPLOYMENT GUIDE

## For First-Time AWS Users

**Author**: Guide for Mohsin Rasheed  
**Difficulty**: Beginner-friendly with detailed explanations  
**Time Required**: 2-3 hours for initial setup  
**Cost**: ~$5-10 for first day of testing

---

## ⚠️ BEFORE YOU BEGIN

### Cost Safety Checklist
- [ ] Set up billing alarm (see Step 1.5)
- [ ] Understand that resources cost money per hour
- [ ] Plan to run `terraform destroy` after testing
- [ ] Consider using AWS Free Tier eligible resources

---

## 📋 PHASE 1: AWS ACCOUNT SETUP (30 minutes)

### Step 1.1: Create AWS Account

1. Go to https://aws.amazon.com
2. Click "Create an AWS Account"
3. Fill in:
   - Email address (use your personal email)
   - Account name: "Mohsin-DevOps-Learning"
   - Password (save in password manager)
4. Choose "Personal" account type
5. Enter billing information (credit card required)
   - You won't be charged unless you exceed Free Tier limits
6. Verify identity (phone verification)
7. Select "Basic Support Plan" (FREE)

**Expected Result**: You'll receive a welcome email within 5 minutes.

---

### Step 1.2: Enable MFA (Multi-Factor Authentication)

🔒 **CRITICAL for Security** - Do this immediately!

1. Log in to [AWS Console](https://console.aws.amazon.com)
2. Click your account name (top right) → "Security credentials"
3. Under "Multi-factor authentication (MFA)", click "Activate MFA"
4. Choose "Virtual MFA device"
5. Use Google Authenticator app (download from app store)
6. Scan QR code with app
7. Enter two consecutive MFA codes
8. Click "Assign MFA"

**Why MFA?**: Protects your account even if password is compromised.

---

### Step 1.3: Create IAM User (Don't use root account)

1. In AWS Console, search for "IAM" service
2. Click "Users" → "Create user"
3. User name: `mohsin-terraform-admin`
4. Select "Provide user access to the AWS Management Console"
5. Choose "I want to create an IAM user"
6. Set console password (use strong password)
7. Uncheck "Users must create a new password at next sign-in"
8. Click "Next"

**Attach Permissions**:
9. Select "Attach policies directly"
10. Search and select these policies:
    - ✅ `AdministratorAccess` (for learning purposes)
    - Note: In production, use more restrictive policies
11. Click "Next" → "Create user"

**Save Credentials**:
12. Download the `.csv` file with credentials
13. Store it securely (you'll need it for CLI setup)

---

### Step 1.4: Create Access Keys for CLI

1. In IAM, click on your new user (`mohsin-terraform-admin`)
2. Go to "Security credentials" tab
3. Scroll to "Access keys" section
4. Click "Create access key"
5. Choose "Command Line Interface (CLI)"
6. Check "I understand the above recommendation"
7. Click "Next" → "Create access key"
8. **IMPORTANT**: Download the CSV file
   - This contains:
     - Access Key ID: `AKIAXXXXXXXXXXXXXXXX`
     - Secret Access Key: `xxxx...` (40 characters)
   - You'll NEVER see the secret key again!

**Store Securely**: Keep this CSV in a safe location.

---

### Step 1.5: Set Up Billing Alarm (Prevent Surprises!)

🚨 **CRITICAL - Do this before deploying anything!**

1. Go to [Billing Console](https://console.aws.amazon.com/billing/)
2. Click "Billing preferences" (left sidebar)
3. Enable:
   - ✅ "Receive Free Tier Usage Alerts"
   - ✅ "Receive Billing Alerts"
4. Enter your email address
5. Save preferences

**Create CloudWatch Alarm**:
6. Go to [CloudWatch Console](https://console.aws.amazon.com/cloudwatch/)
7. Click "Alarms" → "Create alarm"
8. Click "Select metric"
9. Choose "Billing" → "Total Estimated Charge"
10. Set:
    - Threshold: $50 (adjust based on your comfort)
    - Whenever charges >= $50
11. Click "Next"
12. Create new SNS topic: "BillingAlerts"
13. Enter your email
14. Click "Create alarm"
15. **Check your email** and confirm subscription

**Expected Result**: You'll get email alert if charges exceed $50.

---

## 📋 PHASE 2: LOCAL DEVELOPMENT SETUP (30 minutes)

### Step 2.1: Install AWS CLI

#### For macOS:
```bash
# Using Homebrew
brew install awscli

# Verify installation
aws --version
# Expected: aws-cli/2.x.x Python/3.x.x Darwin/xx.x.x
```

#### For Windows:
1. Download from: https://awscli.amazonaws.com/AWSCLIV2.msi
2. Run installer
3. Open PowerShell
4. Verify:
```powershell
aws --version
```

#### For Linux:
```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

aws --version
```

---

### Step 2.2: Configure AWS CLI

```bash
aws configure
```

**You'll be prompted for**:

```
AWS Access Key ID [None]: AKIAXXXXXXXXXXXXXXXX
AWS Secret Access Key [None]: xxxx...
Default region name [None]: us-east-1
Default output format [None]: json
```

**Where to get these values**:
- Access Key ID & Secret: From CSV file downloaded in Step 1.4
- Region: `us-east-1` (recommended for beginners)
- Output format: `json` (easiest to read)

**Verify Connection**:
```bash
aws sts get-caller-identity
```

**Expected Output**:
```json
{
    "UserId": "AIDAXXXXXXXXX",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/mohsin-terraform-admin"
}
```

✅ If you see your account number, you're connected!

---

### Step 2.3: Install Terraform

#### For macOS:
```bash
brew tap hashicorp/tap
brew install hashicorp/tap/terraform

terraform version
```

#### For Windows:
1. Download from: https://www.terraform.io/downloads
2. Extract `terraform.exe`
3. Move to `C:\Program Files\Terraform\`
4. Add to PATH:
   - Search "Environment Variables"
   - Edit System PATH
   - Add `C:\Program Files\Terraform`
5. Verify in new PowerShell:
```powershell
terraform version
```

#### For Linux:
```bash
wget https://releases.hashicorp.com/terraform/1.6.6/terraform_1.6.6_linux_amd64.zip
unzip terraform_1.6.6_linux_amd64.zip
sudo mv terraform /usr/local/bin/
terraform version
```

**Expected**: `Terraform v1.6.6` or later

---

### Step 2.4: Install kubectl (Kubernetes CLI)

#### For macOS:
```bash
brew install kubectl
kubectl version --client
```

#### For Windows:
```powershell
choco install kubernetes-cli
kubectl version --client
```

#### For Linux:
```bash
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
kubectl version --client
```

---

## 📋 PHASE 3: DEPLOY INFRASTRUCTURE (60 minutes)

### Step 3.1: Clone Project Repository

```bash
cd ~
mkdir aws-projects
cd aws-projects

# If using Git
git clone <your-repo-url> crypto-oms-aws
cd crypto-oms-aws

# Or download ZIP and extract
```

---

### Step 3.2: Review Terraform Configuration

**IMPORTANT**: Before deploying, understand what you're creating.

```bash
cd terraform
ls -la
```

**You should see**:
- `main.tf` - Main configuration
- `variables.tf` - Input parameters
- `vpc.tf` - Network setup
- `eks.tf` - Kubernetes cluster
- `*.tf` - Other resources

**Open `variables.tf` and review**:
```bash
# macOS/Linux
cat variables.tf | less

# Windows
type variables.tf
```

**Key variables to customize**:
```hcl
environment = "dev"              # Use "dev" for testing
aws_region = "us-east-1"         # Closest to you
eks_node_instance_types = ["t3.small"]  # Smaller = cheaper
```

---

### Step 3.3: Create terraform.tfvars (Cost-Optimized)

Create a file named `terraform.tfvars` for development:

```bash
cat > terraform.tfvars << 'EOF'
# DEVELOPMENT CONFIGURATION (Cost-Optimized)
project_name     = "crypto-oms"
environment      = "dev"
aws_region       = "us-east-1"

# Networking
vpc_cidr = "10.0.0.0/16"
availability_zones_count = 2  # Use 2 AZs instead of 3

# EKS Configuration
eks_version = "1.28"
eks_node_instance_types = ["t3.small"]  # Smaller instance
eks_node_desired_size = 1   # Start with 1 node
eks_node_min_size = 1
eks_node_max_size = 3

# Kafka Configuration (MOST EXPENSIVE COMPONENT)
kafka_version = "3.5.1"
kafka_instance_type = "kafka.t3.small"
kafka_broker_count = 2  # Minimum for dev (production: 3)
kafka_ebs_volume_size = 50  # Smaller volume

# Redis Configuration
redis_node_type = "cache.t3.micro"
redis_num_cache_nodes = 1  # No replication for dev

# DocumentDB Configuration
documentdb_instance_class = "db.t3.medium"
documentdb_cluster_size = 1  # Single instance for dev

# Cost Optimizations
enable_nat_gateway = true
single_nat_gateway = true  # Use 1 NAT Gateway instead of 3
enable_vpc_endpoints = true  # Reduce NAT Gateway usage
use_spot_instances = false  # Don't use for learning

# Monitoring
enable_monitoring = true
enable_logging = true
enable_kms_encryption = true

tags = {
  Owner = "Mohsin Rasheed"
  Purpose = "Learning"
  CostCenter = "Personal"
}
EOF
```

**This configuration costs approximately**: $150-200/month

---

### Step 3.4: Initialize Terraform

```bash
terraform init
```

**What this does**:
- Downloads AWS provider plugin
- Downloads Kubernetes provider plugin
- Prepares backend for state file
- Creates `.terraform` directory

**Expected Output**:
```
Initializing the backend...
Initializing provider plugins...
- Finding hashicorp/aws versions matching "~> 5.0"...
- Installing hashicorp/aws v5.31.0...
- Installed hashicorp/aws v5.31.0

Terraform has been successfully initialized!
```

✅ If you see this, proceed to next step.

---

### Step 3.5: Plan Deployment (Dry Run)

```bash
terraform plan -out=tfplan
```

**What this does**:
- Calculates what resources will be created
- Shows you the plan WITHOUT creating anything
- Saves plan to `tfplan` file
- This is your "preview" - NO CHARGES YET

**Expected Output** (abbreviated):
```
Terraform will perform the following actions:

  # aws_vpc.main will be created
  + resource "aws_vpc" "main" {
      + cidr_block = "10.0.0.0/16"
      ...
    }

  # aws_eks_cluster.main will be created
  + resource "aws_eks_cluster" "main" {
      + name = "crypto-oms-dev-eks"
      ...
    }

Plan: 47 to add, 0 to change, 0 to destroy.
```

**Review carefully**:
- Count of resources (should be 40-50)
- Estimated costs (if available)
- Resource names

---

### Step 3.6: Apply Configuration (CREATE RESOURCES)

⚠️ **WARNING**: This step creates real AWS resources and WILL cost money!

```bash
terraform apply tfplan
```

**What happens**:
1. Terraform creates resources in order of dependency
2. VPC first (foundation)
3. Then subnets, security groups
4. Then EKS cluster
5. Then MSK, Redis, DocumentDB
6. Takes 15-30 minutes

**Expected Output**:
```
aws_vpc.main: Creating...
aws_vpc.main: Creation complete after 3s [id=vpc-xxxxx]
aws_subnet.public[0]: Creating...
...
(15-30 minutes later)
...
Apply complete! Resources: 47 added, 0 changed, 0 destroyed.

Outputs:

eks_cluster_endpoint = "https://XXXXX.eks.amazonaws.com"
kafka_bootstrap_servers = "b-1.xxx.kafka.us-east-1.amazonaws.com:9092"
redis_endpoint = "xxxxx.cache.amazonaws.com:6379"
documentdb_endpoint = "xxxxx.docdb.amazonaws.com:27017"
```

✅ **Success!** Your infrastructure is now running in AWS!

---

### Step 3.7: Configure kubectl for EKS

```bash
aws eks update-kubeconfig --region us-east-1 --name crypto-oms-dev-eks
```

**What this does**:
- Downloads cluster credentials
- Updates `~/.kube/config` file
- Allows kubectl to connect to your EKS cluster

**Verify connection**:
```bash
kubectl get nodes
```

**Expected Output**:
```
NAME                                        STATUS   ROLES    AGE   VERSION
ip-10-0-1-123.ec2.internal                  Ready    <none>   5m    v1.28.0
```

✅ If you see a node, Kubernetes is working!

---

## 📋 PHASE 4: DEPLOY MICROSERVICES (30 minutes)

### Step 4.1: Build Docker Images

```bash
cd ../services/OrderIngestion

# Build .NET Core API
docker build -t crypto-oms/order-ingestion:v1 .

# Tag for AWS ECR (Elastic Container Registry)
aws ecr create-repository --repository-name crypto-oms/order-ingestion
docker tag crypto-oms/order-ingestion:v1 <account-id>.dkr.ecr.us-east-1.amazonaws.com/crypto-oms/order-ingestion:v1

# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Push image
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/crypto-oms/order-ingestion:v1
```

---

### Step 4.2: Deploy to Kubernetes

```bash
cd ../../k8s/deployments

# Deploy Order Ingestion API
kubectl apply -f order-ingestion-deployment.yaml
kubectl apply -f order-ingestion-service.yaml

# Check deployment
kubectl get pods
kubectl get services
```

**Expected Output**:
```
NAME                                 READY   STATUS    RESTARTS   AGE
order-ingestion-5d4f7c9b8-abcde      1/1     Running   0          30s

NAME                  TYPE           CLUSTER-IP      EXTERNAL-IP                                      PORT(S)
order-ingestion       LoadBalancer   10.100.X.X      a1b2c3-123456789.us-east-1.elb.amazonaws.com    80:30080/TCP
```

✅ Copy the EXTERNAL-IP - this is your API endpoint!

---

## 📋 PHASE 5: DEPLOY FRONTEND (15 minutes)

### Step 5.1: Build React App

```bash
cd ../../frontend

# Install dependencies
npm install

# Build for production
npm run build
```

### Step 5.2: Deploy to S3

```bash
# Upload to S3
aws s3 sync dist/ s3://crypto-oms-dev-frontend --acl public-read

# Enable static website hosting
aws s3 website s3://crypto-oms-dev-frontend --index-document index.html
```

**Get website URL**:
```bash
echo "http://crypto-oms-dev-frontend.s3-website-us-east-1.amazonaws.com"
```

---

## 📋 PHASE 6: TESTING (15 minutes)

### Step 6.1: Test API Endpoint

```bash
# Get LoadBalancer URL
LOAD_BALANCER=$(kubectl get svc order-ingestion -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

# Test health endpoint
curl http://$LOAD_BALANCER/health

# Expected: {"status": "healthy", "timestamp": "2025-01-14T10:30:00Z"}
```

### Step 6.2: Place Test Order

```bash
curl -X POST http://$LOAD_BALANCER/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "BTC/USD",
    "side": "BUY",
    "quantity": 0.1,
    "price": 45000,
    "orderType": "LIMIT"
  }'
```

**Expected Response**:
```json
{
  "orderId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "ACCEPTED",
  "timestamp": "2025-01-14T10:31:00Z"
}
```

✅ If you get an orderId, your OMS is working!

---

## 📋 PHASE 7: MONITORING (10 minutes)

### Check CloudWatch Logs

1. Go to AWS Console → CloudWatch → Logs
2. Find log group: `/aws/eks/crypto-oms-dev-eks/cluster`
3. View logs for debugging

### Check Kubernetes Dashboard

```bash
# Install metrics server
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# View pod metrics
kubectl top pods
kubectl top nodes
```

---

## 🛑 PHASE 8: CLEANUP (IMPORTANT!)

⚠️ **Run this when you're done testing to avoid ongoing charges!**

### Step 8.1: Delete Kubernetes Resources

```bash
kubectl delete all --all
```

### Step 8.2: Destroy Infrastructure

```bash
cd terraform
terraform destroy -auto-approve
```

**What this does**:
- Deletes ALL resources created by Terraform
- Stops all charges
- Takes 10-15 minutes
- Confirms each deletion

**Type `yes` when prompted**

### Step 8.3: Verify Deletion

1. Go to AWS Console
2. Check these services (should be empty):
   - EC2 → Instances
   - VPC → Your VPCs
   - EKS → Clusters
   - MSK → Clusters

✅ If everything is gone, cleanup successful!

---

## 📊 COST TRACKING

### Check Current Charges

```bash
aws ce get-cost-and-usage \
  --time-period Start=2025-01-01,End=2025-01-15 \
  --granularity DAILY \
  --metrics "BlendedCost" \
  --group-by Type=DIMENSION,Key=SERVICE
```

### Monthly Cost Estimate (Development)

| Service | Cost/Month |
|---------|-----------|
| EKS Cluster | $72 |
| MSK (2 brokers) | $302 |
| EC2 (2x t3.small) | $30 |
| NAT Gateway (1x) | $32 |
| ElastiCache | $12 |
| DocumentDB | $50 |
| ALB | $16 |
| **Total** | **~$514/month** |

---

## 🎓 NEXT STEPS

1. ✅ Complete this deployment
2. 📖 Read through each Terraform file
3. 🧪 Experiment with different configurations
4. 📊 Monitor costs daily
5. 🔧 Customize microservices
6. 📝 Document your learnings

---

## 🆘 TROUBLESHOOTING

### Issue: "Error: AccessDenied"
**Solution**: Check IAM permissions for your user

### Issue: "Error: Quota exceeded"
**Solution**: Request limit increase in AWS Support

### Issue: "Pods not starting"
**Solution**: Check logs with `kubectl logs <pod-name>`

### Issue: "Costs higher than expected"
**Solution**: Run `terraform destroy` immediately

---

## 📚 ADDITIONAL RESOURCES

- [AWS Documentation](https://docs.aws.amazon.com)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [EKS Best Practices](https://aws.github.io/aws-eks-best-practices/)

---

## ✅ COMPLETION CHECKLIST

- [ ] AWS account created
- [ ] MFA enabled
- [ ] Billing alarm set ($50 threshold)
- [ ] AWS CLI configured
- [ ] Terraform installed
- [ ] Infrastructure deployed
- [ ] API tested successfully
- [ ] Frontend deployed
- [ ] Costs monitored
- [ ] Cleanup completed

**Congratulations, Mohsin! You've deployed an enterprise-scale OMS on AWS!** 🎉

---

*Last updated: January 14, 2025*
