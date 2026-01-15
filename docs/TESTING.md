# 🧪 Testing Methodology - Crypto OMS AWS

## Overview

This document provides comprehensive testing methodology for verifying the Crypto Order Management System infrastructure, services, and operations. It covers infrastructure verification using Terraform, AWS Console verification, system diagnosis, performance testing, and end-to-end testing.

---

## 📋 Testing Categories

1. **Infrastructure Verification** - Verify Terraform deployment
2. **AWS Console Verification** - Verify resources in AWS Console
3. **System Diagnosis** - Troubleshoot and diagnose issues
4. **Connectivity Testing** - Test network connectivity
5. **Performance Testing** - Measure system performance
6. **End-to-End Testing** - Test complete order flow

---

## 1. Infrastructure Verification (Terraform)

### 1.1 Verify Terraform State

```bash
cd terraform

# List all resources in state
terraform state list

# Expected output should show 40-50 resources:
# module.vpc.aws_vpc.main
# module.vpc.aws_subnet.public[0]
# module.vpc.aws_subnet.public[1]
# module.eks.aws_eks_cluster.main
# module.msk.aws_msk_cluster.main
# ... etc
```

### 1.2 Verify Terraform Outputs

```bash
# Show all output values
terraform output

# Expected outputs:
# - eks_cluster_name
# - eks_cluster_endpoint
# - kafka_bootstrap_servers
# - redis_endpoint
# - documentdb_endpoint
# - alb_dns_name
# - s3_bucket_name
```

### 1.3 Verify Resource Details

```bash
# Show detailed state for specific resource
terraform state show module.eks.aws_eks_cluster.main

# Verify resource configuration
terraform show

# Check for any drift (changes outside Terraform)
terraform plan
```

**Expected Result**: `terraform plan` should show "No changes" if everything is in sync.

### 1.4 Validate Terraform Configuration

```bash
# Validate syntax
terraform validate

# Format code
terraform fmt

# Check for errors
terraform fmt -check
```

---

## 2. AWS Console Verification

### 2.1 Verify VPC and Networking

**AWS Console → VPC → Your VPCs**

**Check:**
- ✅ VPC exists with CIDR `10.0.0.0/16`
- ✅ Public subnets exist (2-3 subnets)
- ✅ Private subnets exist (2-3 subnets)
- ✅ Internet Gateway attached
- ✅ NAT Gateway exists (1 or 3)
- ✅ Security Groups exist (5 groups)

**Expected Resources:**
- 1 VPC
- 2-3 Public Subnets
- 2-3 Private Subnets
- 1 Internet Gateway
- 1-3 NAT Gateways
- 5 Security Groups (alb, eks, msk, redis, documentdb)

### 2.2 Verify EKS Cluster

**AWS Console → EKS → Clusters**

**Check:**
- ✅ Cluster name: `crypto-oms-{env}-eks`
- ✅ Status: `ACTIVE`
- ✅ Kubernetes version: `1.28`
- ✅ Endpoint accessible
- ✅ Node groups exist

**Verify Node Group:**
- ✅ Node group name exists
- ✅ Status: `ACTIVE`
- ✅ Instance type: `t3.small` (dev)
- ✅ Desired size matches configuration
- ✅ Nodes are healthy

**Commands:**
```bash
# List EKS clusters
aws eks list-clusters --region us-east-1

# Describe cluster
aws eks describe-cluster --name crypto-oms-dev-eks --region us-east-1

# List node groups
aws eks list-nodegroups --cluster-name crypto-oms-dev-eks --region us-east-1

# Get nodes via kubectl
kubectl get nodes
```

### 2.3 Verify MSK Cluster

**AWS Console → MSK → Clusters**

**Check:**
- ✅ Cluster name exists
- ✅ Status: `ACTIVE`
- ✅ Kafka version: `3.5.1`
- ✅ Number of brokers: 2 (dev) or 3+ (prod)
- ✅ Bootstrap servers accessible

**Commands:**
```bash
# List MSK clusters
aws kafka list-clusters --region us-east-1

# Describe cluster
aws kafka describe-cluster --cluster-arn <cluster-arn> --region us-east-1

# Get bootstrap brokers
aws kafka get-bootstrap-brokers --cluster-arn <cluster-arn> --region us-east-1
```

### 2.4 Verify ElastiCache Redis

**AWS Console → ElastiCache → Redis**

**Check:**
- ✅ Replication group exists
- ✅ Status: `available`
- ✅ Node type: `cache.t3.micro` (dev)
- ✅ Number of nodes: 1-5
- ✅ Endpoint accessible

**Commands:**
```bash
# List replication groups
aws elasticache describe-replication-groups --region us-east-1

# Get endpoint
aws elasticache describe-replication-groups \
  --replication-group-id crypto-oms-dev-redis \
  --region us-east-1 \
  --query 'ReplicationGroups[0].NodeGroups[0].PrimaryEndpoint'
```

