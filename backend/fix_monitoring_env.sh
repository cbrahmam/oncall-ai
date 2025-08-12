#!/bin/bash

echo "🔧 FIXING MONITORING ENVIRONMENT VARIABLES"
echo "=========================================="

# Create a patch to add monitoring environment variables to the existing deployment
cat > monitoring_env_patch.yaml << 'EOF'
spec:
  template:
    spec:
      containers:
      - name: backend
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: offcall-ai-secrets
              key: DATABASE_URL
        - name: POSTGRES_URL
          valueFrom:
            secretKeyRef:
              name: offcall-ai-secrets
              key: POSTGRES_URL
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: offcall-ai-secrets
              key: REDIS_URL
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: offcall-ai-secrets
              key: JWT_SECRET
        - name: SECRET_KEY
          valueFrom:
            secretKeyRef:
              name: offcall-ai-secrets
              key: SECRET_KEY
        - name: ENVIRONMENT
          value: production
        - name: DEBUG
          value: "false"
        - name: LOG_LEVEL
          value: info
        - name: HOST
          value: 0.0.0.0
        - name: PORT
          value: "8000"
        - name: DD_API_KEY
          valueFrom:
            secretKeyRef:
              name: monitoring-credentials
              key: DD_API_KEY
        - name: DD_APP_KEY
          valueFrom:
            secretKeyRef:
              name: monitoring-credentials
              key: DD_APP_KEY
        - name: NEW_RELIC_LICENSE_KEY
          valueFrom:
            secretKeyRef:
              name: monitoring-credentials
              key: NEW_RELIC_LICENSE_KEY
        - name: BASE_URL
          value: "https://offcallai.com"
EOF

echo "🔧 Applying environment variable patch..."

# Apply the patch
kubectl patch deployment offcall-ai-backend -n offcall-ai --patch-file monitoring_env_patch.yaml

if [ $? -eq 0 ]; then
    echo "✅ Environment variables patched successfully"
else
    echo "❌ Failed to patch environment variables"
    exit 1
fi

echo ""
echo "⏳ Waiting for deployment to restart with new environment variables..."

# Wait for the rollout to complete
kubectl rollout status deployment/offcall-ai-backend -n offcall-ai --timeout=300s

echo ""
echo "🧪 Testing the updated deployment..."

# Wait a moment for the pod to be ready
sleep 10

echo "Testing integration status:"
curl -s https://offcallai.com/api/v1/webhooks/integration-status | jq . || curl -s https://offcallai.com/api/v1/webhooks/integration-status

echo ""
echo "Testing health with monitoring info:"
curl -s https://offcallai.com/api/v1/webhooks/health | jq . || curl -s https://offcallai.com/api/v1/webhooks/health

echo ""
echo "🔍 Checking if environment variables are now present:"
kubectl describe deployment offcall-ai-backend -n offcall-ai | grep -A 20 "Environment:"

echo ""
echo "✅ MONITORING CREDENTIALS SHOULD NOW BE ACTIVE!"

# Cleanup
rm monitoring_env_patch.yaml