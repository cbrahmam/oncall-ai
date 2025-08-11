#!/bin/bash
# Fix the health endpoint in main.py to use our corrected database functions

echo "🔧 FIXING HEALTH ENDPOINT IN MAIN.PY"
echo "==================================="

# Back up the original file
cp app/main.py app/main.py.backup

echo "✅ Backup created"

# Fix the Redis connection in the health endpoint to use environment variable
echo "🔧 Fixing hardcoded Redis URL in health endpoint..."

# Replace the hardcoded Redis URL with environment variable
sed -i '' 's/redis.from_url("redis:\/\/localhost:6379")/redis.from_url(os.getenv("REDIS_URL", "redis:\/\/localhost:6379"))/g' app/main.py

# Add os import at the top if not already there
if ! grep -q "^import os" app/main.py; then
    sed -i '' '1i\
import os
' app/main.py
fi

echo "✅ Fixed Redis URL in health endpoint"

# Better fix: Replace the entire health check logic to use our functions
echo "🔧 Updating health endpoint to use our fixed database functions..."

# Create improved health endpoint
cat > /tmp/health_fix.py << 'EOF'
@app.get("/health")
async def health_check():
    """Enhanced health check with proper database and Redis connections"""
    
    health_status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "2.0.0",
        "security": {
            "basic_headers": True,
            "cors_configured": True,
            "enhanced_security": ENHANCED_SECURITY_AVAILABLE,
            "oauth_enabled": OAUTH_AVAILABLE,
            "oauth_providers": list(oauth_providers.keys()) if oauth_providers else []
        },
        "features": {
            "authentication": True,
            "database": True,
            "incidents": True,
            "ai_analysis": False,
            "webhooks": False,
            "real_time_notifications": False
        }
    }
    
    # Test database using our fixed functions
    try:
        from app.database import check_db_health
        db_status = await check_db_health()
        health_status["features"]["database_connection"] = db_status
        if "error" in db_status:
            health_status["status"] = "degraded"
    except Exception as e:
        health_status["features"]["database_connection"] = f"error: {str(e)[:50]}"
        health_status["status"] = "degraded"
    
    # Test Redis using our fixed functions
    try:
        from app.database import check_redis_health
        redis_status = await check_redis_health()
        health_status["features"]["redis_connection"] = redis_status
        if "error" in redis_status:
            health_status["status"] = "degraded"
    except Exception as e:
        health_status["features"]["redis_connection"] = f"error: {str(e)[:50]}"
        health_status["status"] = "degraded"
    
    return health_status
EOF

# Find the health endpoint in main.py and replace it
python3 << 'EOF'
import re

# Read the current main.py
with open('app/main.py', 'r') as f:
    content = f.read()

# Read the new health endpoint
with open('/tmp/health_fix.py', 'r') as f:
    new_health = f.read()

# Replace the old health endpoint (from @app.get("/health") to the end of the function)
pattern = r'@app\.get\("/health"\).*?return health_status'
replacement = new_health.strip()

# Use DOTALL flag to match across multiple lines
new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)

# Write the updated content
with open('app/main.py', 'w') as f:
    f.write(new_content)

print("✅ Replaced health endpoint with improved version")
EOF

# Clean up temp file
rm /tmp/health_fix.py

echo "✅ Health endpoint updated to use our fixed database functions"

echo ""
echo "🔍 Verify the changes"
echo "===================="

echo "Checking for remaining hardcoded Redis URLs in main.py:"
grep -n "localhost:6379" app/main.py || echo "✅ No localhost:6379 found"

echo ""
echo "Checking that health endpoint imports our functions:"
grep -n "check_db_health\|check_redis_health" app/main.py || echo "⚠️  Health functions not found - manual check needed"

echo ""
echo "🎯 HEALTH ENDPOINT FIX COMPLETE"
echo "==============================="
echo "✅ Removed hardcoded Redis localhost:6379"
echo "✅ Updated to use environment variables"
echo "✅ Health endpoint now uses our fixed database functions"
echo ""
echo "🚀 Ready to rebuild with fixed health endpoint!"
echo "Run: docker buildx build --platform linux/amd64 --push -t offcaiaicr80017.azurecr.io/offcall-ai-backend:v1.0.8 ."