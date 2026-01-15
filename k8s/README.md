# Kubernetes Manifests - Crypto OMS AWS

This directory contains Kubernetes manifests for deploying all microservices to Amazon EKS.

## Directory Structure

```
k8s/
├── deployments/          # Deployment and HPA configurations
│   ├── order-ingestion-deployment.yaml
│   ├── order-ingestion-hpa.yaml
│   ├── order-processor-deployment.yaml
│   ├── risk-engine-deployment.yaml
│   ├── risk-engine-hpa.yaml
│   ├── market-data-deployment.yaml
│   └── market-data-hpa.yaml
├── services/             # Service definitions
│   ├── order-ingestion-service.yaml
│   ├── order-processor-service.yaml
│   ├── risk-engine-service.yaml
│   └── market-data-service.yaml
├── configmaps/           # Configuration maps
│   └── app-config.yaml
├── secrets/              # Secret definitions
│   └── app-secrets.yaml
└── README.md             # This file
```

## Prerequisites

1. **EKS Cluster Deployed**: Follow [Deployment Guide](../docs/DEPLOYMENT.md) to deploy infrastructure
2. **kubectl Configured**: `aws eks update-kubeconfig --name <cluster-name>`
3. **Docker Images Built and Pushed**: See service-specific READMEs for build instructions
4. **AWS Service Endpoints**: Get from Terraform outputs

## Quick Start

### Step 1: Get AWS Service Endpoints

```bash
cd terraform

# Get all required endpoints
REDIS_ENDPOINT=$(terraform output -raw redis_endpoint)
KAFKA_BOOTSTRAP=$(terraform output -raw kafka_bootstrap_servers)
DOCUMENTDB_ENDPOINT=$(terraform output -raw documentdb_endpoint)
EKS_CLUSTER=$(terraform output -raw eks_cluster_name)

# Configure kubectl
aws eks update-kubeconfig --name $EKS_CLUSTER --region us-east-1
```

### Step 2: Update ConfigMap

```bash
cd k8s/configmaps

# Edit app-config.yaml and replace placeholders:
# - REPLACE_WITH_REDIS_ENDPOINT → $REDIS_ENDPOINT
# - REPLACE_WITH_KAFKA_BOOTSTRAP_SERVERS → $KAFKA_BOOTSTRAP
# - REPLACE_WITH_DOCUMENTDB_ENDPOINT → $DOCUMENTDB_ENDPOINT
```

### Step 3: Update Secrets

```bash
cd k8s/secrets

# Edit app-secrets.yaml and replace placeholders:
# - REPLACE_WITH_DOCUMENTDB_USERNAME → actual username
# - REPLACE_WITH_DOCUMENTDB_PASSWORD → actual password
# 
# Note: In production, use AWS Secrets Manager or External Secrets Operator
```

### Step 4: Update Deployment Images

```bash
# Get AWS account ID
AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=$(aws configure get region)

# Update all deployment files:
# Replace <AWS_ACCOUNT_ID> with $AWS_ACCOUNT
# Replace <AWS_REGION> with $AWS_REGION

# Or use sed:
find k8s/deployments -name "*-deployment.yaml" -exec sed -i "s/<AWS_ACCOUNT_ID>/$AWS_ACCOUNT/g" {} \;
find k8s/deployments -name "*-deployment.yaml" -exec sed -i "s/<AWS_REGION>/$AWS_REGION/g" {} \;
```

### Step 5: Create Namespace

```bash
kubectl create namespace crypto-oms
```

### Step 6: Apply Manifests

```bash
cd k8s

# Apply in order:
kubectl apply -f configmaps/app-config.yaml
kubectl apply -f secrets/app-secrets.yaml
kubectl apply -f services/
kubectl apply -f deployments/
kubectl apply -f deployments/*-hpa.yaml
```

### Step 7: Verify Deployment

```bash
# Check all pods
kubectl get pods -n crypto-oms

# Check services
kubectl get svc -n crypto-oms

# Check deployments
kubectl get deployments -n crypto-oms

# Check HPAs
kubectl get hpa -n crypto-oms

# View pod logs
kubectl logs -n crypto-oms -l app=order-ingestion --tail=50
```

## Service Details

### Order Ingestion API

