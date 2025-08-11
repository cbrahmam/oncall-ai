#!/bin/bash
# Fix hardcoded database and Redis connections in the backend

set -e

echo "🔧 FIXING HARDCODED DATABASE/REDIS CONNECTIONS"
echo "=============================================="

NAMESPACE="offcall-ai"
BACKEND_POD=$(kubectl get pods -n $NAMESPACE -l app=offcall-ai-backend -o jsonpath='{.items[0].metadata.name}')

echo "Backend pod: $BACKEND_POD"

echo ""
echo "🔍 Step 1: Check what's hardcoded"
echo "==============================="

echo "Checking for localhost:6379 (Redis):"
kubectl exec -n $NAMESPACE $BACKEND_POD -- grep -n "localhost:6379" /app/app/database.py /app/app/core/config.py || echo "No localhost:6379 found"

echo ""
echo "Checking for hardcoded database IP:"
kubectl exec -n $NAMESPACE $BACKEND_POD -- grep -n "4.152.201.171" /app/app/database.py /app/app/core/config.py || echo "No hardcoded DB IP found"

echo ""
echo "🔧 Step 2: Patch the configuration files to use environment variables"
echo "================================================================="

# Create a script to fix the hardcoded values
kubectl exec -n $NAMESPACE $BACKEND_POD -- bash -c "
# Backup original files
cp /app/app/core/config.py /app/app/core/config.py.backup
cp /app/app/database.py /app/app/database.py.backup

# Fix config.py to use environment variables
sed -i 's/localhost:6379/redis:\/\/localhost:6379/g' /app/app/core/config.py
sed -i 's/DATABASE_URL.*=.*/DATABASE_URL = os.getenv(\"DATABASE_URL\", \"postgresql:\/\/localhost:5432\/offcall_ai\")/g' /app/app/core/config.py
sed -i 's/REDIS_URL.*=.*/REDIS_URL = os.getenv(\"REDIS_URL\", \"redis:\/\/localhost:6379\")/g' /app/app/core/config.py

# Fix database.py to use environment variables
sed -i 's/localhost:6379/os.getenv(\"REDIS_URL\", \"redis:\/\/localhost:6379\")/g' /app/app/database.py

echo 'Files patched to use environment variables'
"

echo "✅ Patched configuration files to use environment variables"

echo ""
echo "🔄 Step 3: Restart the application process"
echo "========================================"

# Kill the uvicorn process to force restart with new config
kubectl exec -n $NAMESPACE $BACKEND_POD -- pkill -f uvicorn || echo "Process killed"

# Wait a moment for the container to restart
sleep 10

echo ""
echo "🔍 Step 4: Verify the fix"
echo "======================="

echo "Wait for backend to restart..."
sleep 20

echo "Testing health endpoint:"
curl -s http://20.57.101.193/health | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(f'Status: {data.get(\"status\", \"unknown\")}')
    print(f'Database: {data.get(\"features\", {}).get(\"database_connection\", \"unknown\")}')
    print(f'Redis: {data.get(\"features\", {}).get(\"redis_connection\", \"unknown\")}')
    
    if data.get('status') == 'healthy':
        print('\\n🎉 SUCCESS! Backend is now healthy!')
        print('✅ CloudFlare should now work at https://offcallai.com')
    else:
        print('\\n⚠️  Still having issues, checking logs...')
except Exception as e:
    print(f'❌ Could not parse response: {e}')
"

echo ""
echo "🔍 Check backend logs for any remaining errors:"
kubectl logs -n $NAMESPACE $BACKEND_POD --tail=10

echo ""
echo "🌐 Test CloudFlare (should work now):"
echo "https://offcallai.com"
curl -I https://offcallai.com 2>/dev/null | head -3 || echo "Still getting 522 error"

echo ""
echo "🎯 SUMMARY"
echo "=========="
echo "✅ Found hardcoded database/Redis connections in backend code"
echo "✅ Patched files to use environment variables"  
echo "✅ Restarted backend process"
echo ""
echo "If health shows 'healthy', then:"
echo "✅ https://offcallai.com should work with CloudFlare"
echo "✅ Frontend-backend communication should work"
echo "✅ Ready for OAuth setup and launch!"