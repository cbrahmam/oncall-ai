#!/bin/bash
# Quick Backend API Fix
# Most likely the backend isn't starting properly due to DB connection issues

set -e

echo "🔧 QUICK BACKEND FIX"
echo "==================="

NAMESPACE="offcall-ai"

echo "🔍 Step 1: Check what's actually wrong with backend"
echo "================================================="

BACKEND_POD=$(kubectl get pods -n $NAMESPACE -l app=offcall-ai-backend -o jsonpath='{.items[0].metadata.name}')
echo "Backend pod: $BACKEND_POD"

if [[ -n "$BACKEND_POD" ]]; then
    echo "🔍 Backend logs (last 50 lines):"
    kubectl logs -n $NAMESPACE $BACKEND_POD --tail=50
    
    echo ""
    echo "🔍 Testing backend directly:"
    kubectl exec -n $NAMESPACE $BACKEND_POD -- curl -f http://localhost:8000/health 2>/dev/null || echo "❌ Backend not responding on port 8000"
else
    echo "❌ No backend pod found"
    exit 1
fi

echo ""
echo "🔧 Step 2: Check if backend is actually running the right process"
echo "=============================================================="

echo "🔍 Processes running in backend pod:"
kubectl exec -n $NAMESPACE $BACKEND_POD -- ps aux

echo ""
echo "🔍 Network connections in backend pod:"
kubectl exec -n $NAMESPACE $BACKEND_POD -- netstat -tlnp || kubectl exec -n $NAMESPACE $BACKEND_POD -- ss -tlnp

echo ""
echo "🔧 Step 3: Try to restart backend manually"
echo "========================================"

echo "🔄 Restarting backend deployment..."
kubectl rollout restart deployment/offcall-ai-backend -n $NAMESPACE

echo "⏳ Waiting for backend to be ready..."
kubectl rollout status deployment/offcall-ai-backend -n $NAMESPACE --timeout=120s

echo "✅ Backend restarted, checking new pod..."
sleep 10

BACKEND_POD=$(kubectl get pods -n $NAMESPACE -l app=offcall-ai-backend -o jsonpath='{.items[0].metadata.name}')
echo "New backend pod: $BACKEND_POD"

echo "🔍 New backend logs:"
kubectl logs -n $NAMESPACE $BACKEND_POD --tail=20

echo ""
echo "🔍 Testing new backend:"
kubectl exec -n $NAMESPACE $BACKEND_POD -- curl -f http://localhost:8000/health || echo "❌ Still not working"

echo ""
echo "🔧 Step 4: Test the full chain"
echo "============================"

echo "🔍 Testing through service:"
kubectl run test-backend --image=curlimages/curl:latest --rm -i --restart=Never -n $NAMESPACE -- curl -f http://offcall-ai-backend-service:8000/health || echo "❌ Service not working"

echo ""
echo "🔍 Testing through public IP:"
curl -f http://20.57.101.193/health || echo "❌ Public access not working"

echo ""
echo "🔍 Testing API endpoint:"
curl -f http://20.57.101.193/api/v1/info || echo "❌ API endpoint not working"

echo ""
echo "🎯 NEXT STEPS:"
echo "============="
echo "If backend still not working, the issue is likely:"
echo "1. Database connection string format"
echo "2. Missing required environment variables"
echo "3. Backend code expecting different env var names"
echo "4. Port configuration mismatch"
echo ""
echo "Run the debug script first to see exact error messages!"