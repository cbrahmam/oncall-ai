#!/bin/bash

echo "🔧 Fixing Deployment and Testing AI"
echo "==================================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_step() {
    echo -e "\n${BLUE}>>> $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Step 1: Check current deployment details
print_step "STEP 1: Inspect Current Deployment"

echo "Current deployment details:"
kubectl get deployment offcall-ai-backend -n offcall-ai -o yaml | grep -E "image:|name:" | head -10

echo ""
echo "Current pod status:"
kubectl get pods -n offcall-ai -l app=offcall-ai-backend

echo ""
echo "Pod description (checking container names):"
kubectl describe deployment offcall-ai-backend -n offcall-ai | grep -A 5 -B 5 "Containers:"

# Step 2: Find the correct container name
print_step "STEP 2: Find Container Name"

CONTAINER_NAME=$(kubectl get deployment offcall-ai-backend -n offcall-ai -o jsonpath='{.spec.template.spec.containers[0].name}')
echo "Container name in deployment: $CONTAINER_NAME"

# Step 3: Update deployment with correct container name
print_step "STEP 3: Update Deployment with New Image"

NEW_IMAGE="offcaiaicr80017.azurecr.io/offcallai/backend:realai-20250904_221909"

# Use the correct container name we found
kubectl set image deployment/offcall-ai-backend $CONTAINER_NAME=$NEW_IMAGE -n offcall-ai

print_success "Deployment updated with container name: $CONTAINER_NAME"

# Step 4: Check rollout status
print_step "STEP 4: Wait for Rollout"

echo "Checking rollout status..."
kubectl rollout status deployment/offcall-ai-backend -n offcall-ai --timeout=180s

# Step 5: Restart any stuck pods
print_step "STEP 5: Clean Up Any Stuck Pods"

echo "Current pod status:"
kubectl get pods -n offcall-ai

# Delete any crashlooping pods to force recreation
echo ""
echo "Cleaning up crashlooping pods..."
kubectl delete pods -n offcall-ai -l app=offcall-ai-backend --field-selector=status.phase!=Running

# Wait a bit for new pods
echo "Waiting for new pods to start..."
sleep 30

echo "New pod status:"
kubectl get pods -n offcall-ai

# Step 6: Check if pods are ready
print_step "STEP 6: Verify Pod Health"

echo "Waiting for pods to be ready..."
kubectl wait --for=condition=ready pod -l app=offcall-ai-backend -n offcall-ai --timeout=120s || echo "Pod still starting..."

echo ""
echo "Final pod status:"
kubectl get pods -n offcall-ai -l app=offcall-ai-backend

# Step 7: Check pod logs for any issues
print_step "STEP 7: Check Pod Logs"

echo "Recent pod logs:"
kubectl logs -n offcall-ai -l app=offcall-ai-backend --tail=20 --since=2m || echo "No logs yet..."

# Step 8: Test the AI endpoints
print_step "STEP 8: Test AI Endpoints"

echo "Testing AI health endpoint..."
sleep 10

curl -s -X GET "https://offcallai.com/api/v1/ai/health" | jq '.' || echo "Health endpoint not ready yet"

echo ""
echo "Testing demo scenario..."
curl -s -X POST "https://offcallai.com/api/v1/ai/demo-scenario" \
  -H "Content-Type: application/json" | jq '.' || echo "Demo endpoint not ready yet"

# Step 9: Debug if needed
print_step "STEP 9: Debug Information"

echo "Service endpoints:"
kubectl get services -n offcall-ai

echo ""
echo "Ingress status:"
kubectl get ingress -n offcall-ai

echo ""
echo "ConfigMap and Secrets:"
kubectl get configmap,secret -n offcall-ai | grep -E "(ai-|config)"

# Step 10: Alternative deployment approach if needed
print_step "STEP 10: Alternative Fix (if needed)"

echo "If the above didn't work, let's try a direct deployment update..."

# Create a patch to update the deployment
cat > deployment_patch.yaml << EOF
spec:
  template:
    spec:
      containers:
      - name: $CONTAINER_NAME
        image: $NEW_IMAGE
        env:
        - name: ANTHROPIC_API_KEY
          valueFrom:
            secretKeyRef:
              name: ai-api-keys
              key: ANTHROPIC_API_KEY
        - name: GEMINI_API_KEY
          valueFrom:
            secretKeyRef:
              name: ai-api-keys
              key: GEMINI_API_KEY
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: ai-api-keys
              key: OPENAI_API_KEY
              optional: true
EOF

echo "Applying deployment patch..."
kubectl patch deployment offcall-ai-backend -n offcall-ai --patch-file=deployment_patch.yaml

print_success "Deployment patch applied"

# Wait for final rollout
echo "Waiting for final rollout..."
kubectl rollout status deployment/offcall-ai-backend -n offcall-ai --timeout=180s

echo ""
print_success "🎉 Deployment Fix Complete!"

# Final test
print_step "FINAL TEST"

echo "Final pod status:"
kubectl get pods -n offcall-ai -l app=offcall-ai-backend

echo ""
echo "Testing AI integration one more time:"
sleep 15

echo "🧪 Health Check:"
curl -s -X GET "https://offcallai.com/api/v1/ai/health" | jq '.'

echo ""
echo "🧪 Demo Scenario:"  
curl -s -X POST "https://offcallai.com/api/v1/ai/demo-scenario" -H "Content-Type: application/json" | jq '.demo_status, .processing_time, .demo_metrics'

echo ""
print_success "✅ Real AI Integration Status Check Complete!"
echo ""
echo "If you see 'healthy' status and demo results above, your AI is working!"
echo "If not, let's debug further by checking the pod logs:"
echo ""
echo "Debug commands:"
echo "  kubectl logs -n offcall-ai -l app=offcall-ai-backend --tail=50"
echo "  kubectl describe pod -n offcall-ai -l app=offcall-ai-backend"