### 2.5 Verify DocumentDB

**AWS Console → DocumentDB → Clusters**

**Check:**
- ✅ Cluster identifier exists
- ✅ Status: `available`
- ✅ Instance class: `db.t3.medium` (dev)
- ✅ Number of instances: 1-3
- ✅ Endpoint accessible

**Commands:**
```bash
# List DocumentDB clusters
aws docdb describe-db-clusters --region us-east-1

# Get cluster endpoint
aws docdb describe-db-clusters \
  --db-cluster-identifier crypto-oms-dev-docdb \
  --region us-east-1 \
  --query 'DBClusters[0].Endpoint'
```

### 2.6 Verify Application Load Balancer

**AWS Console → EC2 → Load Balancers**

**Check:**
- ✅ ALB exists
- ✅ Status: `active`
- ✅ Scheme: `internet-facing`
- ✅ Listeners configured (HTTP/HTTPS)
- ✅ Target groups exist
- ✅ Health checks passing

**Commands:**
```bash
# List load balancers
aws elbv2 describe-load-balancers --region us-east-1

# Get ALB DNS name
aws elbv2 describe-load-balancers \
  --region us-east-1 \
  --query 'LoadBalancers[?LoadBalancerName==`crypto-oms-dev-alb`].DNSName'
```

### 2.7 Verify S3 Bucket

**AWS Console → S3 → Buckets**

**Check:**
- ✅ Bucket name exists
- ✅ Static website hosting enabled
- ✅ Bucket policy configured
- ✅ CORS configuration set

**Commands:**
```bash
# List buckets
aws s3 ls

# Get bucket website endpoint
aws s3api get-bucket-website --bucket crypto-oms-dev-frontend
```

### 2.8 Verify KMS Keys

**AWS Console → KMS → Customer managed keys**

**Check:**
- ✅ 5 KMS keys exist:
  - EKS encryption key
  - MSK encryption key
  - Redis encryption key
  - DocumentDB encryption key
  - S3 encryption key
- ✅ Key rotation enabled

**Commands:**
```bash
# List KMS keys
aws kms list-keys --region us-east-1

# Describe key
aws kms describe-key --key-id <key-id> --region us-east-1
```

---

## 3. System Diagnosis

### 3.1 Network Connectivity Tests

**Test from EKS Pod to Services:**

```bash
# Get a pod in EKS
kubectl get pods -n crypto-oms

# Execute into pod
kubectl exec -it <pod-name> -n crypto-oms -- /bin/sh

# Test Redis connectivity
redis-cli -h <redis-endpoint> -p 6379 ping
# Expected: PONG

# Test DocumentDB connectivity
nc -zv <documentdb-endpoint> 27017
# Expected: Connection succeeded

# Test Kafka connectivity
telnet <kafka-broker-1> 9092
# Expected: Connected
```

**Test from Local Machine:**

```bash
# Test ALB endpoint
curl http://<alb-dns-name>/health
# Expected: {"status":"healthy"}

# Test EKS endpoint
curl -k https://<eks-endpoint>/healthz
# Expected: ok
```

### 3.2 Security Group Verification

**Verify Security Group Rules:**

```bash
# List security groups
aws ec2 describe-security-groups --region us-east-1

# Check ALB security group allows 80, 443 from internet
aws ec2 describe-security-groups \
  --group-ids <alb-sg-id> \
  --region us-east-1 \
  --query 'SecurityGroups[0].IpPermissions'

# Check EKS security group allows from ALB
aws ec2 describe-security-groups \
  --group-ids <eks-sg-id> \
  --region us-east-1 \
  --query 'SecurityGroups[0].IpPermissions'
```

### 3.3 CloudWatch Logs Verification

**Check Log Groups:**

```bash
# List log groups
aws logs describe-log-groups --region us-east-1

# Check EKS logs
aws logs tail /aws/eks/crypto-oms-dev-eks/cluster --follow --region us-east-1

# Check MSK logs
aws logs tail /aws/msk/crypto-oms-dev-msk/broker --follow --region us-east-1
```

**Expected Log Groups:**
- `/aws/eks/crypto-oms-dev-eks/cluster`
- `/aws/msk/crypto-oms-dev-msk/broker`
- Application-specific log groups

### 3.4 Resource Health Checks

**EKS Node Health:**

```bash
# Get node status
kubectl get nodes

# Describe node
kubectl describe node <node-name>

# Check node conditions
kubectl get nodes -o wide
```

**Pod Health:**

```bash
# List all pods
kubectl get pods --all-namespaces

# Check pod logs
kubectl logs <pod-name> -n <namespace>

# Describe pod
kubectl describe pod <pod-name> -n <namespace>
```

