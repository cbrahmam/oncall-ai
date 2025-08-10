#!/bin/bash
# Diagnose why backend rollout failed

set -e

echo "🔍 DIAGNOSING BACKEND ROLLOUT ISSUE"
echo "=================================="

NAMESPACE="offcall-ai"

echo "📋 Step 1: Check all backend pods status"
echo "======================================="

echo "🔍 All pods in namespace:"
kubectl get pods -n $NAMESPACE

echo ""
echo "🔍 Backend-specific pods:"
kubectl get pods -n $NAMESPACE -l app=offcall-ai-backend -o wide

echo ""
echo "📋 Step 2: Check deployment status"
echo "================================="

kubectl describe deployment offcall-ai-backend -n $NAMESPACE

echo ""
echo "📋 Step 3: Check if new pod is failing to start"
echo "=============================================="

# Get the newest backend pod (might be failing)
NEWEST_POD=$(kubectl get pods -n $NAMESPACE -l app=offcall-ai-backend --sort-by=.metadata.creationTimestamp -o jsonpath='{.items[-1].metadata.name}' 2>/dev/null || echo "")

if [[ -n "$NEWEST_POD" ]]; then
    echo "Newest backend pod: $NEWEST_POD"
    
    echo ""
    echo "🔍 Pod status and events:"
    kubectl describe pod $NEWEST_POD -n $NAMESPACE
    
    echo ""
    echo "🔍 Pod logs (if available):"
    kubectl logs $NEWEST_POD -n $NAMESPACE --tail=50 || echo "❌ No logs available yet"
else
    echo "❌ No backend pods found"
fi

echo ""
echo "📋 Step 4: Check secrets are correctly configured"
echo "=============================================="

echo "🔍 Current secrets:"
kubectl get secret offcall-ai-secrets -n $NAMESPACE -o yaml

echo ""
echo "📋 Step 5: Manual rollback if needed"
echo "=================================="

echo "🔄 If the new pod is stuck, we can rollback to previous version:"
echo "kubectl rollout undo deployment/offcall-ai-backend -n $NAMESPACE"
echo ""
echo "🔄 Or force recreate pods:"
echo "kubectl delete pods -l app=offcall-ai-backend -n $NAMESPACE"
echo ""
echo "🔍 Check rollout history:"
kubectl rollout history deployment/offcall-ai-backend -n $NAMESPACE

echo ""
echo "🎯 QUICK ACTIONS:"
echo "================"
echo "1. If pod is stuck in 'Pending' - resource issue"
echo "2. If pod is stuck in 'CrashLoopBackOff' - app startup issue"  
echo "3. If pod is 'ImagePullBackOff' - image issue"
echo "4. If pod is 'Running' but deployment stuck - readiness probe issue"
echo ""
echo "Run: kubectl get pods -n offcall-ai -l app=offcall-ai-backend"
echo "Then: kubectl describe pod [POD_NAME] -n offcall-ai"