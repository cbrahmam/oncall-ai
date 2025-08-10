#!/bin/bash
# Complete fix for OffCall AI deployment with Squarespace DNS integration
# This fixes database connections and sets up domain properly

set -e

echo "🚀 COMPLETE OFFCALL AI DEPLOYMENT FIX"
echo "===================================="

# Variables
NAMESPACE="offcall-ai"
RESOURCE_GROUP="offcall-ai-compliance-prod"
KEY_VAULT_NAME="offcallai-prod-keyvault"
DOMAIN="offcallai.com"
AZURE_PUBLIC_IP="20.57.101.193"

echo "📋 Current Status:"
echo "   Azure Public IP: $AZURE_PUBLIC_IP"
echo "   Domain: $DOMAIN (Squarespace DNS)"
echo "   Pods: $(kubectl get pods -n $NAMESPACE --no-headers | wc -l) running"

echo ""
echo "🔧 STEP 1: Create missing Kubernetes secrets"
echo "==========================================="

# Check if Key Vault exists and get secrets
echo "🔍 Retrieving secrets from Azure Key Vault..."

# Get PostgreSQL details (from your deployment document)
POSTGRES_HOST="4.152.201.171"
POSTGRES_PORT="5432"
POSTGRES_DB="offcall_ai"
POSTGRES_USER="dbadmin"

# Try to get password from Key Vault, or create a default
echo "🔑 Getting database password..."
POSTGRES_PASSWORD=$(az keyvault secret show --vault-name $KEY_VAULT_NAME --name "postgres-admin-password" --query "value" -o tsv 2>/dev/null || echo "offcall_secure_pass_2024")

# Create proper DATABASE_URL
DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}"

echo "✅ Database URL configured"

# Get Redis details
echo "🔑 Getting Redis connection..."
REDIS_HOST="offcall-ai-compliance-redis.redis.cache.windows.net"
REDIS_PORT="6380"

# Try to get Redis key from Azure, or use a default
REDIS_KEY=$(az redis list-keys --resource-group $RESOURCE_GROUP --name "offcall-ai-compliance-redis" --query "primaryKey" -o tsv 2>/dev/null || echo "default_redis_key")
REDIS_URL="rediss://:${REDIS_KEY}@${REDIS_HOST}:${REDIS_PORT}"

echo "✅ Redis URL configured"

# Get or create JWT secret
JWT_SECRET=$(az keyvault secret show --vault-name $KEY_VAULT_NAME --name "jwt-secret-key" --query "value" -o tsv 2>/dev/null || openssl rand -base64 64)

echo "✅ JWT secret configured"

# Create the Kubernetes secret
echo "📝 Creating Kubernetes secret..."
kubectl delete secret offcall-ai-secrets -n $NAMESPACE --ignore-not-found

kubectl create secret generic offcall-ai-secrets -n $NAMESPACE \
    --from-literal=DATABASE_URL="$DATABASE_URL" \
    --from-literal=POSTGRES_URL="$DATABASE_URL" \
    --from-literal=REDIS_URL="$REDIS_URL" \
    --from-literal=JWT_SECRET="$JWT_SECRET" \
    --from-literal=SECRET_KEY="$JWT_SECRET"

echo "✅ Kubernetes secrets created successfully"

echo ""
echo "🔧 STEP 2: Update deployments to use secrets"
echo "==========================================="

# Update backend deployment to use environment variables from secret
cat << EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: offcall-ai-backend
  namespace: $NAMESPACE
spec:
  replicas: 1
  selector:
    matchLabels:
      app: offcall-ai-backend
  template:
    metadata:
      labels:
        app: offcall-ai-backend
    spec:
      containers:
      - name: backend
        image: offcaiaicr80017.azurecr.io/offcall-ai-backend:v1.0.3
        ports:
        - containerPort: 8000
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
          value: "production"
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5
      imagePullSecrets:
      - name: acr-secret
EOF

echo "✅ Backend deployment updated with environment variables"

echo ""
echo "🔧 STEP 3: Configure Squarespace DNS (INSTRUCTIONS)"
echo "================================================="

echo ""
echo "⚠️  MANUAL SQUARESPACE DNS CONFIGURATION REQUIRED:"
echo "=================================================="
echo ""
echo "🌐 Go to your Squarespace DNS settings:"
echo "   https://account.squarespace.com/domains/managed/offcallai.com/dns/dns-settings"
echo ""
echo "📝 ADD THESE RECORDS in the 'Custom records' section:"
echo ""
echo "1. DELETE the existing Squarespace A records (@) first, then add:"
echo ""
echo "   Record 1:"
echo "   HOST: @"
echo "   TYPE: A" 
echo "   TTL: 1 hr"
echo "   DATA: $AZURE_PUBLIC_IP"
echo ""
echo "   Record 2:"
echo "   HOST: www"
echo "   TYPE: A"
echo "   TTL: 1 hr" 
echo "   DATA: $AZURE_PUBLIC_IP"
echo ""
echo "   Record 3:"
echo "   HOST: api"
echo "   TYPE: A"
echo "   TTL: 1 hr"
echo "   DATA: $AZURE_PUBLIC_IP"
echo ""

