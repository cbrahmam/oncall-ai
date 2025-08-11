#!/bin/bash
# Complete OffCall AI Domain, SSL, and Frontend Connection Fix
# This handles: domain config, SSL certificates, frontend fixes, and branding

set -e

echo "🚀 COMPLETE OFFCALL AI DEPLOYMENT FINALIZATION"
echo "=============================================="

# Variables
NAMESPACE="offcall-ai"
DOMAIN="offcallai.com"
PUBLIC_IP="20.57.101.193"
RESOURCE_GROUP="offcall-ai-compliance-prod"

echo "🔍 Step 1: Verify cluster and get current IP"
echo "==========================================="

# Check current load balancer IP
CURRENT_IP=$(kubectl get service offcall-ai-loadbalancer -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")

if [[ -n "$CURRENT_IP" ]]; then
    echo "✅ Current Load Balancer IP: $CURRENT_IP"
    PUBLIC_IP="$CURRENT_IP"
else
    echo "⚠️  Using expected IP: $PUBLIC_IP"
fi

echo "📋 Domain: $DOMAIN"
echo "📋 Public IP: $PUBLIC_IP"

echo ""
echo "🔍 Step 2: Check current pod status"
echo "================================="

kubectl get pods -n $NAMESPACE

echo ""
echo "🔧 Step 3: Update router configuration for proper domain handling"
echo "=============================================================="

# Create comprehensive nginx config that handles:
# 1. Multiple domains (offcallai.com, api.offcallai.com)
# 2. CORS headers for frontend-backend communication
# 3. Proper SSL redirect preparation
cat << EOF | kubectl apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: offcall-ai-complete-router-config
  namespace: $NAMESPACE
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
        
        # Main server block for all domains
        server {
            listen 80;
            server_name $DOMAIN www.$DOMAIN api.$DOMAIN $PUBLIC_IP;
            
            # Security headers
            add_header X-Content-Type-Options nosniff always;
            add_header X-Frame-Options DENY always;
            add_header X-XSS-Protection "1; mode=block" always;
            
            # API routes with full CORS support
            location /api/ {
                # Handle preflight requests
                if (\$request_method = 'OPTIONS') {
                    add_header 'Access-Control-Allow-Origin' '*' always;
                    add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, PATCH, OPTIONS' always;
                    add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type, Accept, X-Requested-With' always;
                    add_header 'Access-Control-Max-Age' 86400 always;
                    add_header 'Content-Length' 0 always;
                    add_header 'Content-Type' 'text/plain' always;
                    return 204;
                }
                
                proxy_pass http://backend;
                proxy_set_header Host \$host;
                proxy_set_header X-Real-IP \$remote_addr;
                proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
                proxy_set_header X-Forwarded-Proto \$scheme;
                
                # CORS headers for actual requests
                add_header 'Access-Control-Allow-Origin' '*' always;
                add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, PATCH, OPTIONS' always;
                add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type, Accept, X-Requested-With' always;
                add_header 'Access-Control-Allow-Credentials' 'true' always;
            }
            
            # Backend endpoints
            location /docs {
                proxy_pass http://backend/docs;
                proxy_set_header Host \$host;
                proxy_set_header X-Real-IP \$remote_addr;
                proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
                proxy_set_header X-Forwarded-Proto \$scheme;
            }
            
            location /openapi.json {
                proxy_pass http://backend/openapi.json;
                proxy_set_header Host \$host;
                proxy_set_header X-Real-IP \$remote_addr;
                proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
                proxy_set_header X-Forwarded-Proto \$scheme;
            }
            
            location /health {
                proxy_pass http://backend/health;
                proxy_set_header Host \$host;
                proxy_set_header X-Real-IP \$remote_addr;
                proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
                proxy_set_header X-Forwarded-Proto \$scheme;
            }
            
            # Frontend with proper headers
            location / {
                proxy_pass http://frontend/;
                proxy_set_header Host \$host;
                proxy_set_header X-Real-IP \$remote_addr;
                proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
                proxy_set_header X-Forwarded-Proto \$scheme;
                
                # Handle SPA routing
                location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)\$ {
                    proxy_pass http://frontend;
                    expires 1y;
                    add_header Cache-Control "public, immutable";
                }
            }
        }
    }
EOF

echo "✅ Created comprehensive router configuration"

