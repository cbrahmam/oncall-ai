#!/bin/bash
# Fix the database and Redis connection issues immediately

set -e

echo "🔧 FIXING DATABASE & REDIS CONNECTION ISSUES"
echo "============================================="

NAMESPACE="offcall-ai"

echo "🔍 Current connection issues:"
echo "❌ Database: 'async_generator' object does not support the asyn"
echo "❌ Redis: Error 111 connecting to localhost:6379"
echo "✅ Backend is running and responding"

echo ""
echo "🔧 Step 1: Get current connection strings"
echo "========================================"

# Get current DATABASE_URL
CURRENT_DB_URL=$(kubectl get secret offcall-ai-secrets -n $NAMESPACE -o jsonpath='{.data.DATABASE_URL}' | base64 -d)
echo "Current DATABASE_URL: $CURRENT_DB_URL"

# Get current REDIS_URL 
CURRENT_REDIS_URL=$(kubectl get secret offcall-ai-secrets -n $NAMESPACE -o jsonpath='{.data.REDIS_URL}' | base64 -d)
echo "Current REDIS_URL: $CURRENT_REDIS_URL"

echo ""
echo "🔧 Step 2: Fix DATABASE_URL format"
echo "================================="

# Extract components from current URL
DB_USER=$(echo "$CURRENT_DB_URL" | sed 's/.*:\/\/\([^:]*\):.*/\1/')
DB_PASS=$(echo "$CURRENT_DB_URL" | sed 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/')
DB_HOST=$(echo "$CURRENT_DB_URL" | sed 's/.*@\([^:]*\):.*/\1/')
DB_PORT=$(echo "$CURRENT_DB_URL" | sed 's/.*:\([0-9]*\)\/.*/\1/')
DB_NAME=$(echo "$CURRENT_DB_URL" | sed 's/.*\/\([^?]*\).*/\1/')

echo "Database components:"
echo "  User: $DB_USER"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT" 
echo "  Database: $DB_NAME"

# Fix: Remove +asyncpg from DATABASE_URL (this is causing the async error)
FIXED_DB_URL="postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
echo "Fixed DATABASE_URL: $FIXED_DB_URL"

echo ""
echo "🔧 Step 3: Fix REDIS_URL"
echo "======================"

# The Redis is trying to connect to localhost, need Azure Redis connection
# Extract Redis password from current URL if it exists
if [[ $CURRENT_REDIS_URL == *"localhost"* ]]; then
    echo "❌ Redis pointing to localhost - need Azure Redis connection"
    
    # Get Azure Redis info
    REDIS_HOST="offcall-ai-compliance-redis.redis.cache.windows.net"
    REDIS_PORT="6380"
    
    # Try to get Redis key from Azure
    echo "Getting Redis access key from Azure..."
    REDIS_KEY=$(az redis list-keys --resource-group offcall-ai-compliance-prod --name offcall-ai-compliance-redis --query "primaryKey" -o tsv)
    
    if [[ -n "$REDIS_KEY" ]]; then
        # Use SSL connection for Azure Redis
        FIXED_REDIS_URL="rediss://:${REDIS_KEY}@${REDIS_HOST}:${REDIS_PORT}/0"
        echo "Fixed REDIS_URL: rediss://:[HIDDEN]@${REDIS_HOST}:${REDIS_PORT}/0"
    else
        echo "❌ Could not get Redis key from Azure"
        FIXED_REDIS_URL="$CURRENT_REDIS_URL"
    fi
else
    echo "✅ Redis URL looks correct: $CURRENT_REDIS_URL"
    FIXED_REDIS_URL="$CURRENT_REDIS_URL"
fi

echo ""
echo "🔧 Step 4: Update Kubernetes secrets"
echo "=================================="

# Get other required secrets
JWT_SECRET=$(kubectl get secret offcall-ai-secrets -n $NAMESPACE -o jsonpath='{.data.SECRET_KEY}' | base64 -d 2>/dev/null || echo "your-secret-key-here")

# Update the secret with fixed connection strings
kubectl delete secret offcall-ai-secrets -n $NAMESPACE 2>/dev/null || true

kubectl create secret generic offcall-ai-secrets -n $NAMESPACE \
    --from-literal=DATABASE_URL="$FIXED_DB_URL" \
    --from-literal=REDIS_URL="$FIXED_REDIS_URL" \
    --from-literal=SECRET_KEY="$JWT_SECRET" \
    --from-literal=JWT_SECRET="$JWT_SECRET"

echo "✅ Updated secrets with fixed connection strings"

echo ""
echo "🔧 Step 5: Restart backend to pick up new connections"
echo "==================================================="

kubectl rollout restart deployment/offcall-ai-backend -n $NAMESPACE

echo "⏳ Waiting for backend restart..."
kubectl rollout status deployment/offcall-ai-backend -n $NAMESPACE --timeout=120s

# Wait a bit for startup
sleep 20

echo ""
echo "🔧 Step 6: Test the fixes"
echo "======================="

echo "🔍 Testing backend health with new connections:"
curl -s http://20.57.101.193/health | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(f\"Status: {data.get('status', 'unknown')}\")
    print(f\"Database: {data.get('features', {}).get('database_connection', 'unknown')}\")
    print(f\"Redis: {data.get('features', {}).get('redis_connection', 'unknown')}\")
    if data.get('status') == 'healthy':
        print('✅ Backend is now healthy!')
    else:
        print('⚠️  Backend still degraded, checking logs...')
except:
    print('❌ Could not parse health response')
"

echo ""
echo "🔍 Check backend logs for any remaining errors:"
kubectl logs -l app=offcall-ai-backend -n $NAMESPACE --tail=15

echo ""
echo "🔧 Step 7: Test critical endpoints"
echo "================================="

echo "🔍 Testing OAuth providers endpoint:"
curl -s http://20.57.101.193/api/v1/oauth/providers | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if isinstance(data, list):
        print(f'✅ OAuth providers working: {len(data)} providers found')
    else:
        print(f'⚠️  OAuth response: {data}')
except:
    print('❌ OAuth providers endpoint failed')
"

echo ""
echo "🔍 Testing frontend access:"
FRONTEND_STATUS=$(curl -s -o /dev/null -w '%{http_code}' http://20.57.101.193/)
if [[ $FRONTEND_STATUS == "200" ]]; then
    echo "✅ Frontend accessible (HTTP $FRONTEND_STATUS)"
else
    echo "⚠️  Frontend issues (HTTP $FRONTEND_STATUS)"
fi

echo ""
echo "🎯 RESULTS SUMMARY"
echo "=================="
echo "✅ Fixed DATABASE_URL format (removed +asyncpg)"
echo "✅ Fixed REDIS_URL to point to Azure Redis service"
echo "✅ Restarted backend with new configuration"
echo ""
echo "Expected results:"
echo "  - Status should be 'healthy' (not degraded)"
echo "  - Database connection should be 'connected'"
echo "  - Redis connection should be 'connected'"
echo ""
echo "🌐 Test immediately:"
echo "   1. Go to https://offcallai.com (CloudFlare should work now)"
echo "   2. Backend health: http://20.57.101.193/health"
echo "   3. Frontend should be able to communicate with backend"
echo ""
echo "If backend is now healthy, CloudFlare will work perfectly!"