- **Replicas**: 3 (min), 10 (max via HPA)
- **Port**: 80
- **Health Checks**: `/health`, `/ready`
- **Resources**: 100m CPU, 256Mi memory (requests)

### Order Processor

- **Replicas**: 2 (fixed - background service)
- **Port**: N/A (background service)
- **Resources**: 200m CPU, 512Mi memory (requests)

### Risk Engine

- **Replicas**: 2 (min), 5 (max via HPA)
- **Port**: 80
- **Health Checks**: `/health`, `/ready`
- **Resources**: 100m CPU, 256Mi memory (requests)

### Market Data Service

- **Replicas**: 2 (min), 5 (max via HPA)
- **Port**: 80
- **Health Checks**: `/health`, `/ready`
- **WebSocket**: `/ws/market-data`
- **Resources**: 100m CPU, 256Mi memory (requests)

## Configuration

### ConfigMap (app-config.yaml)

Contains non-sensitive configuration:
- Redis endpoint
- Kafka bootstrap servers
- DocumentDB endpoint
- Service URLs for inter-service communication
- Environment variables

### Secrets (app-secrets.yaml)

Contains sensitive data:
- DocumentDB username and password
- Kafka credentials (if using SASL)
- Redis password (if using AUTH)

**⚠️ Security Note**: In production, use AWS Secrets Manager or External Secrets Operator instead of plain Kubernetes secrets.

## Horizontal Pod Autoscaling (HPA)

All API services have HPA configured:
- **Order Ingestion**: 3-10 replicas (CPU: 70%, Memory: 80%)
- **Risk Engine**: 2-5 replicas (CPU: 70%, Memory: 80%)
- **Market Data**: 2-5 replicas (CPU: 70%, Memory: 80%)

**Order Processor**: No HPA (fixed replicas - background service)

## Service Discovery

Services communicate using Kubernetes DNS:
- `order-ingestion.crypto-oms.svc.cluster.local`
- `risk-engine.crypto-oms.svc.cluster.local`
- `market-data.crypto-oms.svc.cluster.local`
- `order-processor.crypto-oms.svc.cluster.local`

## ALB Integration

To expose services via Application Load Balancer, configure Ingress or use AWS Load Balancer Controller:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: crypto-oms-ingress
  namespace: crypto-oms
  annotations:
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
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

## Troubleshooting

### Pods Not Starting

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

### Cannot Connect to Services

```bash
# Check service endpoints
kubectl get endpoints -n crypto-oms

# Test connectivity from pod
kubectl exec -it <pod-name> -n crypto-oms -- curl http://order-ingestion/health
```

### High Resource Usage

```bash
# Check resource usage
kubectl top pods -n crypto-oms

# Check HPA status
kubectl get hpa -n crypto-oms

# Describe HPA for details
kubectl describe hpa <hpa-name> -n crypto-oms
```

## Updating Deployments

### Update Image

```bash
# Set new image
kubectl set image deployment/order-ingestion \
  order-ingestion=<NEW_IMAGE_TAG> \
  -n crypto-oms

# Check rollout status
kubectl rollout status deployment/order-ingestion -n crypto-oms
```

### Rollback

```bash
# Rollback to previous version
kubectl rollout undo deployment/order-ingestion -n crypto-oms
```

## Cleanup

```bash
# Delete all resources
kubectl delete namespace crypto-oms

# Or delete individually
kubectl delete -f deployments/
kubectl delete -f services/
kubectl delete -f configmaps/
kubectl delete -f secrets/
```

## Production Considerations

1. **Secrets Management**: Use AWS Secrets Manager with External Secrets Operator
2. **Image Pull Secrets**: Configure ECR image pull secrets
3. **Network Policies**: Add network policies for pod-to-pod communication
4. **Pod Disruption Budgets**: Add PDBs for high availability
5. **Resource Quotas**: Set namespace resource quotas
6. **Monitoring**: Integrate with Prometheus and Grafana
7. **Logging**: Configure Fluent Bit for CloudWatch Logs
8. **Backup**: Configure backup strategies for persistent data

## Related Documentation

- [Deployment Guide](../docs/DEPLOYMENT.md) - AWS infrastructure deployment
- [Backend Architecture](../docs/BACKEND_ARCHITECTURE.md) - Service architecture details
- [How It Works](../docs/HOW_IT_WORKS.md) - System operation guide