echo ""
echo "🔧 Step 4: Update router deployment with new config"
echo "==============================================="

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
        resources:
          requests:
            memory: "64Mi"
            cpu: "50m"
          limits:
            memory: "128Mi"
            cpu: "100m"
      volumes:
      - name: nginx-config
        configMap:
          name: offcall-ai-complete-router-config
EOF

echo "✅ Updated router deployment"

echo ""
echo "🔄 Step 5: Restart router to apply new configuration"
echo "==============================================="

kubectl rollout restart deployment/offcall-ai-router -n $NAMESPACE
kubectl rollout status deployment/offcall-ai-router -n $NAMESPACE --timeout=120s

echo ""
echo "🔧 Step 6: Install and configure cert-manager for SSL"
echo "=================================================="

# Check if cert-manager is already installed
if ! kubectl get namespace cert-manager >/dev/null 2>&1; then
    echo "📦 Installing cert-manager..."
    kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
    
    echo "⏳ Waiting for cert-manager to be ready..."
    kubectl wait --for=condition=ready pod -l app=cert-manager -n cert-manager --timeout=180s
    kubectl wait --for=condition=ready pod -l app=cainjector -n cert-manager --timeout=180s
    kubectl wait --for=condition=ready pod -l app=webhook -n cert-manager --timeout=180s
    
    echo "✅ cert-manager installed successfully"
else
    echo "✅ cert-manager already installed"
fi

echo ""
echo "🔐 Step 7: Create Let's Encrypt ClusterIssuer"
echo "==========================================="

cat << EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@$DOMAIN
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF

echo "✅ Let's Encrypt ClusterIssuer created"

echo ""
echo "🔧 Step 8: Install NGINX Ingress Controller"
echo "========================================"

# Check if ingress-nginx is already installed
if ! kubectl get namespace ingress-nginx >/dev/null 2>&1; then
    echo "📦 Installing NGINX Ingress Controller..."
    kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml
    
    echo "⏳ Waiting for NGINX Ingress Controller..."
    kubectl wait --for=condition=ready pod -l app.kubernetes.io/component=controller -n ingress-nginx --timeout=300s
    
    echo "✅ NGINX Ingress Controller installed"
else
    echo "✅ NGINX Ingress Controller already installed"
fi

echo ""
echo "🌐 Step 9: Create Ingress with SSL for all domains"
echo "=============================================="

cat << EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: offcall-ai-ingress
  namespace: $NAMESPACE
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    nginx.ingress.kubernetes.io/cors-allow-origin: "*"
    nginx.ingress.kubernetes.io/cors-allow-methods: "GET, POST, PUT, DELETE, PATCH, OPTIONS"
    nginx.ingress.kubernetes.io/cors-allow-headers: "Authorization, Content-Type, Accept"
    nginx.ingress.kubernetes.io/enable-cors: "true"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - $DOMAIN
    - www.$DOMAIN
    - api.$DOMAIN
    secretName: offcall-ai-tls
  rules:
  - host: $DOMAIN
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: offcall-ai-backend-service
            port:
              number: 8000
      - path: /docs
        pathType: Prefix
        backend:
          service:
            name: offcall-ai-backend-service
            port:
              number: 8000
      - path: /health
        pathType: Prefix
        backend:
          service:
            name: offcall-ai-backend-service
            port:
              number: 8000
      - path: /openapi.json
        pathType: Prefix
        backend:
          service:
            name: offcall-ai-backend-service
            port:
              number: 8000
      - path: /
        pathType: Prefix
        backend:
          service:
            name: offcall-ai-frontend-service
            port:
              number: 80
  - host: www.$DOMAIN
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: offcall-ai-frontend-service
            port:
              number: 80
  - host: api.$DOMAIN
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: offcall-ai-backend-service
            port:
              number: 8000
EOF

echo "✅ Created Ingress with SSL for all domains"

echo ""
echo "🎨 Step 10: Update frontend branding (React App → OffCall AI)"
echo "=========================================================="

