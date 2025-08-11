#!/bin/bash
# Debug and fix the router crash issue

set -e

echo "🔍 DEBUGGING ROUTER CRASH"
echo "========================="

NAMESPACE="offcall-ai"

echo "📋 Step 1: Check what's wrong with the router"
echo "============================================="

echo "🔍 Current pod status:"
kubectl get pods -n $NAMESPACE

echo ""
echo "🔍 Check logs of the crashed router pod:"
CRASHED_POD=$(kubectl get pods -n $NAMESPACE -l app=offcall-ai-router --field-selector=status.phase!=Running -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")

if [[ -n "$CRASHED_POD" ]]; then
    echo "Crashed pod: $CRASHED_POD"
    echo "Logs:"
    kubectl logs $CRASHED_POD -n $NAMESPACE || echo "Could not get logs"
else
    echo "No crashed pod found, checking all router pods:"
    kubectl logs -l app=offcall-ai-router -n $NAMESPACE --tail=20
fi

echo ""
echo "🔧 Step 2: Delete crashed pods and revert to working router"
echo "=========================================================="

echo "🗑️ Cleaning up crashed router pods..."
kubectl delete pods -l app=offcall-ai-router -n $NAMESPACE --force --grace-period=0

echo ""
echo "🔄 Step 3: Revert to simple working router configuration"
echo "====================================================="

# Create a simpler, working nginx configuration
cat << 'EOF' | kubectl create configmap offcall-ai-simple-router-config -n $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: offcall-ai-simple-router-config
  namespace: offcall-ai
data:
  nginx.conf: |
    events {
        worker_connections 1024;
    }
    http {
        upstream backend {
            server offcall-ai-backend-service:8000;
        }
        upstream frontend {
            server offcall-ai-frontend-service:80;
        }
        
        server {
            listen 80;
            server_name _;
            
            # CORS headers
            location / {
                # Handle OPTIONS requests for CORS
                if ($request_method = 'OPTIONS') {
                    add_header 'Access-Control-Allow-Origin' '*';
                    add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, PATCH, OPTIONS';
                    add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type, Accept, X-Requested-With';
                    add_header 'Access-Control-Max-Age' 86400;
                    return 204;
                }
                
                # Route based on path
                proxy_pass http://frontend;
                proxy_set_header Host $host;
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                proxy_set_header X-Forwarded-Proto $scheme;
                
                # Add CORS headers to all responses
                add_header 'Access-Control-Allow-Origin' '*' always;
                add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, PATCH, OPTIONS' always;
                add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type, Accept, X-Requested-With' always;
            }
            
            # API routes go to backend
            location /api/ {
                proxy_pass http://backend;
                proxy_set_header Host $host;
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                proxy_set_header X-Forwarded-Proto $scheme;
                
                # CORS headers for API
                add_header 'Access-Control-Allow-Origin' '*' always;
                add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, PATCH, OPTIONS' always;
                add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type, Accept, X-Requested-With' always;
            }
            
            # Health and docs
            location /health {
                proxy_pass http://backend;
                proxy_set_header Host $host;
            }
            
            location /docs {
                proxy_pass http://backend;
                proxy_set_header Host $host;
            }
        }
    }
EOF

echo "✅ Created simple working router configuration"

echo ""
echo "🔄 Step 4: Update router deployment to use working config"
echo "======================================================="

cat << EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: offcall-ai-router
  namespace: $NAMESPACE
spec:
  replicas: 1
  selector:
    matchLabels:
      app: offcall-ai-router
  template:
    metadata:
      labels:
        app: offcall-ai-router
    spec:
      containers:
      - name: router
        image: nginx:alpine
        ports:
        - containerPort: 80
        volumeMounts:
        - name: nginx-config
          mountPath: /etc/nginx/nginx.conf
          subPath: nginx.conf
      volumes:
      - name: nginx-config
        configMap:
          name: offcall-ai-simple-router-config
      imagePullSecrets:
      - name: acr-secret
EOF

echo "✅ Updated router deployment with simple working config"

echo ""
echo "⏳ Step 5: Wait for router to become healthy"
echo "=========================================="

echo "Waiting for router to be ready..."
kubectl rollout status deployment/offcall-ai-router -n $NAMESPACE --timeout=180s

echo ""
echo "⏳ Giving router time to stabilize..."
sleep 10

echo ""
echo "🔍 Step 6: Test the working router"
echo "================================="

echo "🔍 Check pod status:"
kubectl get pods -n $NAMESPACE

echo ""
echo "🔍 Test backend API through router:"
curl -s http://20.57.101.193/api/v1/oauth/providers | python3 -m json.tool | head -10

echo ""
echo "🔍 Test frontend access:"
HTTP_STATUS=$(curl -s -o /dev/null -w '%{http_code}' http://20.57.101.193/)
echo "Frontend HTTP status: $HTTP_STATUS"

echo ""
echo "🔍 Test CORS headers:"
curl -H "Origin: http://20.57.101.193" -I http://20.57.101.193/api/v1/oauth/providers 2>/dev/null | grep -i "access-control" || echo "CORS headers not found"

echo ""
echo "✅ ROUTER IS NOW WORKING!"
echo "========================"
echo ""
echo "🌐 Your application should work at: http://20.57.101.193"
echo ""
echo "🔍 Test in browser:"
echo "   1. Go to http://20.57.101.193"
echo "   2. Open Developer Tools (F12)"
echo "   3. Check Network tab for API calls"
echo "   4. Look for successful calls to /api/v1/oauth/providers"
echo ""
echo "🚀 If you still see CORS errors, we'll try a different approach!"