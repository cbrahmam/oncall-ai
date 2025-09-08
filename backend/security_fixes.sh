#!/bin/bash
# CRITICAL SECURITY FIXES - RUN IMMEDIATELY

echo "🚨 APPLYING CRITICAL SECURITY FIXES"
echo "==================================="

# 1. FIX LOCAL BACKEND (Fix the 500 error)
echo "🔧 Fixing local backend..."
cd backend

# Check what's causing the 500 error
echo "Checking backend logs..."
# Look for the specific error in your server logs

# 2. DISABLE DOCS IN PRODUCTION
echo "🔒 Disabling docs in production..."
cat > fix_production_main.py << 'EOF'
# Update main.py to properly disable docs in production
# Replace the FastAPI app creation section with:

app = FastAPI(
    title="OffCall AI - Enterprise Edition",
    description="AI-powered incident response with enterprise SSO and security",
    version="2.0.0",
    lifespan=lifespan,
    # CRITICAL: Disable docs in production
    docs_url=None,  # Always disabled in production
    redoc_url=None, # Always disabled in production  
    openapi_url=None  # Always disabled in production
)
EOF

# 3. FIX FRONTEND SOURCE MAPS
echo "📁 Securing frontend source maps..."
cd ../frontend/oncall-frontend

# Create nginx config to block source maps
cat > nginx-security.conf << 'EOF'
# Add to your nginx config or cloudflare rules

# Block source maps
location ~* \.map$ {
    deny all;
    return 404;
}

# Block development files
location ~* \.(ts|tsx|jsx)$ {
    deny all;
    return 404;
}

# Block config files
location ~* \.(env|json|yml|yaml)$ {
    deny all;
    return 404;
}
EOF

# 4. CREATE PRODUCTION DEPLOYMENT SCRIPT
cat > ../deploy-secure.sh << 'EOF'
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
EOF

chmod +x deploy-secure.sh

# 5. ADD CLOUDFLARE SECURITY RULES
cat > cloudflare-rules.txt << 'EOF'
Add these rules to Cloudflare:

1. Block source maps:
   URL contains ".map" → Block

2. Block docs in production:
   URL equals "/docs" → Block
   URL equals "/redoc" → Block
   URL equals "/openapi.json" → Block

3. Rate limiting:
   Path contains "/api/v1/auth" → Rate limit 10/minute
   Path contains "/api/v1/" → Rate limit 100/minute

4. Block common attacks:
   URL contains "admin" → Block
   URL contains ".env" → Block
   URL contains "wp-" → Block
EOF

echo ""
echo "✅ CRITICAL FIXES PREPARED"
echo ""
echo "IMMEDIATE ACTIONS:"
echo "1. Fix local 500 error first"
echo "2. Update main.py to disable docs"
echo "3. Run ./deploy-secure.sh"
echo "4. Add Cloudflare rules from cloudflare-rules.txt"
echo ""
echo "VERIFY WITH:"
echo "  curl -I https://offcallai.com/docs (should be 404)"
echo "  curl -I https://offcallai.com/static/js/main.js.map (should be 404)"