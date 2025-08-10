#!/bin/bash
# Debug what environment variables the backend pod actually has

set -e

echo "🔍 DEBUGGING BACKEND ENVIRONMENT VARIABLES"
echo "=========================================="

NAMESPACE="offcall-ai"

BACKEND_POD=$(kubectl get pods -n $NAMESPACE -l app=offcall-ai-backend -o jsonpath='{.items[0].metadata.name}')
echo "Backend pod: $BACKEND_POD"

echo ""
echo "🔍 Step 1: Check what environment variables the pod actually has"
echo "=============================================================="

echo "Database-related environment variables:"
kubectl exec -n $NAMESPACE $BACKEND_POD -- env | grep -E "(DATABASE|POSTGRES)" || echo "❌ No database env vars found"

echo ""
echo "Redis-related environment variables:"
kubectl exec -n $NAMESPACE $BACKEND_POD -- env | grep -E "(REDIS)" || echo "❌ No Redis env vars found"

echo ""
echo "🔍 Step 2: Check if pod is using the correct secret"
echo "================================================="

echo "Pod environment configuration:"
kubectl describe pod $BACKEND_POD -n $NAMESPACE | grep -A 20 "Environment:" || echo "❌ Could not find environment section"

echo ""
echo "🔍 Step 3: Check secret values that should be mounted"
echo "=================================================="

echo "Secret DATABASE_URL:"
kubectl get secret offcall-ai-secrets -n $NAMESPACE -o jsonpath='{.data.DATABASE_URL}' | base64 -d
echo ""

echo "Secret REDIS_URL:"
kubectl get secret offcall-ai-secrets -n $NAMESPACE -o jsonpath='{.data.REDIS_URL}' | base64 -d
echo ""

echo ""
echo "🔍 Step 4: Force pod to restart and pick up environment"
echo "===================================================="

echo "Delete pod to force fresh start with new environment:"
kubectl delete pod $BACKEND_POD -n $NAMESPACE

echo "⏳ Wait for new pod to start..."
sleep 30

NEW_BACKEND_POD=$(kubectl get pods -n $NAMESPACE -l app=offcall-ai-backend -o jsonpath='{.items[0].metadata.name}')
echo "New backend pod: $NEW_BACKEND_POD"

echo ""
echo "🔍 Check environment variables in new pod:"
kubectl exec -n $NAMESPACE $NEW_BACKEND_POD -- env | grep -E "(DATABASE|REDIS)" || echo "❌ Still no env vars"

echo ""
echo "🔍 Test health on new pod:"
kubectl exec -n $NAMESPACE $NEW_BACKEND_POD -- curl -s http://localhost:8000/health | python3 -m json.tool

echo ""
echo "🔍 Step 5: Alternative - check if backend code is hardcoded"
echo "========================================================"

echo "Let's see if the backend is using environment variables or hardcoded values:"
echo "Check backend logs for any connection attempts:"
kubectl logs $NEW_BACKEND_POD -n $NAMESPACE | grep -i -E "(database|redis|connect)" || echo "No connection logs found"

echo ""
echo "🔧 Step 6: Try alternative connection string formats"
echo "==================================================="

echo "Current secrets:"
kubectl get secret offcall-ai-secrets -n $NAMESPACE -o yaml | grep -E "(DATABASE_URL|REDIS_URL):" -A 1

echo ""
echo "🎯 DIAGNOSIS"
echo "============"
echo "If environment variables are not showing up in the pod:"
echo "  - Secret not properly mounted"
echo "  - Deployment not referencing correct secret"
echo "  - Pod not restarting to pick up changes"
echo ""
echo "If environment variables are correct but connections still fail:"
echo "  - Backend code might be using different env var names"
echo "  - Backend code might have hardcoded connection strings"
echo "  - Connection string format still wrong for the specific backend code"