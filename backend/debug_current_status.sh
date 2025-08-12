#!/bin/bash

echo "🔍 DEBUGGING CURRENT DEPLOYMENT STATUS"
echo "====================================="

# Check what's actually running
echo "📋 Current pod status:"
kubectl get pods -n offcall-ai

echo ""
echo "🔧 Current deployment image:"
kubectl get deployment offcall-ai-backend -n offcall-ai -o jsonpath='{.spec.template.spec.containers[0].image}'
echo ""

echo ""
echo "🔐 Checking if monitoring credentials are in the pod:"
kubectl describe deployment offcall-ai-backend -n offcall-ai | grep -A 10 "Environment:"

echo ""
echo "📊 Testing current endpoints:"
echo "Health endpoint:"
curl -s https://offcallai.com/api/v1/webhooks/health | jq . || curl -s https://offcallai.com/api/v1/webhooks/health

echo ""
echo "Integration status:"
curl -s https://offcallai.com/api/v1/webhooks/integration-status | jq . || curl -s https://offcallai.com/api/v1/webhooks/integration-status

echo ""
echo "🧪 Testing if new monitoring endpoints exist:"
echo "Testing setup-self-monitoring:"
curl -s -X POST https://offcallai.com/api/v1/webhooks/setup-self-monitoring | head -c 200
echo ""

echo ""
echo "📝 Checking pod logs for any errors:"
kubectl logs -n offcall-ai deployment/offcall-ai-backend --tail=20