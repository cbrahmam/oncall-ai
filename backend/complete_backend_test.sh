#!/bin/bash
echo "🧪 OnCall AI Complete Backend Test (Fixed Version)"

BASE_URL="http://localhost:8000"
EMAIL="test$(date +%s)@example.com"
PASSWORD="TestPassword123!"

echo "📋 Testing with email: $EMAIL"

# Test 1: Register and get token
echo -e "\n1️⃣ User Registration:"
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/auth/register" \
     -H "Content-Type: application/json" \
     -d "{
       \"email\": \"$EMAIL\",
       \"password\": \"$PASSWORD\",
       \"full_name\": \"Test User\",
       \"organization_name\": \"Test Organization\"
     }")

echo "$REGISTER_RESPONSE" | jq '.'
TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.access_token // empty')

if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
    echo "✅ Got auth token: ${TOKEN:0:20}..."
    
    # Test 2: OAuth Providers
    echo -e "\n2️⃣ OAuth Providers:"
    curl -s "$BASE_URL/api/v1/oauth/providers" | jq '.'
    
    # Test 3: OAuth Authorization URL
    echo -e "\n3️⃣ OAuth Authorization (Google):"
    curl -s "$BASE_URL/api/v1/oauth/authorize/google?redirect_uri=http://localhost:3000/auth/oauth/callback" | jq '.'
    
    # Test 4: Create Incident (with real token)
    echo -e "\n4️⃣ Create Incident:"
    INCIDENT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/incidents/" \
         -H "Authorization: Bearer $TOKEN" \
         -H "Content-Type: application/json" \
         -d '{
           "title": "Test Database Connection Issue",
           "description": "Testing incident creation with real token",
           "severity": "high",
           "status": "open"
         }')
    
    echo "$INCIDENT_RESPONSE" | jq '.'
    
    # Test 5: List Incidents
    echo -e "\n5️⃣ List Incidents:"
    curl -s -X GET "$BASE_URL/api/v1/incidents/" \
         -H "Authorization: Bearer $TOKEN" | jq '.'
    
    # Test 6: AI Provider Status
    echo -e "\n6️⃣ AI Provider Status:"
    curl -s -X GET "$BASE_URL/api/v1/ai/providers/status" \
         -H "Authorization: Bearer $TOKEN" | jq '.'
    
    # Test 7: Get Current User OAuth Accounts
    echo -e "\n7️⃣ User OAuth Accounts:"
    curl -s -X GET "$BASE_URL/api/v1/oauth/accounts" \no
         -H "Authorization: Bearer $TOKEN" | jq '.'
    
    # Test 8: Health Check
    echo -e "\n8️⃣ Health Check:"
    curl -s "$BASE_URL/health" | jq '.'
    
    # Test 9: Database Test
    echo -e "\n9️⃣ Database Test:"
    curl -s "$BASE_URL/test-db" | jq '.'
    
else
    echo "❌ No auth token available - registration failed"
fi

echo -e "\n🎉 Complete backend testing finished!"
echo "📝 Summary:"
echo "   - All endpoints should return proper responses"
echo "   - OAuth providers should be listed"
echo "   - Incident creation should work with real token"
echo "   - AI and OAuth endpoints should be accessible"