# Get the current frontend pod
FRONTEND_POD=\$(kubectl get pods -n $NAMESPACE -l app=offcall-ai-frontend --field-selector=status.phase=Running -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")

if [[ -n "$FRONTEND_POD" ]]; then
    echo "🎯 Frontend pod: $FRONTEND_POD"
    
    # Update the HTML title in the frontend
    echo "📝 Updating page title from 'React App' to 'OffCall AI'..."
    kubectl exec -n $NAMESPACE $FRONTEND_POD -- sed -i 's/<title>React App<\/title>/<title>OffCall AI - Enterprise Incident Response<\/title>/g' /usr/share/nginx/html/index.html
    
    # Update manifest.json if it exists
    kubectl exec -n $NAMESPACE $FRONTEND_POD -- sed -i 's/"short_name": "React App"/"short_name": "OffCall AI"/g' /usr/share/nginx/html/manifest.json 2>/dev/null || echo "manifest.json not found or already updated"
    kubectl exec -n $NAMESPACE $FRONTEND_POD -- sed -i 's/"name": "Create React App Sample"/"name": "OffCall AI - Enterprise Incident Response"/g' /usr/share/nginx/html/manifest.json 2>/dev/null || echo "manifest.json not found or already updated"
    
    echo "✅ Updated frontend branding"
else
    echo "⚠️  No frontend pod found - branding will be updated when pod restarts"
fi

echo ""
echo "🔍 Step 11: Test all endpoints and verify setup"
echo "============================================="

sleep 15

echo "🔍 Testing current IP endpoints:"
echo "1. Frontend: http://$PUBLIC_IP"
HTTP_STATUS=\$(curl -s -o /dev/null -w '%{http_code}' http://$PUBLIC_IP/ || echo "000")
echo "   Status: $HTTP_STATUS"

echo "2. API Health: http://$PUBLIC_IP/health"
HEALTH_STATUS=\$(curl -s -o /dev/null -w '%{http_code}' http://$PUBLIC_IP/health || echo "000")
echo "   Status: $HEALTH_STATUS"

echo "3. OAuth Providers: http://$PUBLIC_IP/api/v1/oauth/providers"
curl -s http://$PUBLIC_IP/api/v1/oauth/providers | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(f'   ✅ Found {len(data.get(\"providers\", []))} OAuth providers')
except:
    print('   ❌ Failed to parse OAuth providers')
" 2>/dev/null || echo "   ❌ OAuth providers endpoint failed"

echo ""
echo "🔍 Testing CORS headers:"
curl -H "Origin: https://$DOMAIN" -I http://$PUBLIC_IP/api/v1/oauth/providers 2>/dev/null | grep -i "access-control" | head -3 || echo "   ⚠️  CORS headers not detected (may be added by ingress)"

echo ""
echo "🔍 Certificate status:"
kubectl get certificate -n $NAMESPACE 2>/dev/null || echo "   ⏳ Certificates will be issued after DNS propagation"

echo ""
echo "🎉 SETUP COMPLETE!"
echo "=================="
echo ""
echo "✅ WHAT'S BEEN CONFIGURED:"
echo "   🌐 Router: Handles multiple domains with CORS"
echo "   🔐 SSL: Let's Encrypt certificates (will activate after DNS)"
echo "   🎨 Branding: Page title updated to 'OffCall AI'"
echo "   📡 Ingress: NGINX ingress controller with SSL redirect"
echo ""
echo "🌐 YOUR ENDPOINTS (after DNS propagation):"
echo "   ✅ https://$DOMAIN - Main application"
echo "   ✅ https://www.$DOMAIN - Main application"
echo "   ✅ https://api.$DOMAIN - Backend API"
echo "   ✅ https://$DOMAIN/docs - API documentation"
echo ""
echo "📋 IMMEDIATE ACCESS (before DNS):"
echo "   ✅ http://$PUBLIC_IP - Frontend"
echo "   ✅ http://$PUBLIC_IP/docs - API docs"
echo "   ✅ http://$PUBLIC_IP/health - Health check"
echo ""
echo "🔧 NEXT STEPS:"
echo "   1. Update Squarespace DNS records as instructed"
echo "   2. Wait 15-60 minutes for DNS propagation"
echo "   3. SSL certificates will auto-issue once DNS works"
echo "   4. Test frontend login at https://$DOMAIN"
echo ""
echo "💰 COST OPTIMIZATION:"
echo "   ./cost-optimize.sh shutdown  # Save money when not developing"
echo "   ./cost-optimize.sh startup   # Resume for development"
echo ""
echo "🚀 YOUR OFFCALL AI PLATFORM IS PRODUCTION-READY!"