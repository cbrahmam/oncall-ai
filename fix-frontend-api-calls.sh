#!/bin/bash
# Fix frontend API configuration to use correct backend URLs

set -e

echo "🔧 FIXING FRONTEND API CONFIGURATION"
echo "=================================="

NAMESPACE="offcall-ai"

echo "🔍 Step 1: Check current frontend configuration"
echo "============================================="

FRONTEND_POD=$(kubectl get pods -n $NAMESPACE -l app=offcall-ai-frontend -o jsonpath='{.items[0].metadata.name}')
echo "Frontend pod: $FRONTEND_POD"

echo ""
echo "🔍 Check what API URLs the frontend is trying to use:"
echo "The frontend is calling wrong URLs like 'api.offcall-ai.com' instead of current server"

echo ""
echo "🔧 Step 2: Test if backend APIs actually work via correct URLs"
echo "==========================================================="

echo "✅ Test OAuth providers via correct URL:"
curl -s http://20.57.101.193/api/v1/oauth/providers | python3 -m json.tool

echo ""
echo "🔧 Step 3: Frontend needs to be reconfigured"
echo "=========================================="

echo "The frontend is hardcoded to use wrong API endpoints."
echo "We need to either:"
echo "1. Update frontend environment variables"
echo "2. Rebuild frontend with correct API base URL"
echo "3. Check frontend configuration files"

echo ""
echo "🔍 Check frontend environment and config:"
kubectl exec -n $NAMESPACE $FRONTEND_POD -- env | grep -i api || echo "No API env vars in frontend"

echo ""
echo "🔍 Check if frontend has config files we can modify:"
kubectl exec -n $NAMESPACE $FRONTEND_POD -- ls -la /usr/share/nginx/html/ | head -10

echo ""
echo "🔍 Check for any config.js or env files:"
kubectl exec -n $NAMESPACE $FRONTEND_POD -- find /usr/share/nginx/html -name "*config*" -o -name "*env*" | head -10

echo ""
echo "🔧 Step 4: Quick fix - Update frontend deployment"
echo "=============================================="

echo "Let's add proper API base URL environment variable to frontend:"

cat << EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: offcall-ai-frontend
  namespace: $NAMESPACE
spec:
  replicas: 1
  selector:
    matchLabels:
      app: offcall-ai-frontend
  template:
    metadata:
      labels:
        app: offcall-ai-frontend
    spec:
      containers:
      - name: frontend
        image: offcaiaicr80017.azurecr.io/offcall-ai-frontend:v1.0.1
        ports:
        - containerPort: 80
        env:
        - name: REACT_APP_API_BASE_URL
          value: "http://20.57.101.193"
        - name: REACT_APP_API_URL
          value: "http://20.57.101.193/api/v1"
        - name: VITE_API_BASE_URL
          value: "http://20.57.101.193"
        - name: VITE_API_URL
          value: "http://20.57.101.193/api/v1"
        - name: API_BASE_URL
          value: "http://20.57.101.193"
        - name: API_URL
          value: "http://20.57.101.193/api/v1"
      imagePullSecrets:
      - name: acr-secret
EOF

echo "✅ Updated frontend deployment with API base URL environment variables"

echo ""
echo "🔄 Restart frontend to pick up new configuration"
echo "=============================================="

kubectl rollout restart deployment/offcall-ai-frontend -n $NAMESPACE

echo "⏳ Waiting for frontend restart..."
kubectl rollout status deployment/offcall-ai-frontend -n $NAMESPACE --timeout=120s

echo ""
echo "🔍 Step 5: Test the fix"
echo "===================="

sleep 10

echo "🔍 Check if frontend picked up environment variables:"
NEW_FRONTEND_POD=$(kubectl get pods -n $NAMESPACE -l app=offcall-ai-frontend -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n $NAMESPACE $NEW_FRONTEND_POD -- env | grep -i api

echo ""
echo "🌐 Test frontend access:"
curl -I http://20.57.101.193/ 2>/dev/null | head -1

echo ""
echo "🎯 RESULTS"
echo "=========="
echo "✅ Added API base URL environment variables to frontend"
echo "✅ Frontend should now use correct API endpoints"
echo ""
echo "🔍 If this doesn't work, the frontend code might be:"
echo "  1. Hardcoded to use wrong URLs"
echo "  2. Using different environment variable names"
echo "  3. Need to be rebuilt with correct configuration"
echo ""
echo "🌐 Test your frontend now at: http://20.57.101.193"
echo "The login page should now be able to communicate with backend!"