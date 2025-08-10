#!/bin/bash
# Investigate why backend health check shows wrong connection info

set -e

echo "🔍 INVESTIGATING BACKEND CODE ISSUE"
echo "=================================="

NAMESPACE="offcall-ai"

BACKEND_POD=$(kubectl get pods -n $NAMESPACE -l app=offcall-ai-backend -o jsonpath='{.items[0].metadata.name}')
echo "Backend pod: $BACKEND_POD"

echo ""
echo "🔍 Step 1: Check what the backend actually tries to connect to"
echo "==========================================================="

echo "Let's see what's in the backend health check code:"
echo "Testing different endpoints to see if any work..."

echo ""
echo "🔍 Test direct API calls to see if backend is actually working:"

echo "1. Test basic health without JSON parsing:"
kubectl exec -n $NAMESPACE $BACKEND_POD -- curl -s http://localhost:8000/health

echo ""
echo "2. Test if any API endpoints work:"
kubectl exec -n $NAMESPACE $BACKEND_POD -- curl -s http://localhost:8000/api/v1/ || echo "No /api/v1/ endpoint"

echo ""
echo "3. Test root endpoint:"
kubectl exec -n $NAMESPACE $BACKEND_POD -- curl -s http://localhost:8000/ || echo "No root endpoint"

echo ""
echo "4. Check docs endpoint directly:"
kubectl exec -n $NAMESPACE $BACKEND_POD -- curl -s http://localhost:8000/docs | head -20

echo ""
echo "🔍 Step 2: Try to understand the API structure"
echo "============================================"

echo "Get OpenAPI spec to see actual endpoints:"
kubectl exec -n $NAMESPACE $BACKEND_POD -- curl -s http://localhost:8000/openapi.json | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    paths = data.get('paths', {})
    print('Available API endpoints:')
    for path in sorted(paths.keys()):
        methods = list(paths[path].keys())
        print(f'  {path} - {methods}')
except:
    print('Could not parse OpenAPI spec')
"

echo ""
echo "🔍 Step 3: Check if the health endpoint logic is wrong"
echo "=================================================="

echo "The health endpoint might be:"
echo "1. Using cached/hardcoded connection strings"
echo "2. Not actually testing real connections"
echo "3. Using different environment variable names internally"

echo ""
echo "Let's test if the database actually works by trying a simple query:"
echo "Testing database connection directly..."

# Test if we can connect to PostgreSQL directly
echo "Testing PostgreSQL connection from pod:"
kubectl exec -n $NAMESPACE $BACKEND_POD -- python3 -c "
import os
import asyncio
try:
    import asyncpg
    
    async def test_db():
        database_url = os.getenv('DATABASE_URL')
        print(f'Using DATABASE_URL: {database_url}')
        
        try:
            conn = await asyncpg.connect(database_url)
            result = await conn.fetchval('SELECT version()')
            print(f'✅ Database connected successfully: {result[:50]}...')
            await conn.close()
        except Exception as e:
            print(f'❌ Database connection failed: {e}')
    
    asyncio.run(test_db())
except ImportError:
    print('❌ asyncpg not available, cannot test database connection')
except Exception as e:
    print(f'❌ Database test failed: {e}')
"

echo ""
echo "🔍 Step 4: Test Redis connection directly"
echo "======================================="

kubectl exec -n $NAMESPACE $BACKEND_POD -- python3 -c "
import os
try:
    import redis
    
    redis_url = os.getenv('REDIS_URL')
    print(f'Using REDIS_URL: {redis_url}')
    
    try:
        r = redis.from_url(redis_url)
        r.ping()
        print('✅ Redis connected successfully')
    except Exception as e:
        print(f'❌ Redis connection failed: {e}')
except ImportError:
    print('❌ redis package not available')
except Exception as e:
    print(f'❌ Redis test failed: {e}')
"

echo ""
echo "🔍 Step 5: Check actual API endpoints that work"
echo "============================================="

echo "Let's see what endpoints actually return valid responses:"

# Test common FastAPI endpoints
for endpoint in "/health" "/docs" "/openapi.json" "/api" "/api/v1" "/api/v1/health" "/"
do
    echo "Testing $endpoint:"
    HTTP_CODE=$(kubectl exec -n $NAMESPACE $BACKEND_POD -- curl -s -o /dev/null -w '%{http_code}' http://localhost:8000$endpoint)
    echo "  Status: $HTTP_CODE"
done

echo ""
echo "🎯 THEORY"
echo "========="
echo "Based on the evidence:"
echo "1. ✅ Environment variables are correctly set"
echo "2. ✅ Backend starts up successfully"  
echo "3. ✅ Health endpoint responds (200 OK)"
echo "4. ❌ Health endpoint shows wrong connection info"
echo "5. ❌ API routes return 404"
echo ""
echo "This suggests:"
echo "- The health endpoint has hardcoded/cached connection strings"
echo "- OR the health endpoint isn't actually testing real connections"
echo "- The API routes might be under different paths"
echo "- The backend might be working but health check is misleading"
echo ""
echo "🔧 NEXT: Let's test if the frontend can actually connect"
echo "Try logging in via the frontend to see if backend actually works!"
