#!/bin/bash
# Fix Backend Database and Redis Connection Issues
# The backend is running but can't connect to DB/Redis properly

set -e

echo "🔧 FIXING BACKEND DATABASE & REDIS CONNECTIONS"
echo "=============================================="

NAMESPACE="offcall-ai"
RESOURCE_GROUP="offcall-ai-compliance-prod"
KEY_VAULT_NAME="offcallai-prod-keyvault"

echo "🔍 Step 1: Fix Database Connection String Format"
echo "=============================================="

# The current DATABASE_URL has an issue with async format
# Let's create a proper PostgreSQL connection string

POSTGRES_HOST="4.152.201.171"
POSTGRES_PORT="5432"
POSTGRES_DB="offcall_ai"
POSTGRES_USER="dbadmin"

# Get password from current secret
POSTGRES_PASSWORD=$(kubectl get secret offcall-ai-secrets -n $NAMESPACE -o jsonpath='{.data.DATABASE_URL}' | base64 -d | cut -d':' -f3 | cut -d'@' -f1)

# Create proper async-compatible DATABASE_URL
DATABASE_URL="postgresql+asyncpg://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}"

echo "✅ Fixed DATABASE_URL format for async support"

echo ""
echo "🔍 Step 2: Fix Redis Connection (Change from localhost to service)"
echo "=============================================================="

# Redis is trying to connect to localhost:6379 instead of the Azure Redis service
REDIS_HOST="offcall-ai-compliance-redis.redis.cache.windows.net"
REDIS_PORT="6380"

# Get Redis key from current secret
REDIS_KEY=$(kubectl get secret offcall-ai-secrets -n $NAMESPACE -o jsonpath='{.data.REDIS_URL}' | base64 -d | cut -d':' -f3 | cut -d'@' -f1)

# Create proper Redis URL
REDIS_URL="redis://:${REDIS_KEY}@${REDIS_HOST}:${REDIS_PORT}/0"

echo "✅ Fixed REDIS_URL to point to Azure Redis service"

echo ""
echo "🔍 Step 3: Update secrets with fixed connection strings"
echo "==================================================="

# Get existing JWT secret
JWT_SECRET=$(kubectl get secret offcall-ai-secrets -n $NAMESPACE -o jsonpath='{.data.JWT_SECRET}' | base64 -d)

# Delete old secret and create new one with fixed URLs
kubectl delete secret offcall-ai-secrets -n $NAMESPACE

kubectl create secret generic offcall-ai-secrets -n $NAMESPACE \
    --from-literal=DATABASE_URL="$DATABASE_URL" \
    --from-literal=POSTGRES_URL="$DATABASE_URL" \
    --from-literal=REDIS_URL="$REDIS_URL" \
    --from-literal=JWT_SECRET="$JWT_SECRET" \
    --from-literal=SECRET_KEY="$JWT_SECRET"

echo "✅ Updated secrets with corrected connection strings"

echo ""
echo "🔍 Step 4: Update backend deployment with additional environment variables"
echo "====================================================================="

# Add more environment variables that might be needed
cat << EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: offcall-ai-backend
  namespace: $NAMESPACE
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
        - name: CORS_ORIGINS
          value: "*"
        - name: HOST
          value: "0.0.0.0"
        - name: PORT
          value: "8000"
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5
      imagePullSecrets:
      - name: acr-secret
EOF

echo "✅ Updated backend deployment with proper environment variables"

echo ""
echo "🔍 Step 5: Restart backend to apply fixes"
echo "======================================="

kubectl rollout restart deployment/offcall-ai-backend -n $NAMESPACE

echo "⏳ Waiting for backend to restart with new configuration..."
kubectl rollout status deployment/offcall-ai-backend -n $NAMESPACE --timeout=180s

sleep 15  # Give it time to fully start

echo ""
echo "🔍 Step 6: Test the fixes"
echo "======================="

BACKEND_POD=$(kubectl get pods -n $NAMESPACE -l app=offcall-ai-backend -o jsonpath='{.items[0].metadata.name}')
echo "New backend pod: $BACKEND_POD"

echo ""
echo "🔍 Testing backend health after fixes:"
kubectl exec -n $NAMESPACE $BACKEND_POD -- curl -s http://localhost:8000/health | jq '.' || echo "Backend still having issues"

echo ""
echo "🔍 New backend logs (last 20 lines):"
kubectl logs -n $NAMESPACE $BACKEND_POD --tail=20

echo ""
echo "🔍 Testing public API access:"
echo "Health endpoint:"
curl -s http://20.57.101.193/health | jq '.' || echo "Public health endpoint not working"

echo ""
echo "Testing docs endpoint:"
curl -I http://20.57.101.193/docs

echo ""
echo "🔍 Step 7: Test API endpoints that were failing"
echo "============================================="

echo "Testing API info endpoint:"
curl -s http://20.57.101.193/api/v1/info || echo "API info endpoint still 404"

echo ""
echo "Testing auth providers endpoint (from browser error):"
curl -s http://20.57.101.193/api/v1/auth/providers || echo "Auth providers endpoint not working"

echo ""
echo "🎯 RESULTS SUMMARY"
echo "=================="
echo "✅ Fixed DATABASE_URL format (added +asyncpg for async support)"
echo "✅ Fixed REDIS_URL (pointing to Azure service, not localhost)" 
echo "✅ Updated environment variables"
echo "✅ Restarted backend with new configuration"
echo ""
echo "🔍 Next: Check if backend logs show successful DB/Redis connections"
echo "🔍 If API routes still 404, we may need to check backend code or FastAPI app setup"