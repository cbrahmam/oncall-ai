# Step 1: Delete the failed ImagePullBackOff pod
kubectl delete pod offcall-ai-backend-559477b6cf-g7lbw -n offcall-ai

# Step 2: Build for the correct platform (Linux AMD64)
echo "🔧 Building Docker image for Linux/AMD64 platform..."
docker build --platform linux/amd64 -t offcaiaicr80017.azurecr.io/offcall-ai-backend:v2.0.4 .

# Step 3: Push the platform-specific image
echo "☁️ Pushing platform-specific image..."
docker push offcaiaicr80017.azurecr.io/offcall-ai-backend:v2.0.4

# Step 4: Update deployment with new platform-compatible image
echo "🎯 Updating Kubernetes deployment..."
kubectl set image deployment/offcall-ai-backend -n offcall-ai backend=offcaiaicr80017.azurecr.io/offcall-ai-backend:v2.0.4

# Step 5: Monitor the rollout
echo "⏳ Monitoring rollout..."
kubectl rollout status deployment/offcall-ai-backend -n offcall-ai --timeout=300s

# Step 6: Verify new pod is running
echo "📊 Checking pod status..."
kubectl get pods -n offcall-ai

# Step 7: Test webhooks once the new pod is ready
echo "🧪 Testing webhook endpoints..."
kubectl wait --for=condition=ready pod -l app=offcall-ai-backend -n offcall-ai --timeout=180s

echo "Testing webhook health endpoint..."
curl -X GET https://offcallai.com/api/v1/webhooks/health

echo ""
echo "Testing webhook test endpoint..."
curl -X POST https://offcallai.com/api/v1/webhooks/test \
  -H "Content-Type: application/json" \
  -H "X-Organization-Key: test-org" \
  -d '{"test": "webhook working with sendgrid", "timestamp": "'$(date -Iseconds)'"}'