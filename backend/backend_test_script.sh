#!/bin/bash
echo "🚀 OnCall AI Backend Complete Test Script"

BASE_URL="http://localhost:8000"
EMAIL="test$(date +%s)@example.com"  # Unique email each run
PASSWORD="TestPassword123!"

echo "📋 Testing with email: $EMAIL"

# Test 1: Health Check
echo -e "\n1️⃣ Health Check:"
curl -s "$BASE_URL/health" | jq '.' || echo "❌ Failed"

# Test 2: Root Endpoint
echo -e "\n2️⃣ Root Endpoint:"
curl -s "$BASE_URL/" | jq '.' || echo "❌ Failed"

# Test 3: Database Test
echo -e "\n3️⃣ Database Test:"
curl -s "$BASE_URL/test-db" | jq '.' || echo "❌ Failed"

# Test 4: OAuth Providers
echo -e "\n4️⃣ OAuth Providers:"
curl -s "$BASE_URL/api/v1/oauth/providers" | jq '.' || echo "❌ Failed"

# Test 5: User Registration
echo -e "\n5️⃣ User Registration:"
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/auth/register" \
     -H "Content-Type: application/json" \
     -d "{
       \"email\": \"$EMAIL\",
       \"password\": \"$PASSWORD\",
       \"full_name\": \"Test User\",
       \"organization_name\": \"Test Organization\"
     }")

echo "$REGISTER_RESPONSE" | jq '.'

# Extract token from registration
TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.access_token // empty')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo "❌ Registration failed, trying login instead..."
    
    # Test 6: User Login (if registration failed)
    echo -e "\n6️⃣ User Login:"
    LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" \
         -H "Content-Type: application/json" \
         -d "{
           \"email\": \"test@example.com\",
           \"password\": \"$PASSWORD\"
         }")
    
    echo "$LOGIN_RESPONSE" | jq '.'
    TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.access_token // empty')
else
    echo "✅ Registration successful!"
fi

if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
    echo "✅ Got auth token: ${TOKEN:0:20}..."
    
    # Test 7: Get Current User
    echo -e "\n7️⃣ Get Current User:"
    curl -s -X GET "$BASE_URL/api/v1/auth/me" \
         -H "Authorization: Bearer $TOKEN" | jq '.' || echo "❌ Failed"
    
    # Test 8: Create Incident
    echo -e "\n8️⃣ Create Incident:"
    INCIDENT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/incidents/" \
         -H "Authorization: Bearer $TOKEN" \
         -H "Content-Type: application/json" \
         -d '{
           "title": "Test Database Connection Issue",
           "description": "Testing incident creation from API",
           "severity": "high",
           "status": "open"
         }')
    
    echo "$INCIDENT_RESPONSE" | jq '.'
    
    # Test 9: List Incidents
    echo -e "\n9️⃣ List Incidents:"
    curl -s -X GET "$BASE_URL/api/v1/incidents/" \
         -H "Authorization: Bearer $TOKEN" | jq '.' || echo "❌ Failed"
    
    # Test 10: AI Provider Status
    echo -e "\n🔟 AI Provider Status:"
    curl -s -X GET "$BASE_URL/api/v1/ai/providers/status" \
         -H "Authorization: Bearer $TOKEN" | jq '.' || echo "❌ Failed"
    
    # Test 11: OAuth Authorization URL
    echo -e "\n1️⃣1️⃣ OAuth Google Authorization:"
    curl -s "$BASE_URL/api/v1/oauth/authorize/google?redirect_uri=http://localhost:3000/auth/oauth/callback" | jq '.' || echo "❌ Failed"
    
else
    echo "❌ No auth token available - skipping authenticated tests"
fi

echo -e "\n🎉 Backend testing complete!"
echo "📝 Summary:"
echo "   - Health endpoints: Should all return 200"
echo "   - Auth flow: Registration or login should work"
echo "   - OAuth: Providers should be listed"
echo "   - Incidents: CRUD operations should work"
echo "   - AI: Provider status should return"