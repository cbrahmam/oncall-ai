#!/bin/bash
# Force clean restart of backend with fixed configuration

set -e

echo "🔧 FORCE CLEAN BACKEND RESTART"
echo "=============================="

NAMESPACE="offcall-ai"

echo "🧹 Step 1: Clean up all backend pods"
echo "=================================="

echo "🔍 Current backend pods:"
kubectl get pods -n $NAMESPACE -l app=offcall-ai-backend

echo ""
echo "🗑️ Force deleting all backend pods..."
kubectl delete pods -l app=offcall-ai-backend -n $NAMESPACE --force --grace-period=0

echo "⏳ Waiting for pods to be deleted..."
sleep 10

echo ""
echo "🔧 Step 2: Create a completely new deployment"
echo "==========================================="

# Delete the deployment and recreate with proper configuration
kubectl delete deployment offcall-ai-backend -n $NAMESPACE

# Create new deployment with fixed CORS and proper configuration
cat << EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: offcall-ai-backend
  namespace: $NAMESPACE
  labels:
    app: offcall-ai-backend
spec:
  replicas: 1
  selector:
    matchLabels:
      app: offcall-ai-backend
  template:
    metadata:
      labels:
        app: offcall-ai-backend
    spec:
      containers:
      - name: backend
        image: offcaiaicr80017.azurecr.io/offcall-ai-backend:v1.0.3
        ports:
        - containerPort: 8000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: offcall-ai-secrets
              key: DATABASE_URL
        - name: POSTGRES_URL
          valueFrom:
            secretKeyRef:
              name: offcall-ai-secrets
              key: POSTGRES_URL
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: offcall-ai-secrets
              key: REDIS_URL
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: offcall-ai-secrets
              key: JWT_SECRET
        - name: SECRET_KEY
          valueFrom:
            secretKeyRef:
              name: offcall-ai-secrets
              key: SECRET_KEY
        - name: ENVIRONMENT
          value: "production"
        - name: DEBUG
          value: "false"
        - name: LOG_LEVEL
          value: "info"
        - name: HOST
          value: "0.0.0.0"
        - name: PORT
          value: "8000"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 60
          periodSeconds: 30
          timeoutSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
      imagePullSecrets:
      - name: acr-secret
EOF

echo "✅ Created new backend deployment (without CORS_ORIGINS to avoid parsing issues)"

echo ""
echo "⏳ Step 3: Wait for new pod to start"
echo "=================================="

echo "Waiting for deployment to be ready..."
kubectl rollout status deployment/offcall-ai-backend -n $NAMESPACE --timeout=300s

sleep 20

echo ""
echo "🔍 Step 4: Check new pod status"
echo "============================"

kubectl get pods -n $NAMESPACE -l app=offcall-ai-backend

BACKEND_POD=$(kubectl get pods -n $NAMESPACE -l app=offcall-ai-backend -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")

if [[ -n "$BACKEND_POD" ]]; then
    echo "New backend pod: $BACKEND_POD"
    
    echo ""
    echo "🔍 Pod startup logs:"
    kubectl logs $BACKEND_POD -n $NAMESPACE --tail=30
    
    echo ""
    echo "🔍 Test backend health:"
    kubectl exec -n $NAMESPACE $BACKEND_POD -- curl -s http://localhost:8000/health || echo "❌ Health check failed"
    
    echo ""
    echo "🔍 Test public endpoints:"
    curl -s http://20.57.101.193/health || echo "❌ Public access failed"
    
else
    echo "❌ No backend pod found"
    echo "🔍 Check deployment status:"
    kubectl describe deployment offcall-ai-backend -n $NAMESPACE
fi

echo ""
echo "🎯 RESULTS"
echo "=========="
echo "✅ Removed problematic CORS_ORIGINS environment variable"
echo "✅ Added resource limits to prevent resource issues"
echo "✅ Increased probe timeouts for slower startup"
echo "✅ Kept fixed database and Redis connection strings"
echo ""
echo "🔍 If this works, we can add CORS configuration back in correct format later"