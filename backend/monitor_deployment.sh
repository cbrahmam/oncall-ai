#!/bin/bash

echo "🔍 Monitoring Deployment Progress"
echo "================================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
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

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check current rollout status
print_step "Current Rollout Status"

echo "Deployment status:"
kubectl rollout status deployment/offcall-ai-backend -n offcall-ai --timeout=30s || echo "Still rolling out..."

echo ""
echo "Current pods:"
kubectl get pods -n offcall-ai -l app=offcall-ai-backend

# Wait a bit more and check again
print_step "Waiting for Pods to Stabilize"

echo "Waiting 30 seconds for pods to start..."
sleep 30

echo "Updated pod status:"
kubectl get pods -n offcall-ai -l app=offcall-ai-backend

# Check pod events and logs
print_step "Checking Pod Health"

echo "Recent pod events:"
kubectl get events -n offcall-ai --sort-by='.lastTimestamp' | tail -10

echo ""
echo "Pod logs (if available):"
LATEST_POD=$(kubectl get pods -n offcall-ai -l app=offcall-ai-backend -o jsonpath='{.items[0].metadata.name}')
echo "Latest pod: $LATEST_POD"

if [ ! -z "$LATEST_POD" ]; then
    kubectl logs $LATEST_POD -n offcall-ai --tail=20 || echo "Pod not ready for logs yet"
fi

# Check if deployment is complete
print_step "Deployment Completion Check"

# Try to wait for rollout completion with shorter timeout
kubectl rollout status deployment/offcall-ai-backend -n offcall-ai --timeout=60s

# Final status check
echo ""
echo "Final deployment status:"
kubectl get deployment offcall-ai-backend -n offcall-ai

echo ""
echo "Final pod status:"
kubectl get pods -n offcall-ai -l app=offcall-ai-backend -o wide

# Test readiness
print_step "Testing Pod Readiness"

# Check if any pods are running
RUNNING_PODS=$(kubectl get pods -n offcall-ai -l app=offcall-ai-backend --field-selector=status.phase=Running --no-headers | wc -l)
echo "Running pods: $RUNNING_PODS"

if [ "$RUNNING_PODS" -gt 0 ]; then
    print_success "At least one pod is running!"
    
    # Wait for readiness
    echo "Waiting for pod readiness..."
    kubectl wait --for=condition=ready pod -l app=offcall-ai-backend -n offcall-ai --timeout=60s || echo "Pod still not ready"
    
    # Test AI endpoints
    print_step "Testing AI Endpoints"
    
    echo "Waiting 15 seconds for service to be ready..."
    sleep 15
    
    echo ""
    echo "🧪 Testing AI Health:"
    curl -s -X GET "https://offcallai.com/api/v1/ai/health" -m 10 | jq '.' || echo "Health endpoint not responding yet"
    
    echo ""
    echo "🧪 Testing Demo Scenario:"
    curl -s -X POST "https://offcallai.com/api/v1/ai/demo-scenario" \
      -H "Content-Type: application/json" \
      -m 15 | jq '.demo_status, .processing_time' || echo "Demo endpoint not responding yet"
      
else
    print_warning "No running pods yet. Let's check what's happening..."
    
    # Get more details about failing pods
    echo ""
    echo "Pod details:"
    kubectl describe pods -n offcall-ai -l app=offcall-ai-backend | tail -20
    
    echo ""
    echo "Recent events:"
    kubectl get events -n offcall-ai --sort-by='.lastTimestamp' | grep backend | tail -5
fi

# Manual troubleshooting options
print_step "Manual Troubleshooting Options"

echo "If deployment is still not working, try these commands:"
echo ""
echo "1. Check detailed pod status:"
echo "   kubectl describe pods -n offcall-ai -l app=offcall-ai-backend"
echo ""
echo "2. Check pod logs:"
echo "   kubectl logs -n offcall-ai -l app=offcall-ai-backend --tail=50"
echo ""
echo "3. Force pod restart:"
echo "   kubectl delete pods -n offcall-ai -l app=offcall-ai-backend"
echo ""
echo "4. Check service connectivity:"
echo "   kubectl get services -n offcall-ai"
echo "   kubectl get ingress -n offcall-ai"
echo ""
echo "5. Manual test from inside cluster:"
echo "   kubectl run test-pod --image=curlimages/curl -it --rm -- sh"
echo "   # Then: curl http://offcall-ai-backend:8000/api/v1/ai/health"

# Quick diagnosis
print_step "Quick Diagnosis"

echo "Image being used:"
kubectl get deployment offcall-ai-backend -n offcall-ai -o jsonpath='{.spec.template.spec.containers[0].image}'

echo ""
echo ""
echo "Environment variables:"
kubectl get deployment offcall-ai-backend -n offcall-ai -o jsonpath='{.spec.template.spec.containers[0].env[*].name}' | tr ' ' '\n' | grep -E "(API_KEY|DATABASE)"

echo ""
echo ""
echo "Secret status:"
kubectl get secret ai-api-keys -n offcall-ai -o jsonpath='{.data}' | grep -o '[A-Z_]*' || echo "Secret might not be properly configured"

# Final status summary
print_step "Status Summary"

DEPLOYMENT_STATUS=$(kubectl get deployment offcall-ai-backend -n offcall-ai -o jsonpath='{.status.conditions[?(@.type=="Available")].status}')
READY_REPLICAS=$(kubectl get deployment offcall-ai-backend -n offcall-ai -o jsonpath='{.status.readyReplicas}')

echo "Deployment Available: $DEPLOYMENT_STATUS"
echo "Ready Replicas: ${READY_REPLICAS:-0}"

if [ "$DEPLOYMENT_STATUS" = "True" ] && [ "${READY_REPLICAS:-0}" -gt 0 ]; then
    print_success "🎉 Deployment appears successful! AI should be working."
elif [ "$DEPLOYMENT_STATUS" = "True" ]; then
    print_warning "Deployment marked as available but no ready replicas. Pods may still be starting."
else
    print_error "Deployment not yet successful. Check logs and troubleshoot."
fi

echo ""
echo "Next steps:"
echo "1. If successful: Test AI endpoints at https://offcallai.com/api/v1/ai/health"
echo "2. If issues: Check pod logs and events above"
echo "3. Continue with frontend integration for user demo interface"