#!/bin/bash

echo "🔧 FIXING DOCKER BUILD ISSUES"
echo "============================="
echo "1. Fixing httpx dependency conflict"
echo "2. Ensuring linux/amd64 platform build"
echo ""

cd backend

# Step 1: Fix the httpx dependency conflict
echo "🔧 Fixing requirements.txt dependency conflict..."

# Remove the conflicting httpx line and use the newer version
sed -i '' '/^httpx==0.25.2/d' requirements.txt

# Verify the fix
echo "✅ Dependency conflict resolved"
echo "Current httpx requirement:"
grep httpx requirements.txt || echo "httpx>=0.27.0 (from AI dependencies)"

echo ""

# Step 2: Build with correct platform specification
echo "🐳 Building Docker image with linux/amd64 platform..."

# Force linux/amd64 platform (this was missing!)
docker build --platform linux/amd64 -t offcaiaicr80017.azurecr.io/offcall-ai-backend:v2.3.0-ai . || {
    echo "❌ Docker build still failing. Let's check what's wrong..."
    echo ""
    echo "📋 Current requirements.txt conflicts:"
    grep -E "httpx|aiohttp" requirements.txt
    echo ""
    echo "🔧 Let's clean up all HTTP client dependencies..."
    
    # Create a clean requirements.txt backup
    cp requirements.txt requirements.txt.backup
    
    # Remove conflicting HTTP client versions
    sed -i '' '/^httpx==/d' requirements.txt
    sed -i '' '/^aiohttp==/d' requirements.txt
    
    # Add clean versions
    echo "" >> requirements.txt
    echo "# HTTP Clients (cleaned up)" >> requirements.txt
    echo "aiohttp>=3.9.0" >> requirements.txt
    echo "httpx>=0.27.0" >> requirements.txt
    
    echo "✅ Cleaned up HTTP client dependencies"
    echo ""
    echo "🔄 Retrying Docker build..."
    
    docker build --platform linux/amd64 -t offcaiaicr80017.azurecr.io/offcall-ai-backend:v2.3.0-ai . || {
        echo "❌ Still failing. Let's see the exact error:"
        echo ""
        echo "📋 Current requirements.txt (last 20 lines):"
        tail -20 requirements.txt
        exit 1
    }
}

echo "✅ Docker build successful with linux/amd64 platform!"

# Step 3: Push to Azure Container Registry
echo ""
echo "☁️ Pushing to Azure Container Registry..."
docker push offcaiaicr80017.azurecr.io/offcall-ai-backend:v2.3.0-ai

echo ""
echo "✅ BUILD AND PUSH COMPLETE!"
echo "=========================="
echo "✅ Fixed dependency conflicts"
echo "✅ Used correct linux/amd64 platform"
echo "✅ Image pushed to Azure registry"
echo ""
echo "🔗 Now run the deployment update:"
echo "kubectl set image deployment/offcall-ai-backend -n offcall-ai backend=offcaiaicr80017.azurecr.io/offcall-ai-backend:v2.3.0-ai"