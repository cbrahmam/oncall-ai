#!/bin/bash
# Fix all build issues for OffCall AI

echo "🔧 Fixing all build issues..."
echo "============================="

cd /Users/brahmamchunduri/Documents/startup/oncall-ai/frontend/oncall-frontend

# Fix 1: Add API_BASE_URL to all files that need it
echo "1️⃣  Adding API_BASE_URL to all components..."

# List of files that need API_BASE_URL
files_needing_api_url=(
    "src/contexts/AuthContext.tsx"
    "src/components/Dashboard.tsx"
    "src/components/AuthPages.tsx"
    "src/components/IncidentActions.tsx"
    "src/components/IncidentComments.tsx"
    "src/components/IncidentDetail.tsx"
    "src/components/IncidentTimeline.tsx"
    "src/components/CreateIncidentModal.tsx"
    "src/components/OAuthCallback.tsx"
    "src/components/TeamsManagement.tsx"
)

for file in "${files_needing_api_url[@]}"; do
    if [ -f "$file" ]; then
        echo "🔧 Fixing $file..."
        
        # Remove any existing API_BASE_URL declarations first
        sed -i '' '/^const API_BASE_URL/d' "$file"
        
        # Add API_BASE_URL after the last import statement
        # Find the last import line and add API_BASE_URL after it
        last_import_line=$(grep -n "^import" "$file" | tail -1 | cut -d: -f1)
        
        if [ ! -z "$last_import_line" ]; then
            # Add API_BASE_URL after the last import
            sed -i '' "${last_import_line}a\\
\\
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';
" "$file"
            echo "   ✅ Added API_BASE_URL to $file"
        else
            echo "   ⚠️  No imports found in $file"
        fi
    else
        echo "   ⚠️  File not found: $file"
    fi
done

# Fix 2: Fix template string syntax errors
echo ""
echo "2️⃣  Fixing template string syntax..."

# Replace incorrect template syntax with correct backticks
find src -name "*.tsx" -o -name "*.ts" | while read file; do
    if grep -q '\${API_BASE_URL}' "$file"; then
        echo "🔧 Fixing template syntax in $file..."
        
        # Fix common patterns - replace 'string${var}' with `string${var}`
        sed -i '' "s/'http:\/\/localhost:8000\/api\/v1'/\`\${API_BASE_URL}\`/g" "$file"
        sed -i '' "s/'\${API_BASE_URL}\/\([^']*\)'/\`\${API_BASE_URL}\/\1\`/g" "$file"
        
        echo "   ✅ Fixed template syntax in $file"
    fi
done

# Fix 3: Manual fixes for specific known issues
echo ""
echo "3️⃣  Applying specific fixes..."

# Fix AuthContext.tsx specifically
if [ -f "src/contexts/AuthContext.tsx" ]; then
    echo "🔧 Fixing AuthContext.tsx URLs..."
    sed -i '' "s|fetch('http://localhost:8000/api/v1/auth/login'|fetch(\`\${API_BASE_URL}/auth/login\`|g" src/contexts/AuthContext.tsx
    sed -i '' "s|fetch('http://localhost:8000/api/v1/auth/register'|fetch(\`\${API_BASE_URL}/auth/register\`|g" src/contexts/AuthContext.tsx
    echo "   ✅ Fixed AuthContext.tsx"
fi

# Fix Dashboard.tsx specifically  
if [ -f "src/components/Dashboard.tsx" ]; then
    echo "🔧 Fixing Dashboard.tsx URLs..."
    sed -i '' "s|fetch('http://localhost:8000/api/v1/incidents/'|fetch(\`\${API_BASE_URL}/incidents/\`|g" src/components/Dashboard.tsx
    echo "   ✅ Fixed Dashboard.tsx"
fi

# Fix other components
component_files=(
    "src/components/IncidentActions.tsx"
    "src/components/IncidentComments.tsx" 
    "src/components/IncidentDetail.tsx"
    "src/components/IncidentTimeline.tsx"
)

for file in "${component_files[@]}"; do
    if [ -f "$file" ]; then
        echo "🔧 Fixing URLs in $file..."
        # Replace any remaining hardcoded localhost URLs
        sed -i '' 's|http://localhost:8000/api/v1|${API_BASE_URL}|g' "$file"
        # Fix template literal syntax
        sed -i '' 's|`\${API_BASE_URL}|`${API_BASE_URL}|g' "$file"
        echo "   ✅ Fixed $file"
    fi
done

# Fix 4: Remove unused imports
echo ""
echo "4️⃣  Cleaning up unused imports..."

# Remove CheckCircleIcon from AuthPages if unused
if [ -f "src/components/AuthPages.tsx" ]; then
    if ! grep -q "CheckCircleIcon" src/components/AuthPages.tsx | grep -v "import"; then
        sed -i '' 's/CheckCircleIcon, //g' src/components/AuthPages.tsx
        sed -i '' 's/, CheckCircleIcon//g' src/components/AuthPages.tsx
        echo "   ✅ Removed unused CheckCircleIcon"
    fi
fi

echo ""
echo "5️⃣  Testing build..."
npm run build

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 BUILD SUCCESS!"
    echo "================"
    echo "✅ All issues fixed"
    echo "✅ Ready for deployment"
    echo ""
    echo "🚀 Next steps:"
    echo "  • Test locally: npm start"
    echo "  • Deploy to Azure"
else
    echo ""
    echo "❌ Build still failing - checking remaining issues..."
    npm run build 2>&1 | head -20
fi