#!/bin/bash
# Debug Backend Connection Issues
# Let's figure out why the frontend can't talk to the backend

set -e

echo "🔍 DEBUGGING BACKEND CONNECTION ISSUES"
echo "======================================"

NAMESPACE="offcall-ai"
PUBLIC_IP="20.57.101.193"

echo "📋 Step 1: Check all pod status and logs"
echo "======================================="

echo "🔍 Current pod status:"
kubectl get pods -n $NAMESPACE -o wide

echo ""
echo "🔍 Backend pod logs (last 20 lines):"
kubectl logs -l app=offcall-ai-backend -n $NAMESPACE --tail=20

echo ""
echo "🔍 Frontend pod logs (last 10 lines):"
kubectl logs -l app=offcall-ai-frontend -n $NAMESPACE --tail=10

echo ""
echo "🔍 Router pod logs (last 10 lines):"
kubectl logs -l app=offcall-ai-router -n $NAMESPACE --tail=10

echo ""
echo "📋 Step 2: Check services and endpoints"
echo "====================================="

echo "🔍 Services status:"
kubectl get services -n $NAMESPACE

echo ""
echo "🔍 Service endpoints:"
kubectl get endpoints -n $NAMESPACE

echo ""
echo "📋 Step 3: Test backend connectivity"
echo "=================================="

echo "🔍 Testing backend health directly on pod:"
BACKEND_POD=$(kubectl get pods -n $NAMESPACE -l app=offcall-ai-backend -o jsonpath='{.items[0].metadata.name}')
echo "Backend pod: $BACKEND_POD"

if [[ -n "$BACKEND_POD" ]]; then
    echo "Testing backend health check inside pod..."
    kubectl exec -n $NAMESPACE $BACKEND_POD -- curl -f http://localhost:8000/health || echo "❌ Backend health check failed inside pod"
    
    echo ""
    echo "Testing backend info endpoint inside pod..."
    kubectl exec -n $NAMESPACE $BACKEND_POD -- curl -f http://localhost:8000/api/v1/info || echo "❌ Backend info endpoint failed inside pod"
else
    echo "❌ No backend pod found"
fi

echo ""
echo "📋 Step 4: Test service connectivity"
echo "=================================="

echo "🔍 Testing backend service from within cluster:"
kubectl run test-pod --image=curlimages/curl:latest --rm -i --restart=Never -n $NAMESPACE -- curl -f http://offcall-ai-backend-service:8000/health || echo "❌ Backend service not reachable"

echo ""
echo "📋 Step 5: Test router configuration"
echo "=================================="

echo "🔍 Router nginx configuration:"
ROUTER_POD=$(kubectl get pods -n $NAMESPACE -l app=offcall-ai-router -o jsonpath='{.items[0].metadata.name}')
if [[ -n "$ROUTER_POD" ]]; then
    echo "Router pod: $ROUTER_POD"
    kubectl exec -n $NAMESPACE $ROUTER_POD -- cat /etc/nginx/nginx.conf || echo "❌ Could not read nginx config"
else
    echo "❌ No router pod found"
fi

echo ""
echo "📋 Step 6: Test external access through load balancer"
echo "=================================================="

echo "🔍 Testing public endpoints:"
echo "Frontend: http://$PUBLIC_IP/"
curl -I http://$PUBLIC_IP/ || echo "❌ Frontend not accessible via public IP"

echo ""
echo "Health check: http://$PUBLIC_IP/health"
curl -I http://$PUBLIC_IP/health || echo "❌ Health endpoint not accessible via public IP"

echo ""
echo "API info: http://$PUBLIC_IP/api/v1/info"
curl -I http://$PUBLIC_IP/api/v1/info || echo "❌ API endpoint not accessible via public IP"

echo ""
echo "📋 Step 7: Check environment variables in backend"
echo "=============================================="

if [[ -n "$BACKEND_POD" ]]; then
    echo "🔍 Backend environment variables:"
    kubectl exec -n $NAMESPACE $BACKEND_POD -- env | grep -E "(DATABASE|REDIS|JWT|SECRET)" || echo "❌ No database/redis env vars found"
else
    echo "❌ No backend pod to check environment variables"
fi

echo ""
echo "📋 Step 8: Check secrets"
echo "======================"

echo "🔍 Available secrets:"
kubectl get secrets -n $NAMESPACE

echo ""
echo "🔍 Secret contents (keys only):"
kubectl describe secret offcall-ai-secrets -n $NAMESPACE

echo ""
echo "🔧 DIAGNOSIS COMPLETE"
echo "==================="
echo ""
echo "📊 Summary will show issues found above"
echo "🔨 Run this script and share the output to identify the exact problem"