**Service Endpoints:**

```bash
# List services
kubectl get services --all-namespaces

# Get service endpoints
kubectl get endpoints <service-name> -n <namespace>
```

---

## 4. Connectivity Testing

### 4.1 Test Order Ingestion API

```bash
# Get ALB DNS name
ALB_DNS=$(terraform output -raw alb_dns_name)

# Test health endpoint
curl http://$ALB_DNS/health
# Expected: {"status":"healthy","timestamp":"..."}

# Test order placement
curl -X POST http://$ALB_DNS/api/orders \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: test-$(date +%s)" \
  -d '{
    "symbol": "BTC/USD",
    "side": "BUY",
    "quantity": 0.1,
    "price": 45000,
    "orderType": "LIMIT"
  }'
# Expected: {"orderId":"...","status":"ACCEPTED",...}
```

### 4.2 Test Redis Connection

```bash
# From EKS pod
redis-cli -h <redis-endpoint> -p 6379

# Test commands
PING
# Expected: PONG

SET test-key "test-value"
# Expected: OK

GET test-key
# Expected: "test-value"

DEL test-key
# Expected: 1
```

### 4.3 Test DocumentDB Connection

```bash
# From EKS pod (install mongo client first)
mongo --host <documentdb-endpoint>:27017 \
  --ssl \
  --sslCAFile=rds-ca-2019-root.pem \
  --username <username> \
  --password <password>

# Test connection
db.adminCommand('ping')
# Expected: { "ok" : 1 }
```

### 4.4 Test Kafka Connection

```bash
# From EKS pod (install kafka client tools)
kafka-console-producer.sh \
  --bootstrap-server <kafka-bootstrap-servers> \
  --topic orders \
  --property "key.separator=:" \
  --property "parse.key=true"

# Test message
order-123:{"orderId":"order-123","symbol":"BTC/USD"}

# Consume message
kafka-console-consumer.sh \
  --bootstrap-server <kafka-bootstrap-servers> \
  --topic orders \
  --from-beginning
```

---

## 5. Performance Testing

### 5.1 Load Testing Order Ingestion API

**Using Apache Bench (ab):**

```bash
# Install ab (Apache Bench)
# macOS: brew install apache-bench
# Linux: apt-get install apache2-utils

# Run load test (1000 requests, 10 concurrent)
ab -n 1000 -c 10 \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: test-$(date +%s)" \
  -p order.json \
  http://<alb-dns-name>/api/orders

# order.json content:
# {"symbol":"BTC/USD","side":"BUY","quantity":0.1,"price":45000,"orderType":"LIMIT"}
```

**Using wrk:**

```bash
# Install wrk
# macOS: brew install wrk

# Create test script
cat > test.lua <<EOF
wrk.method = "POST"
wrk.body = '{"symbol":"BTC/USD","side":"BUY","quantity":0.1,"price":45000,"orderType":"LIMIT"}'
wrk.headers["Content-Type"] = "application/json"
wrk.headers["X-Idempotency-Key"] = "test-" .. os.time()
EOF

# Run load test
wrk -t4 -c100 -d30s -s test.lua http://<alb-dns-name>/api/orders
```

**Expected Metrics:**
- Requests/second: 1000+
- P50 latency: < 50ms
- P95 latency: < 100ms
- P99 latency: < 200ms
- Error rate: < 0.1%

### 5.2 Latency Measurement

```bash
# Measure API latency
time curl -X POST http://<alb-dns-name>/api/orders \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: test-$(date +%s)" \
  -d '{"symbol":"BTC/USD","side":"BUY","quantity":0.1,"price":45000,"orderType":"LIMIT"}'

# Expected: real time < 0.2s
```

### 5.3 Resource Utilization

**Check CPU and Memory:**

```bash
# Node metrics
kubectl top nodes

# Pod metrics
kubectl top pods --all-namespaces

# Check CloudWatch metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/EKS \
  --metric-name CPUUtilization \
  --dimensions Name=ClusterName,Value=crypto-oms-dev-eks \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average
```

---

## 6. End-to-End Testing

### 6.1 Complete Order Flow Test

**Step 1: Place Order**
```bash
ORDER_RESPONSE=$(curl -X POST http://<alb-dns-name>/api/orders \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: e2e-test-$(date +%s)" \
  -d '{
    "symbol": "BTC/USD",
    "side": "BUY",
    "quantity": 0.1,
    "price": 45000,
    "orderType": "LIMIT"
  }')

ORDER_ID=$(echo $ORDER_RESPONSE | jq -r '.orderId')
echo "Order ID: $ORDER_ID"
```

**Step 2: Verify Order in Redis**
```bash
# Check idempotency key
redis-cli -h <redis-endpoint> GET "idempotency:e2e-test-..."
# Expected: Order JSON
```

