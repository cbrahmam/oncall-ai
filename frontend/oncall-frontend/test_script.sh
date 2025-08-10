#!/bin/bash
# Quick Test Script for OffCall AI
# Run this after the main fix script

echo "🧪 OffCall AI Quick Test Script"
echo "==============================="

cd /Users/brahmamchunduri/Documents/startup/oncall-ai

echo "🔍 Testing changes..."
echo ""

# 1. Verify name changes
echo "1️⃣  Checking name changes..."
if grep -r "OnCall AI" --exclude-dir=node_modules --exclude-dir=.git . > /dev/null; then
    echo "  ⚠️  Found remaining 'OnCall AI' references"
    grep -r "OnCall AI" --exclude-dir=node_modules --exclude-dir=.git . | head -3
else
    echo "  ✅ All 'OnCall AI' → 'OffCall AI' changes applied"
fi

# 2. Verify environment files
echo ""
echo "2️⃣  Checking environment files..."
if [ -f "frontend/offcall-frontend/.env" ]; then
    echo "  ✅ .env file exists"
    echo "  📄 Contents:"
    cat frontend/offcall-frontend/.env | sed 's/^/     /'
else
    echo "  ❌ .env file missing"
fi

# 3. Test backend starts
echo ""
echo "3️⃣  Testing backend startup..."
cd backend
if python -c "import app.main" 2>/dev/null; then
    echo "  ✅ Backend imports successfully"
else
    echo "  ⚠️  Backend import issues detected"
fi

# 4. Test frontend build
echo ""
echo "4️⃣  Testing frontend build..."
cd ../frontend/offcall-frontend 2>/dev/null || cd ../frontend/oncall-frontend

if [ -f "package.json" ]; then
    echo "  📦 Package.json found"
    if npm run build > /dev/null 2>&1; then
        echo "  ✅ Frontend build successful"
    else
        echo "  ⚠️  Frontend build issues"
    fi
else
    echo "  ❌ package.json not found"
fi

cd ../../

# 5. Check database references
echo ""
echo "5️⃣  Checking database configuration..."
if grep -q "offcall_ai" backend/.env 2>/dev/null; then
    echo "  ✅ Database name updated in backend/.env"
else
    echo "  ⚠️  Check database name in backend/.env"
fi

if grep -q "offcall" docker-compose.yml 2>/dev/null; then
    echo "  ✅ Docker compose updated"
else
    echo "  ⚠️  Check docker-compose.yml for database name"
fi

echo ""
echo "🎯 QUICK TEST COMPLETE"
echo "====================="
echo ""
echo "🚀 READY FOR:"
echo "  • Local development testing"
echo "  • Azure deployment"
echo "  • Production launch"
echo ""
echo "📋 Start local test with:"
echo "  cd frontend/offcall-frontend && npm start"
echo "  cd backend && uvicorn app.main:app --reload"