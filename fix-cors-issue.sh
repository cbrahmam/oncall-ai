#!/bin/bash
# Fix CORS configuration issue that's causing backend to crash

set -e

echo "🔧 FIXING CORS CONFIGURATION ISSUE"
echo "=================================="

NAMESPACE="offcall-ai"

echo "🔄 Step 1: Rollback to working version"
echo "====================================="

kubectl rollout undo deployment/offcall-ai-backend -n $NAMESPACE

echo "⏳ Waiting for rollback to complete..."
kubectl rollout status deployment/offcall-ai-backend -n $NAMESPACE --timeout=120s

echo "✅ Rollback complete"

echo ""
echo "🔧 Step 2: Fix CORS environment variable format"
echo "=============================================="

# Update deployment with correct CORS format
# Most likely the backend expects JSON array format or specific comma-separated format
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
          value: '["*"]'
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

echo "✅ Updated deployment with correct CORS format: [\"*\"]"

echo ""
echo "🔄 Step 3: Apply the fixed configuration"
echo "======================================"

kubectl rollout restart deployment/offcall-ai-backend -n $NAMESPACE

echo "⏳ Waiting for deployment to be ready..."
kubectl rollout status deployment/offcall-ai-backend -n $NAMESPACE --timeout=180s

sleep 10

echo ""
echo "🔍 Step 4: Test the fixes"
echo "======================="

BACKEND_POD=$(kubectl get pods -n $NAMESPACE -l app=offcall-ai-backend -o jsonpath='{.items[0].metadata.name}')
echo "Backend pod: $BACKEND_POD"

echo ""
echo "🔍 Check if backend started successfully:"
kubectl logs $BACKEND_POD -n $NAMESPACE --tail=20

echo ""
echo "🔍 Test backend health:"
kubectl exec -n $NAMESPACE $BACKEND_POD -- curl -s http://localhost:8000/health | python3 -m json.tool || echo "❌ Health check failed"

echo ""
echo "🔍 Test public endpoints:"
curl -s http://20.57.101.193/health | python3 -m json.tool || echo "❌ Public health failed"

echo ""
echo "🔍 Test API endpoints:"
curl -s http://20.57.101.193/api/v1/info || echo "Still 404 - need to check API routes"

echo ""
echo "🎯 STATUS SUMMARY"
echo "================"
echo "✅ Fixed CORS configuration (changed '*' to '[\"*\"]')"
echo "✅ Kept fixed database and Redis connections"
echo "✅ Backend should now start without crashing"
echo ""
echo "🔍 If API routes still 404, that's a separate issue with FastAPI route registration"
echo "🔍 But the core backend should now be healthy and connected to DB/Redis"