**Step 3: Verify Order in Kafka**
```bash
# Consume from Kafka
kafka-console-consumer.sh \
  --bootstrap-server <kafka-bootstrap-servers> \
  --topic orders \
  --from-beginning \
  --max-messages 1
# Expected: Order event JSON
```

**Step 4: Verify Order in DocumentDB**
```bash
# Query DocumentDB
mongo --host <documentdb-endpoint>:27017 \
  --ssl \
  --sslCAFile=rds-ca-2019-root.pem \
  --username <username> \
  --password <password> \
  --eval 'db.orders.findOne({orderId: "$ORDER_ID"})'
# Expected: Order document
```

**Step 5: Verify Order Status**
```bash
# Check order status via API
curl http://<alb-dns-name>/api/orders/$ORDER_ID
# Expected: Order with status "ACCEPTED" or "FILLED"
```

### 6.2 Idempotency Test

```bash
# Place same order twice with same idempotency key
IDEMPOTENCY_KEY="idempotency-test-$(date +%s)"

# First request
RESPONSE1=$(curl -X POST http://<alb-dns-name>/api/orders \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: $IDEMPOTENCY_KEY" \
  -d '{"symbol":"BTC/USD","side":"BUY","quantity":0.1,"price":45000,"orderType":"LIMIT"}')

ORDER_ID1=$(echo $RESPONSE1 | jq -r '.orderId')

# Second request (should return same order)
RESPONSE2=$(curl -X POST http://<alb-dns-name>/api/orders \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: $IDEMPOTENCY_KEY" \
  -d '{"symbol":"BTC/USD","side":"BUY","quantity":0.1,"price":45000,"orderType":"LIMIT"}')

ORDER_ID2=$(echo $RESPONSE2 | jq -r '.orderId')

# Verify both responses have same order ID
if [ "$ORDER_ID1" == "$ORDER_ID2" ]; then
  echo "✅ Idempotency test PASSED"
else
  echo "❌ Idempotency test FAILED"
fi
```

---

## 7. Troubleshooting

### 7.1 Common Issues

**Issue: Terraform plan shows changes**
- **Cause**: Resources modified outside Terraform
- **Solution**: Review changes, import resources if needed, or apply changes

**Issue: EKS nodes not joining cluster**
- **Cause**: IAM roles not configured correctly
- **Solution**: Check node group IAM role, verify it has required permissions

**Issue: Cannot connect to Redis**
- **Cause**: Security group rules or network routing
- **Solution**: Verify security group allows traffic from EKS, check VPC routing

**Issue: Kafka connection timeout**
- **Cause**: Security group or broker configuration
- **Solution**: Verify security group allows ports 9092-9098, check broker endpoints

**Issue: DocumentDB connection refused**
- **Cause**: Security group or SSL certificate
- **Solution**: Verify security group allows port 27017, check SSL certificate

**Issue: ALB health checks failing**
- **Cause**: Target group configuration or pod health
- **Solution**: Check target group health check settings, verify pods are healthy

### 7.2 Debug Commands

```bash
# Check EKS cluster logs
aws logs tail /aws/eks/crypto-oms-dev-eks/cluster --follow

# Check pod events
kubectl get events --all-namespaces --sort-by='.lastTimestamp'

# Check service endpoints
kubectl get endpoints --all-namespaces

# Check ingress
kubectl get ingress --all-namespaces

# Check network policies
kubectl get networkpolicies --all-namespaces

# Test DNS resolution
nslookup <service-name>.<namespace>.svc.cluster.local
```

---

## 8. Verification Checklist

Use this checklist to verify your deployment:

### Infrastructure ✅
- [ ] Terraform state contains all resources
- [ ] No Terraform drift (plan shows no changes)
- [ ] All outputs accessible

### AWS Resources ✅
- [ ] VPC and subnets created
- [ ] EKS cluster active
- [ ] MSK cluster active
- [ ] Redis available
- [ ] DocumentDB available
- [ ] ALB active and healthy
- [ ] S3 bucket accessible
- [ ] KMS keys created

### Connectivity ✅
- [ ] Can connect to EKS cluster
- [ ] Can connect to Redis
- [ ] Can connect to DocumentDB
- [ ] Can connect to Kafka
- [ ] ALB endpoint accessible

### Services ✅
- [ ] Order Ingestion API responds to health checks
- [ ] Order Ingestion API can place orders
- [ ] Idempotency works correctly
- [ ] Orders appear in Kafka
- [ ] Orders persisted to DocumentDB

### Performance ✅
- [ ] API latency < 200ms (P99)
- [ ] Throughput > 1000 orders/second
- [ ] Resource utilization within limits

---

*Last Updated: January 2025*
