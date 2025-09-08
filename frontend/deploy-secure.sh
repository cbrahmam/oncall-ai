#!/bin/bash
# Secure deployment script

echo "🚀 DEPLOYING WITH SECURITY FIXES"

# Build frontend without source maps
cd frontend/oncall-frontend
GENERATE_SOURCEMAP=false npm run build

# Build backend with production settings
cd ../../backend
docker build -t offcallai/backend:secure-$(date +%Y%m%d_%H%M%S) . \
  --build-arg NODE_ENV=production \
  --build-arg DEBUG=false

# Deploy to Kubernetes with security
kubectl set env deployment/offcall-ai-backend \
  DEBUG=false \
  DOCS_ENABLED=false \
  -n offcall-ai

kubectl rollout restart deployment/offcall-ai-backend -n offcall-ai
kubectl rollout restart deployment/offcall-ai-frontend -n offcall-ai

echo "✅ Secure deployment complete"
