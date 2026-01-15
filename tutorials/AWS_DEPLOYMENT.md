# ☁️ AWS Deployment Tutorial - Crypto OMS

Complete step-by-step guide to deploy the Crypto OMS project to Amazon Web Services (AWS).

## 📋 Prerequisites Checklist

Before starting, ensure you have:
- [ ] AWS Account (see Step 1)
- [ ] Credit card for billing (won't be charged unless you exceed Free Tier)
- [ ] Administrator access to your computer
- [ ] Internet connection
- [ ] 2-3 hours available for initial setup

## ⏱️ Estimated Time

- **AWS Account Setup**: 30 minutes
- **Local Tools Setup**: 30 minutes
- **Infrastructure Deployment**: 30-45 minutes
- **Service Deployment**: 1-2 hours
- **Total**: 2-4 hours

## 💰 Estimated Cost

- **First Day**: ~$5-10 (for testing)
- **Monthly (if running 24/7)**: ~$514/month (development config)
- **⚠️ IMPORTANT**: Always destroy resources when not in use!

---

## Phase 1: AWS Account Setup

### Step 1.1: Create AWS Account

1. **Visit AWS Website**:
   - Go to https://aws.amazon.com
   - Click "Create an AWS Account" (top right)

2. **Account Information**:
   - Email address: Use your email
   - Account name: "Crypto-OMS-Dev"
   - Password: Create a strong password (save in password manager)
   - Click "Continue"

3. **Contact Information**:
   - Full name
   - Company name (optional - can use "Personal")
   - Phone number
   - Country/Region
   - Address
   - Click "Continue"

4. **Payment Information**:
   - Enter credit card details
   - **Note**: You won't be charged unless you exceed Free Tier limits
   - Click "Verify and Continue"

5. **Identity Verification**:
   - Choose phone call or SMS
   - Enter verification code
   - Click "Continue"

6. **Support Plan**:
   - Select "Basic Support Plan" (FREE)
   - Click "Complete sign up"

**Expected Result**: You'll receive a welcome email within 5 minutes.

---

### Step 1.2: Enable MFA (Multi-Factor Authentication)

🔒 **CRITICAL for Security** - Do this immediately!

1. **Log in to AWS Console**:
   - Go to https://console.aws.amazon.com
   - Sign in with your root account

2. **Navigate to Security Credentials**:
   - Click your account name (top right)
   - Click "Security credentials"

3. **Activate MFA**:
   - Scroll to "Multi-factor authentication (MFA)"
   - Click "Activate MFA"
   - Choose "Virtual MFA device"
   - Click "Continue"

4. **Set Up Authenticator App**:
   - Download Google Authenticator (or similar) on your phone
   - Scan the QR code with the app
   - Enter two consecutive MFA codes
   - Click "Assign MFA"

**Why MFA?**: Protects your account even if password is compromised.

---

### Step 1.3: Create IAM User

**⚠️ Never use root account for daily operations!**

1. **Navigate to IAM**:
   - In AWS Console, search for "IAM"
   - Click "IAM" service

2. **Create User**:
   - Click "Users" (left sidebar)
   - Click "Create user"
   - User name: `crypto-oms-admin`
   - Click "Next"

3. **Set Permissions**:
   - Select "Attach policies directly"
   - Search for "AdministratorAccess"
   - Check the box next to "AdministratorAccess"
   - **Note**: In production, use more restrictive policies
   - Click "Next" → "Create user"

4. **Save Credentials**:
   - Click on the user you just created
   - Go to "Security credentials" tab
   - Click "Create access key"
   - Choose "Command Line Interface (CLI)"
   - Check "I understand the above recommendation"
   - Click "Next" → "Create access key"
   - **IMPORTANT**: Download the CSV file
   - **Store securely**: You'll need these credentials!

**CSV File Contains**:
- Access Key ID: `AKIAXXXXXXXXXXXXXXXX`
- Secret Access Key: `xxxx...` (40 characters)

---

### Step 1.4: Set Up Billing Alarm

🚨 **CRITICAL - Do this before deploying anything!**

1. **Enable Billing Alerts**:
   - Go to https://console.aws.amazon.com/billing/
   - Click "Billing preferences" (left sidebar)
   - Enable:
     - ✅ "Receive Free Tier Usage Alerts"
     - ✅ "Receive Billing Alerts"
   - Enter your email address
   - Click "Save preferences"

2. **Create CloudWatch Billing Alarm**:
   - Go to https://console.aws.amazon.com/cloudwatch/
   - Click "Alarms" → "All alarms" → "Create alarm"
   - Click "Select metric"
   - Choose "Billing" → "Total Estimated Charge"
   - Select "USD" currency
   - Click "Select metric"

3. **Configure Alarm**:
   - Threshold type: "Static"
   - Whenever charges are: "Greater than"
   - Threshold: `50` (or your preferred amount)
   - Click "Next"

4. **Configure Actions**:
   - Click "Create new topic"
   - Topic name: "BillingAlerts"
   - Email addresses: Your email
   - Click "Create topic"
   - Click "Next" → "Next" → "Create alarm"

5. **Confirm Email**:
   - Check your email
   - Click the confirmation link in the email from AWS SNS

**Expected Result**: You'll get email alerts if charges exceed $50.

---

## Phase 2: Install Required Tools

### Step 2.1: Install AWS CLI

#### For macOS:

```bash
# Install via Homebrew
brew install awscli

# Verify installation
aws --version
# Expected: aws-cli/2.x.x
```

#### For Windows:

1. **Download AWS CLI**:
   - Visit: https://awscli.amazonaws.com/AWSCLIV2.msi
   - Download the installer

2. **Install**:
   - Run the installer
   - Follow the wizard
   - Keep default options

3. **Verify**:
   ```powershell
   aws --version
   # Expected: aws-cli/2.x.x
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

**Where to get these**:
- Access Key ID & Secret: From CSV file downloaded in Step 1.3
- Region: `us-east-1` (recommended) or choose closest to you
- Output format: `json` (easiest to read)

**Verify Configuration**:

```bash
aws sts get-caller-identity
```

**Expected Output**:
```json
{
    "UserId": "AIDAXXXXXXXXX",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/crypto-oms-admin"
}
```

✅ If you see your account number, you're connected!

---

### Step 2.3: Install Terraform

#### For macOS:

```bash
# Install via Homebrew
brew tap hashicorp/tap
brew install hashicorp/tap/terraform

# Verify installation
terraform version
# Expected: Terraform v1.6.x or later
```

#### For Windows:

1. **Download Terraform**:
   - Visit: https://www.terraform.io/downloads
   - Download Windows 64-bit
   - Extract `terraform.exe`

2. **Add to PATH**:
   - Move `terraform.exe` to `C:\Program Files\Terraform\`
   - Add to PATH:
     - Search "Environment Variables"
     - Edit System PATH
     - Add `C:\Program Files\Terraform`
   - Restart PowerShell

3. **Verify**:
   ```powershell
   terraform version
   # Expected: Terraform v1.6.x
   ```

---

### Step 2.4: Install kubectl

#### For macOS:

```bash
# Install via Homebrew
brew install kubectl

# Verify installation
kubectl version --client
# Expected: v1.28.x or later
```

#### For Windows:

1. **Download kubectl**:
   - Visit: https://kubernetes.io/docs/tasks/tools/install-kubectl-windows/
   - Download `kubectl.exe`

2. **Add to PATH**:
   - Move to `C:\Program Files\kubectl\`
   - Add to PATH (same as Terraform)

3. **Verify**:
   ```powershell
   kubectl version --client
   # Expected: v1.28.x
   ```

---

### Step 2.5: Verify Docker Desktop

Docker Desktop should already be installed from local setup. Verify:

```bash
# macOS/Linux
docker --version
docker compose version

# Windows
docker --version
docker compose version
```

If not installed, follow the local setup tutorial first.

---

## Phase 3: Deploy Infrastructure with Terraform

### Step 3.1: Clone/Prepare Repository

```bash
# Navigate to project directory
cd crypto-oms-aws

# Verify you're in the right place
ls -la
# Should see: terraform/, services/, frontend/, k8s/
```

---

### Step 3.2: Configure Terraform Variables

```bash
cd terraform

# Copy example configuration
cp terraform.tfvars.example terraform.tfvars

# Edit terraform.tfvars (use your preferred editor)
# For macOS/Linux:
nano terraform.tfvars
# OR
code terraform.tfvars

# For Windows:
notepad terraform.tfvars
# OR
code terraform.tfvars
```

**Edit `terraform.tfvars`** with your values:

```hcl
# Basic Configuration
project_name     = "crypto-oms"
environment      = "dev"
aws_region       = "us-east-1"  # Change to your preferred region

# Networking
vpc_cidr = "10.0.0.0/16"
availability_zones_count = 2

# EKS Configuration
eks_version = "1.28"
eks_node_instance_types = ["t3.small"]
eks_node_desired_size = 1
eks_node_min_size = 1
eks_node_max_size = 3

# Kafka Configuration
kafka_version = "3.5.1"
kafka_instance_type = "kafka.t3.small"
kafka_broker_count = 2
kafka_ebs_volume_size = 50

# Redis Configuration
redis_node_type = "cache.t3.micro"
redis_num_cache_nodes = 1

# DocumentDB Configuration
documentdb_instance_class = "db.t3.medium"
documentdb_cluster_size = 1

# Cost Optimizations
enable_nat_gateway = true
single_nat_gateway = true
enable_vpc_endpoints = true
use_spot_instances = false

# Tags
tags = {
  Owner = "YourName"
  Purpose = "Development"
  CostCenter = "Engineering"
}
```

**Save the file**.

---

### Step 3.3: Initialize Terraform

```bash
cd terraform

# Initialize Terraform (downloads providers)
terraform init

# Expected output:
# Terraform has been successfully initialized!
```

**What this does**:
- Downloads AWS provider plugin
- Downloads Kubernetes provider plugin
- Prepares backend for state management
- Creates `.terraform` directory

---

### Step 3.4: Review Deployment Plan

```bash
# Create deployment plan (dry run - NO CHARGES YET)
terraform plan -out=tfplan

# Review the plan carefully:
# - Count of resources (should be 40-50)
# - Resource names
# - Estimated costs (if shown)
```

**Expected Output**:
```
Terraform will perform the following actions:

  # aws_vpc.main will be created
  + resource "aws_vpc" "main" {
      + cidr_block = "10.0.0.0/16"
      ...
    }

Plan: 47 to add, 0 to change, 0 to destroy.
```

**⚠️ Review carefully before proceeding!**

---

### Step 3.5: Deploy Infrastructure

```bash
# Apply the plan (THIS CREATES RESOURCES AND COSTS MONEY!)
terraform apply tfplan

# You'll be prompted to confirm
# Type: yes
```

**What happens**:
1. Terraform creates resources in dependency order
2. VPC first (foundation)
3. Then subnets, security groups
4. Then EKS cluster (10-15 minutes)
5. Then MSK, Redis, DocumentDB (10-15 minutes each)
6. Then ALB, S3
7. **Total time**: 20-30 minutes

**Expected Output**:
```
aws_vpc.main: Creating...
aws_vpc.main: Creation complete after 3s [id=vpc-xxxxx]
...
Apply complete! Resources: 47 added, 0 changed, 0 destroyed.

Outputs:

eks_cluster_name = "crypto-oms-dev-eks"
kafka_bootstrap_brokers = "b-1.xxx.kafka.us-east-1.amazonaws.com:9094"
redis_endpoint = "xxxxx.cache.amazonaws.com"
documentdb_endpoint = "xxxxx.docdb.amazonaws.com"
alb_dns_name = "crypto-oms-dev-alb-xxxxx.us-east-1.elb.amazonaws.com"
```

✅ **Success!** Your infrastructure is now running in AWS!

---

### Step 3.6: Save Terraform Outputs

```bash
# Save outputs to a file for later use
terraform output -json > terraform-outputs.json

# View outputs
terraform output
```

**Important**: Save these outputs - you'll need them for service deployment!

---

### Step 3.7: Configure kubectl for EKS

```bash
# Get EKS cluster name
EKS_CLUSTER=$(terraform output -raw eks_cluster_name)
AWS_REGION=$(terraform output -raw aws_region || echo "us-east-1")

# Configure kubectl
aws eks update-kubeconfig --name $EKS_CLUSTER --region $AWS_REGION

# Verify connection
kubectl get nodes
```

**Expected Output**:
```
NAME                                        STATUS   ROLES    AGE   VERSION
ip-10-0-1-123.ec2.internal                  Ready    <none>   5m    v1.28.0
```

✅ If you see nodes, Kubernetes is working!

---

## Phase 4: Build and Push Docker Images

### Step 4.1: Get AWS Account Information

```bash
# Get AWS account ID
AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=$(aws configure get region)

echo "AWS Account: $AWS_ACCOUNT"
echo "AWS Region: $AWS_REGION"
```

---

### Step 4.2: Create ECR Repositories

```bash
# Create ECR repositories for each service
aws ecr create-repository \
  --repository-name crypto-oms/order-ingestion \
  --region $AWS_REGION || true

aws ecr create-repository \
  --repository-name crypto-oms/order-processor \
  --region $AWS_REGION || true

aws ecr create-repository \
  --repository-name crypto-oms/risk-engine \
  --region $AWS_REGION || true

aws ecr create-repository \
  --repository-name crypto-oms/market-data \
  --region $AWS_REGION || true

# Verify repositories created
aws ecr describe-repositories --region $AWS_REGION
```

---

### Step 4.3: Login to ECR

```bash
# Login to ECR
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin \
  $AWS_ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com

# Expected: Login Succeeded
```

---

### Step 4.4: Build and Push Order Ingestion Image

```bash
cd services/OrderIngestion

# Build Docker image
docker build -t crypto-oms/order-ingestion:latest .

# Tag for ECR
docker tag crypto-oms/order-ingestion:latest \
  $AWS_ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com/crypto-oms/order-ingestion:latest

# Push to ECR
docker push \
  $AWS_ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com/crypto-oms/order-ingestion:latest

# Expected: Image pushed successfully
```

---

### Step 4.5: Build and Push Order Processor Image

```bash
cd ../OrderProcessor

# Build
docker build -t crypto-oms/order-processor:latest .

# Tag
docker tag crypto-oms/order-processor:latest \
  $AWS_ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com/crypto-oms/order-processor:latest

# Push
docker push \
  $AWS_ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com/crypto-oms/order-processor:latest
```

---

### Step 4.6: Build and Push Risk Engine Image

```bash
cd ../RiskEngine

# Build
docker build -t crypto-oms/risk-engine:latest .

# Tag
docker tag crypto-oms/risk-engine:latest \
  $AWS_ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com/crypto-oms/risk-engine:latest

# Push
docker push \
  $AWS_ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com/crypto-oms/risk-engine:latest
```

---

### Step 4.7: Build and Push Market Data Image

```bash
cd ../MarketData

# Build
docker build -t crypto-oms/market-data:latest .

# Tag
docker tag crypto-oms/market-data:latest \
  $AWS_ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com/crypto-oms/market-data:latest

# Push
docker push \
  $AWS_ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com/crypto-oms/market-data:latest
```

---

## Phase 5: Configure Kubernetes

### Step 5.1: Get AWS Service Endpoints

```bash
cd ../../terraform

# Get all required endpoints
REDIS_ENDPOINT=$(terraform output -raw redis_endpoint)
KAFKA_BOOTSTRAP=$(terraform output -raw kafka_bootstrap_brokers)
DOCUMENTDB_ENDPOINT=$(terraform output -raw documentdb_endpoint)
DOCUMENTDB_SECRET_ARN=$(terraform output -raw documentdb_secret_arn)

# Display endpoints
echo "Redis: $REDIS_ENDPOINT"
echo "Kafka: $KAFKA_BOOTSTRAP"
echo "DocumentDB: $DOCUMENTDB_ENDPOINT"
```

---

### Step 5.2: Get DocumentDB Credentials

```bash
# Retrieve DocumentDB credentials from Secrets Manager
DOCUMENTDB_USERNAME=$(aws secretsmanager get-secret-value \
  --secret-id $DOCUMENTDB_SECRET_ARN \
  --query SecretString --output text | jq -r '.username')

DOCUMENTDB_PASSWORD=$(aws secretsmanager get-secret-value \
  --secret-id $DOCUMENTDB_SECRET_ARN \
  --query SecretString --output text | jq -r '.password')

echo "DocumentDB Username: $DOCUMENTDB_USERNAME"
# Password is sensitive - don't echo it
```

**Note**: If `jq` is not installed:
- **macOS**: `brew install jq`
- **Windows**: Download from https://stedolan.github.io/jq/download/

---

### Step 5.3: Update ConfigMap

```bash
cd ../k8s/configmaps

# Edit app-config.yaml
# Replace placeholders with actual values:

# REPLACE_WITH_REDIS_ENDPOINT → $REDIS_ENDPOINT
# REPLACE_WITH_KAFKA_BOOTSTRAP_SERVERS → $KAFKA_BOOTSTRAP
# REPLACE_WITH_DOCUMENTDB_ENDPOINT → $DOCUMENTDB_ENDPOINT
```

**Example** (after replacement):
```yaml
data:
  redis-endpoint: "crypto-oms-dev-redis.xxxxx.cache.amazonaws.com"
  kafka-bootstrap-servers: "b-1.xxx.kafka.us-east-1.amazonaws.com:9094"
  documentdb-endpoint: "crypto-oms-dev-docdb.cluster-xxxxx.docdb.amazonaws.com"
```

---

### Step 5.4: Update Secrets

```bash
cd ../secrets

# Edit app-secrets.yaml
# Replace placeholders:

# REPLACE_WITH_DOCUMENTDB_USERNAME → $DOCUMENTDB_USERNAME
# REPLACE_WITH_DOCUMENTDB_PASSWORD → $DOCUMENTDB_PASSWORD
```

**Example** (after replacement):
```yaml
stringData:
  documentdb-username: "admin"
  documentdb-password: "YourSecurePassword123!"
```

---

### Step 5.5: Update Deployment Images

```bash
cd ../deployments

# Update all deployment files to use your ECR images
# Replace <AWS_ACCOUNT_ID> with $AWS_ACCOUNT
# Replace <AWS_REGION> with $AWS_REGION

# macOS/Linux:
find . -name "*-deployment.yaml" -exec sed -i '' "s/<AWS_ACCOUNT_ID>/$AWS_ACCOUNT/g" {} \;
find . -name "*-deployment.yaml" -exec sed -i '' "s/<AWS_REGION>/$AWS_REGION/g" {} \;

# Windows (PowerShell):
Get-ChildItem -Filter "*-deployment.yaml" | ForEach-Object {
    (Get-Content $_.FullName) -replace '<AWS_ACCOUNT_ID>', $AWS_ACCOUNT | Set-Content $_.FullName
    (Get-Content $_.FullName) -replace '<AWS_REGION>', $AWS_REGION | Set-Content $_.FullName
}
```

**Verify** one deployment file to ensure replacement worked:
```bash
# Check Order Ingestion deployment
grep -A 2 "image:" deployments/order-ingestion-deployment.yaml
# Should show: image: 123456789012.dkr.ecr.us-east-1.amazonaws.com/crypto-oms/order-ingestion:latest
```

---

## Phase 6: Deploy Services to Kubernetes

### Step 6.1: Create Namespace

```bash
cd ../../k8s

# Create namespace
kubectl create namespace crypto-oms

# Verify
kubectl get namespaces | grep crypto-oms
```

---

### Step 6.2: Apply ConfigMap and Secrets

```bash
# Apply ConfigMap
kubectl apply -f configmaps/app-config.yaml

# Apply Secrets
kubectl apply -f secrets/app-secrets.yaml

# Verify
kubectl get configmap app-config -n crypto-oms
kubectl get secret app-secrets -n crypto-oms
```

---

### Step 6.3: Deploy Services

```bash
# Deploy all services
kubectl apply -f services/

# Verify services created
kubectl get svc -n crypto-oms
```

---

### Step 6.4: Deploy Deployments

```bash
# Deploy all deployments
kubectl apply -f deployments/*-deployment.yaml

# Verify deployments
kubectl get deployments -n crypto-oms

# Check pod status
kubectl get pods -n crypto-oms
```

**Expected Output**:
```
NAME                                 READY   STATUS    RESTARTS   AGE
order-ingestion-5d4f7c9b8-abcde      1/1     Running   0          30s
order-processor-7c8d9e0f1-defgh      1/1     Running   0          25s
risk-engine-9a0b1c2d3-hijkl         1/1     Running   0          20s
market-data-4e5f6g7h8-mnopq          1/1     Running   0          15s
```

**Wait for all pods to be `Running`** (may take 1-2 minutes).

---

### Step 6.5: Deploy Horizontal Pod Autoscalers

```bash
# Deploy HPAs
kubectl apply -f deployments/*-hpa.yaml

# Verify HPAs
kubectl get hpa -n crypto-oms
```

---

### Step 6.6: Verify Deployments

```bash
# Check all resources
kubectl get all -n crypto-oms

# Check pod logs
kubectl logs -n crypto-oms -l app=order-ingestion --tail=50

# Check if pods are healthy
kubectl get pods -n crypto-oms -o wide
```

---

## Phase 7: Configure Application Load Balancer

### Step 7.1: Install AWS Load Balancer Controller

```bash
# Download IAM policy
curl -O https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/v2.7.0/docs/install/iam_policy.json

# Create IAM policy
aws iam create-policy \
  --policy-name AWSLoadBalancerControllerIAMPolicy \
  --policy-document file://iam_policy.json

# Get policy ARN (save this)
POLICY_ARN=$(aws iam list-policies --query 'Policies[?PolicyName==`AWSLoadBalancerControllerIAMPolicy`].Arn' --output text)

# Create IAM role for service account
eksctl create iamserviceaccount \
  --cluster=crypto-oms-dev-eks \
  --namespace=kube-system \
  --name=aws-load-balancer-controller \
  --attach-policy-arn=$POLICY_ARN \
  --override-existing-serviceaccounts \
  --approve

# Install AWS Load Balancer Controller
helm repo add eks https://aws.github.io/eks-charts
helm repo update
helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=crypto-oms-dev-eks \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller

# Verify installation
kubectl get deployment aws-load-balancer-controller -n kube-system
```

---

### Step 7.2: Create Ingress

Create `k8s/ingress/alb-ingress.yaml`:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: crypto-oms-ingress
  namespace: crypto-oms
  annotations:
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTP": 80}, {"HTTPS": 443}]'
    alb.ingress.kubernetes.io/ssl-redirect: '443'
spec:
  ingressClassName: alb
  rules:
  - http:
      paths:
      - path: /api/orders
        pathType: Prefix
        backend:
          service:
            name: order-ingestion
            port:
              number: 80
      - path: /api/risk
        pathType: Prefix
        backend:
          service:
            name: risk-engine
            port:
              number: 80
      - path: /api/market-data
        pathType: Prefix
        backend:
          service:
            name: market-data
            port:
              number: 80
      - path: /ws/market-data
        pathType: Prefix
        backend:
          service:
            name: market-data
            port:
              number: 80
```

Apply:

```bash
kubectl apply -f k8s/ingress/alb-ingress.yaml

# Get ALB DNS name
kubectl get ingress -n crypto-oms
```

---

## Phase 8: Deploy Frontend to S3

### Step 8.1: Build Frontend

```bash
cd frontend

# Install dependencies (if not done)
npm install

# Build for production
npm run build

# Output will be in dist/ directory
```

---

### Step 8.2: Get S3 Bucket Name

```bash
cd ../terraform

# Get S3 bucket name
S3_BUCKET=$(terraform output -raw s3_bucket_name)

echo "S3 Bucket: $S3_BUCKET"
```

---

### Step 8.3: Upload to S3

```bash
cd ../frontend

# Upload to S3
aws s3 sync dist/ s3://$S3_BUCKET --delete

# Enable static website hosting
aws s3 website s3://$S3_BUCKET \
  --index-document index.html \
  --error-document index.html

# Get website URL
aws s3api get-bucket-website --bucket $S3_BUCKET
```

---

### Step 8.4: Update Frontend Environment Variables

Update frontend build to use ALB endpoint:

```bash
# Get ALB DNS name
ALB_DNS=$(terraform output -raw alb_dns_name)

# Rebuild frontend with ALB endpoint
cd frontend

# Update .env.production (create if doesn't exist)
echo "VITE_API_URL=http://$ALB_DNS" > .env.production
echo "VITE_WS_URL=ws://$ALB_DNS/ws/market-data" >> .env.production

# Rebuild
npm run build

# Re-upload
aws s3 sync dist/ s3://$S3_BUCKET --delete
```

---

## Phase 9: Verify Deployment

### Step 9.1: Test Order Ingestion API

```bash
# Get ALB DNS name
ALB_DNS=$(terraform output -raw alb_dns_name)

# Test health endpoint
curl http://$ALB_DNS/api/orders/health

# Place a test order
curl -X POST http://$ALB_DNS/api/orders \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: test-$(date +%s)" \
  -d '{
    "symbol": "BTC/USD",
    "side": "BUY",
    "orderType": "LIMIT",
    "quantity": 0.1,
    "price": 45000
  }'
```

**Expected**: JSON response with `orderId` and `status: "ACCEPTED"`

---

### Step 9.2: Test Risk Engine

```bash
# Test risk validation
curl -X POST http://$ALB_DNS/api/risk/validate \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "test-123",
    "userId": "user123",
    "symbol": "BTC/USD",
    "side": "BUY",
    "orderType": "LIMIT",
    "quantity": 0.1,
    "price": 45000,
    "currentPrice": 45000
  }'
```

---

### Step 9.3: Test Market Data Service

```bash
# Test price endpoint
curl http://$ALB_DNS/api/market-data/prices/BTC%2FUSD

# Test order book
curl http://$ALB_DNS/api/market-data/orderbook/BTC%2FUSD
```

---

### Step 9.4: Test Frontend

1. Get S3 website URL:
   ```bash
   terraform output s3_website_endpoint
   ```

2. Open browser and navigate to the URL
3. You should see the trading dashboard
4. Test placing an order

---

### Step 9.5: Verify Pod Logs

```bash
# Check Order Ingestion logs
kubectl logs -n crypto-oms -l app=order-ingestion --tail=50

# Check Order Processor logs
kubectl logs -n crypto-oms -l app=order-processor --tail=50

# Check Risk Engine logs
kubectl logs -n crypto-oms -l app=risk-engine --tail=50

# Check Market Data logs
kubectl logs -n crypto-oms -l app=market-data --tail=50
```

---

## Phase 10: Monitoring and Verification

### Step 10.1: Check AWS Console

1. **EKS Console**:
   - Go to https://console.aws.amazon.com/eks/
   - Verify cluster is "Active"
   - Check node group status

2. **ECR Console**:
   - Go to https://console.aws.amazon.com/ecr/
   - Verify all 4 repositories have images

3. **EC2 Console**:
   - Go to https://console.aws.amazon.com/ec2/
   - Check EKS node instances are running

4. **MSK Console**:
   - Go to https://console.aws.amazon.com/msk/
   - Verify cluster is "Active"

5. **ElastiCache Console**:
   - Go to https://console.aws.amazon.com/elasticache/
   - Verify Redis cluster is "Available"

6. **DocumentDB Console**:
   - Go to https://console.aws.amazon.com/docdb/
   - Verify cluster is "Available"

---

### Step 10.2: Check Kubernetes Resources

```bash
# Check all resources
kubectl get all -n crypto-oms

# Check pod status
kubectl get pods -n crypto-oms -o wide

# Check service endpoints
kubectl get endpoints -n crypto-oms

# Check HPA status
kubectl get hpa -n crypto-oms

# Describe a pod for details
kubectl describe pod <pod-name> -n crypto-oms
```

---

### Step 10.3: Monitor Costs

```bash
# Check current costs
aws ce get-cost-and-usage \
  --time-period Start=$(date -u -d '1 day ago' +%Y-%m-%d),End=$(date -u +%Y-%m-%d) \
  --granularity DAILY \
  --metrics "BlendedCost"
```

Or check in AWS Console:
- Go to https://console.aws.amazon.com/cost-management/
- View "Cost Explorer"

---

## 🛑 Cleanup (IMPORTANT!)

**⚠️ Always destroy resources when not in use to avoid ongoing charges!**

### Step 11.1: Delete Kubernetes Resources

```bash
# Delete all Kubernetes resources
kubectl delete namespace crypto-oms

# Or delete individually
kubectl delete -f k8s/deployments/
kubectl delete -f k8s/services/
kubectl delete -f k8s/configmaps/
kubectl delete -f k8s/secrets/
```

---

### Step 11.2: Delete Docker Images from ECR

```bash
# Get AWS account and region
AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=$(aws configure get region)

# Delete images (optional - they don't cost much)
aws ecr batch-delete-image \
  --repository-name crypto-oms/order-ingestion \
  --image-ids imageTag=latest \
  --region $AWS_REGION

# Repeat for other services...
```

---

### Step 11.3: Destroy Infrastructure

```bash
cd terraform

# Review what will be destroyed
terraform plan -destroy

# Destroy all resources
terraform destroy

# Type "yes" when prompted
```

**This will take 10-20 minutes** to delete all resources.

---

### Step 11.4: Verify Cleanup

1. **Check AWS Console**:
   - EKS: No clusters
   - MSK: No clusters
   - EC2: No instances (except default)
   - ElastiCache: No clusters
   - DocumentDB: No clusters
   - VPC: No VPCs (or only default)

2. **Check Billing**:
   - Wait 24 hours
   - Check AWS Cost Explorer
   - Verify no charges

---

## 🛠️ Troubleshooting

### Issue: Terraform apply fails

**Common Causes**:
- Insufficient IAM permissions
- Service quotas exceeded
- Invalid configuration

**Solution**:
```bash
# Check Terraform logs
terraform apply -auto-approve 2>&1 | tee terraform.log

# Review errors in terraform.log
# Fix configuration and retry
```

---

### Issue: Pods not starting

**Symptoms**: Pods stuck in "Pending" or "CrashLoopBackOff"

**Solution**:
```bash
# Check pod events
kubectl describe pod <pod-name> -n crypto-oms

# Check pod logs
kubectl logs <pod-name> -n crypto-oms

# Check ConfigMap
kubectl get configmap app-config -n crypto-oms -o yaml

# Check Secrets
kubectl get secret app-secrets -n crypto-oms -o yaml
```

---

### Issue: Cannot connect to services

**Symptoms**: Health checks failing, connection refused

**Solution**:
1. Check security groups allow traffic
2. Check service endpoints: `kubectl get endpoints -n crypto-oms`
3. Test from pod: `kubectl exec -it <pod-name> -n crypto-oms -- curl http://order-ingestion/health`

---

### Issue: High costs

**Solution**:
1. Check Cost Explorer for cost drivers
2. Destroy infrastructure immediately: `terraform destroy`
3. Review cost optimization guide in [ARCHITECTURE.md](../docs/ARCHITECTURE.md)

---

## 📚 Next Steps

1. ✅ **Monitor System**: Set up CloudWatch alarms
2. ✅ **Add Monitoring**: Integrate Prometheus and Grafana
3. ✅ **Set Up CI/CD**: Automate deployments
4. ✅ **Add Authentication**: Implement OAuth2/JWT
5. ✅ **Production Hardening**: Add network policies, PDBs, etc.

---

## 📖 Related Documentation

- [Architecture Guide](../docs/ARCHITECTURE.md) - System architecture
- [Kubernetes README](../k8s/README.md) - Kubernetes deployment details
- [Service READMEs](../services/) - Service-specific documentation
- [Testing Guide](../docs/TESTING.md) - Testing and verification

---

**Congratulations! You've successfully deployed the Crypto OMS to AWS!** 🎉

*Remember to destroy resources when not in use to avoid ongoing charges!*
