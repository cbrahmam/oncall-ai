#!/bin/bash
# Emergency fix for broken import statements

echo "🚨 EMERGENCY FIX - Fixing broken import statements"
echo "================================================="

cd /Users/brahmamchunduri/Documents/startup/oncall-ai/frontend/oncall-frontend

# 1. First, let's remove all the broken API_BASE_URL declarations
echo "1️⃣  Removing broken API_BASE_URL declarations..."

files_to_fix=(
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
    "src/components/ModernLogin.tsx"
    "src/components/ModernRegister.tsx"
)

for file in "${files_to_fix[@]}"; do
    if [ -f "$file" ]; then
        echo "🔧 Cleaning $file..."
        
        # Remove the broken API_BASE_URL lines (lines that interrupt imports)
        sed -i '' '/^const API_BASE_URL = process.env.REACT_APP_API_URL/d' "$file"
        sed -i '' '/^\${API_BASE_URL}\`;$/d' "$file"
        
        echo "   ✅ Cleaned $file"
    fi
done

# 2. Now properly add API_BASE_URL after imports in each file
echo ""
echo "2️⃣  Properly adding API_BASE_URL after imports..."

for file in "${files_to_fix[@]}"; do
    if [ -f "$file" ]; then
        echo "🔧 Fixing imports in $file..."
        
        # Find the line number of the last import
        last_import_line=$(grep -n "^import\|^} from" "$file" | tail -1 | cut -d: -f1)
        
        if [ ! -z "$last_import_line" ]; then
            # Check if API_BASE_URL already exists
            if ! grep -q "const API_BASE_URL" "$file"; then
                # Insert API_BASE_URL after the last import line
                sed -i '' "${last_import_line}a\\
\\
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';
" "$file"
                echo "   ✅ Added API_BASE_URL to $file"
            else
                echo "   ✅ API_BASE_URL already exists in $file"
            fi
        else
            echo "   ⚠️  No imports found in $file"
        fi
    fi
done

# 3. Fix any remaining template literal issues
echo ""
echo "3️⃣  Fixing template literal syntax..."

# Fix backtick issues in specific problematic files
if [ -f "src/components/AuthPages.tsx" ]; then
    # Fix the broken line that has `${API_BASE_URL}` instead of proper URL
    sed -i '' 's|`${API_BASE_URL}`|${API_BASE_URL}|g' src/components/AuthPages.tsx
    echo "   ✅ Fixed AuthPages.tsx template literals"
fi

# 4. Test the build
echo ""
echo "4️⃣  Testing build..."
npm run build

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 BUILD FIXED!"
    echo "==============="
    echo "✅ All import issues resolved"
    echo "✅ API_BASE_URL properly added"
    echo "✅ Ready for deployment"
else
    echo ""
    echo "❌ Still having issues. Let's see what's wrong:"
    npm run build 2>&1 | head -10
    echo ""
    echo "💡 Checking specific problematic files:"
    
    # Check if the files have proper syntax now
    for file in src/components/AuthPages.tsx src/components/CreateIncidentModal.tsx src/components/IncidentTimeline.tsx; do
        if [ -f "$file" ]; then
            echo "🔍 Checking $file syntax around line 7:"
            head -10 "$file"
            echo "---"
        fi
    done
fi