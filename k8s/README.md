# Kubernetes Deployment Guide

This directory contains Kubernetes manifests and Helm charts for deploying the Airport Flight Data Collector to a Kubernetes cluster.

## Prerequisites

- Kubernetes cluster (1.24+)
- kubectl configured
- Helm 3.0+
- Container registry for images

## Quick Start

### 1. Using kubectl

```bash
# Create namespace
kubectl apply -f k8s/namespace.yaml

# Create secrets (replace with actual values)
kubectl create secret generic flight-data-secrets \
  --namespace=flight-data \
  --from-literal=jwt-secret=your-jwt-secret \
  --from-literal=api-key=your-api-key \
  --from-literal=db-password=your-db-password

# Apply configurations
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/storage/
kubectl apply -f k8s/deployments/
kubectl apply -f k8s/services/
kubectl apply -f k8s/ingress/
```

### 2. Using Helm

```bash
# Add required repositories
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

# Install the chart
helm install flight-collector ./helm/flight-collector \
  --namespace flight-data \
  --create-namespace \
  --values ./helm/flight-collector/values.yaml \
  --set secrets.jwt_secret=your-jwt-secret \
  --set secrets.api_key=your-api-key \
  --set postgresql.auth.password=secure-password \
  --set redis.auth.password=secure-password \
  --set grafana.adminPassword=secure-password
```

## Architecture

```
┌─────────────────┐
│   Ingress       │
│  (NGINX/ALB)    │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼──┐  ┌──▼────┐
│ API  │  │ Dash  │
│ Pods │  │ Pods  │
└───┬──┘  └───────┘
    │
┌───▼────────────┐
│  Redis/PostgreSQL │
│   StatefulSet   │
└─────────────────┘
```

## Components

### Core Services

1. **API Service** (3 replicas)
   - REST API endpoints
   - GraphQL server
   - WebSocket connections
   - Metrics endpoint

2. **Dashboard** (2 replicas)
   - Next.js web application
   - Real-time monitoring
   - Analytics interface

3. **Collector** (CronJob)
   - Hourly data collection
   - Multi-airport support

### Supporting Services

1. **Redis**
   - Session management
   - Caching
   - Rate limiting

2. **PostgreSQL**
   - Primary data storage
   - Analytics data

3. **Prometheus**
   - Metrics collection
   - Alerting

4. **Grafana**
   - Visualization
   - Dashboards

## Configuration

### Environment Variables

Edit `k8s/configmap.yaml` or `helm/flight-collector/values.yaml`:

```yaml
env:
  NODE_ENV: production
  DATABASE_TYPE: postgresql
  LOG_LEVEL: info
  ENABLE_METRICS: true
```

### Resource Limits

Adjust in `values.yaml`:

```yaml
resources:
  api:
    requests:
      memory: "256Mi"
      cpu: "250m"
    limits:
      memory: "512Mi"
      cpu: "500m"
```

### Autoscaling

Configure HPA in `values.yaml`:

```yaml
autoscaling:
  api:
    enabled: true
    minReplicas: 2
    maxReplicas: 10
    targetCPUUtilizationPercentage: 80
```

## Storage

### Persistent Volumes

```yaml
persistence:
  enabled: true
  storageClass: "standard"
  size: 10Gi
```

### Backup Strategy

```bash
# Backup database
kubectl exec -n flight-data postgresql-0 -- \
  pg_dump -U flightuser flightdata > backup.sql

# Backup persistent data
kubectl cp flight-data/api-pod:/app/data ./backup-data
```

## Monitoring

### Access Grafana

```bash
# Port forward
kubectl port-forward -n flight-data svc/grafana 3000:80

# Access at http://localhost:3000
# Default: admin/admin
```

### Access Prometheus

```bash
kubectl port-forward -n flight-data svc/prometheus-server 9090:80
```

## Scaling

### Manual Scaling

```bash
# Scale API
kubectl scale deployment api-deployment --replicas=5 -n flight-data

# Scale Dashboard
kubectl scale deployment dashboard-deployment --replicas=3 -n flight-data
```

### Horizontal Pod Autoscaler

```bash
# Check HPA status
kubectl get hpa -n flight-data

# Edit HPA
kubectl edit hpa api-hpa -n flight-data
```

## Troubleshooting

### Check Pod Status

```bash
kubectl get pods -n flight-data
kubectl describe pod <pod-name> -n flight-data
kubectl logs <pod-name> -n flight-data
```

### Common Issues

1. **ImagePullBackOff**
   - Check image name and tag
   - Verify registry credentials

2. **CrashLoopBackOff**
   - Check logs: `kubectl logs <pod> -n flight-data`
   - Verify environment variables
   - Check database connectivity

3. **Pending Pods**
   - Check PVC status: `kubectl get pvc -n flight-data`
   - Verify node resources: `kubectl top nodes`

4. **Service Unavailable**
   - Check service endpoints: `kubectl get endpoints -n flight-data`
   - Verify ingress configuration

### Debug Commands

```bash
# Get events
kubectl get events -n flight-data --sort-by='.lastTimestamp'

# Exec into pod
kubectl exec -it <pod-name> -n flight-data -- /bin/sh

# Check resource usage
kubectl top pods -n flight-data

# Describe resources
kubectl describe deployment api-deployment -n flight-data
kubectl describe service api-service -n flight-data
kubectl describe ingress flight-ingress -n flight-data
```

## Security

### Network Policies

```yaml
# Apply network policies
kubectl apply -f k8s/network-policies/
```

### RBAC

```yaml
# Create service account with limited permissions
kubectl apply -f k8s/rbac/
```

### Secrets Management

```bash
# Using Sealed Secrets
kubeseal --format yaml < secret.yaml > sealed-secret.yaml

# Using External Secrets Operator
kubectl apply -f k8s/external-secrets/
```

## Production Checklist

- [ ] Configure resource limits
- [ ] Enable autoscaling
- [ ] Set up monitoring and alerting
- [ ] Configure backups
- [ ] Enable network policies
- [ ] Set up RBAC
- [ ] Configure TLS/SSL
- [ ] Set up ingress with rate limiting
- [ ] Enable pod disruption budgets
- [ ] Configure liveness/readiness probes
- [ ] Set up log aggregation
- [ ] Plan disaster recovery

## Upgrading

### Using Helm

```bash
# Update values
vim helm/flight-collector/values.yaml

# Upgrade release
helm upgrade flight-collector ./helm/flight-collector \
  --namespace flight-data \
  --values ./helm/flight-collector/values-prod.yaml

# Rollback if needed
helm rollback flight-collector 1 --namespace flight-data
```

### Using kubectl

```bash
# Apply new manifests
kubectl apply -f k8s/deployments/

# Watch rollout
kubectl rollout status deployment/api-deployment -n flight-data

# Rollback if needed
kubectl rollout undo deployment/api-deployment -n flight-data
```

## Uninstall

### Using Helm

```bash
helm uninstall flight-collector --namespace flight-data
kubectl delete namespace flight-data
```

### Using kubectl

```bash
kubectl delete -f k8s/
kubectl delete namespace flight-data
```

## Support

For issues and questions:
- Check logs: `kubectl logs -f <pod> -n flight-data`
- Review events: `kubectl get events -n flight-data`
- Open issue: https://github.com/czhaoca/airport-flight-data-collector/issues