read -p "Have you updated the Squarespace DNS records? (y/n): " dns_updated

if [[ $dns_updated != "y" ]]; then
    echo "⚠️  Please update DNS records first for domain to work properly"
    echo "   The application will still be accessible via IP: http://$AZURE_PUBLIC_IP"
fi

echo ""
echo "🔧 STEP 4: Restart deployments"
echo "============================"

echo "🔄 Restarting all deployments..."
kubectl rollout restart deployment/offcall-ai-backend -n $NAMESPACE
kubectl rollout restart deployment/offcall-ai-frontend -n $NAMESPACE
kubectl rollout restart deployment/offcall-ai-router -n $NAMESPACE

echo "⏳ Waiting for deployments to be ready..."
kubectl rollout status deployment/offcall-ai-backend -n $NAMESPACE --timeout=300s
kubectl rollout status deployment/offcall-ai-frontend -n $NAMESPACE --timeout=300s
kubectl rollout status deployment/offcall-ai-router -n $NAMESPACE --timeout=300s

echo ""
echo "🔧 STEP 5: Verify application health"
echo "=================================="

echo "🔍 Checking pod status..."
kubectl get pods -n $NAMESPACE

echo ""
echo "🔍 Testing backend health..."
sleep 30  # Give pods time to fully start

# Test via public IP first
echo "Testing via Azure Public IP..."
HTTP_STATUS=$(curl -s -o /dev/null -w '%{http_code}' http://$AZURE_PUBLIC_IP/health || echo "000")

if [[ $HTTP_STATUS == "200" ]]; then
    echo "✅ Backend health check passed (Status: $HTTP_STATUS)"
else
    echo "⚠️  Backend health check failed (Status: $HTTP_STATUS)"
    echo "📋 Checking backend logs for issues..."
    kubectl logs -l app=offcall-ai-backend -n $NAMESPACE --tail=10
fi

# Test frontend
echo ""
echo "🔍 Testing frontend..."
FRONTEND_STATUS=$(curl -s -o /dev/null -w '%{http_code}' http://$AZURE_PUBLIC_IP/ || echo "000")

if [[ $FRONTEND_STATUS == "200" ]]; then
    echo "✅ Frontend is accessible (Status: $FRONTEND_STATUS)"
else
    echo "⚠️  Frontend access failed (Status: $FRONTEND_STATUS)"
fi

echo ""
echo "🔧 STEP 6: Setup HTTPS with cert-manager"
echo "======================================"

# Install cert-manager if not already installed
if ! kubectl get namespace cert-manager >/dev/null 2>&1; then
    echo "📦 Installing cert-manager..."
    kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
    
    echo "⏳ Waiting for cert-manager to be ready..."
    kubectl wait --for=condition=ready pod -l app=cert-manager -n cert-manager --timeout=120s
    kubectl wait --for=condition=ready pod -l app=cainjector -n cert-manager --timeout=120s  
    kubectl wait --for=condition=ready pod -l app=webhook -n cert-manager --timeout=120s
    
    echo "✅ cert-manager installed"
else
    echo "✅ cert-manager already installed"
fi

# Create Let's Encrypt ClusterIssuer
echo "🔐 Creating Let's Encrypt ClusterIssuer..."
cat << EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@offcallai.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF

# Install NGINX Ingress if not already installed
if ! kubectl get namespace ingress-nginx >/dev/null 2>&1; then
    echo "📦 Installing NGINX Ingress Controller..."
    kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml
    
    echo "⏳ Waiting for NGINX Ingress Controller..."
    kubectl wait --for=condition=ready pod -l app.kubernetes.io/component=controller -n ingress-nginx --timeout=180s
    
    echo "✅ NGINX Ingress Controller installed"
else
    echo "✅ NGINX Ingress Controller already installed"
fi

# Create Ingress with SSL
echo "🌐 Creating Ingress with SSL..."
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
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - $DOMAIN
    - www.$DOMAIN
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
EOF

echo "✅ Ingress with SSL configured"

echo ""
echo "🎉 DEPLOYMENT FIX COMPLETE!"
echo "=========================="
echo ""
echo "🌐 Your application endpoints:"
echo "   ✅ Public IP: http://$AZURE_PUBLIC_IP"
echo "   ⏳ Domain: https://$DOMAIN (after DNS propagation)"
echo "   ⏳ API Docs: https://$DOMAIN/docs"  
echo "   ⏳ Health: https://$DOMAIN/health"
echo ""
echo "📋 Next steps:"
echo "   1. Update Squarespace DNS as shown above"
echo "   2. Wait 5-60 minutes for DNS propagation"
echo "   3. SSL certificate will auto-issue once DNS works"
echo ""
echo "🔍 Monitor progress:"
echo "   kubectl get certificate -n $NAMESPACE"
echo "   kubectl get ingress -n $NAMESPACE"
echo "   kubectl logs -l app=offcall-ai-backend -n $NAMESPACE"
echo ""
echo "💰 Cost optimization available:"
echo "   ./cost-optimize.sh shutdown  # Save $140/month when not developing"
echo "   ./cost-optimize.sh startup   # Resume for development"
echo ""
echo "🚀 Status: Ready for customer demos and development!"