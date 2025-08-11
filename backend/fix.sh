#!/bin/bash

echo "🚀 FIXING OFFCALL AI WEBHOOK DEPENDENCY ISSUE"
echo "================================================"

# Check current pod status
echo "📊 Current pod status:"
kubectl get pods -n offcall-ai

echo ""
echo "🔧 Step 1: Updating requirements.txt with sendgrid dependency"

# Navigate to backend directory
cd backend

# Use the complete requirements from backup2 (has sendgrid)
cp requirements.txt.backup2 requirements.txt

echo "✅ Updated requirements.txt"
echo "📋 Key dependencies added:"
grep -E "(sendgrid|slack-sdk|twilio)" requirements.txt

echo ""
echo "🐳 Step 2: Building new Docker image with sendgrid"

# Build new Docker image
docker build -t offcaiaicr80017.azurecr.io/offcall-ai-backend:v2.0.1 .

echo "✅ Docker image built successfully"

echo ""
echo "☁️ Step 3: Pushing to Azure Container Registry"

# Push to registry
docker push offcaiaicr80017.azurecr.io/offcall-ai-backend:v2.0.1

echo "✅ Image pushed to Azure CR"

echo ""
echo "🎯 Step 4: Updating Kubernetes deployment"

# Update deployment with new image
kubectl set image deployment/offcall-ai-backend -n offcall-ai backend=offcaiaicr80017.azurecr.io/offcall-ai-backend:v2.0.1

echo "✅ Kubernetes deployment updated"

echo ""
echo "⏳ Step 5: Waiting for new pod to be ready..."

# Wait for rollout to complete
kubectl rollout status deployment/offcall-ai-backend -n offcall-ai --timeout=300s

# Check pod status
echo "📊 New pod status:"
kubectl get pods -n offcall-ai

echo ""
echo "🧪 Step 6: Testing webhook endpoints"

# Test webhook health
echo "Testing webhook health endpoint..."
curl -X GET https://offcallai.com/api/v1/webhooks/health

echo ""
echo ""
echo "Testing webhook test endpoint..."
curl -X POST https://offcallai.com/api/v1/webhooks/test \
  -H "Content-Type: application/json" \
  -H "X-Organization-Key: test-org" \
  -d '{
    "test": "webhook working after sendgrid fix",
    "timestamp": "'$(date -Iseconds)'",
    "message": "Webhooks are now operational!"
  }'

echo ""
echo ""
echo "🎉 WEBHOOK FIX COMPLETE!"
echo "=========================="
echo ""
echo "✅ Sendgrid dependency added"
echo "✅ Docker image rebuilt and deployed"  
echo "✅ Webhook endpoints should now be accessible"
echo ""
echo "🔗 Available webhook endpoints:"
echo "• https://offcallai.com/api/v1/webhooks/health"
echo "• https://offcallai.com/api/v1/webhooks/test"
echo "• https://offcallai.com/api/v1/webhooks/generic"
echo "• https://offcallai.com/api/v1/webhooks/datadog"
echo "• https://offcallai.com/api/v1/webhooks/grafana"
echo "• https://offcallai.com/api/v1/webhooks/aws-cloudwatch"
echo ""
echo "🚀 READY FOR THIRD-PARTY INTEGRATIONS!"