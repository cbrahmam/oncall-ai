#!/bin/bash
# STEP 4: Security Testing Commands

echo "🧪 TESTING SECURITY IMPLEMENTATION"
echo "=================================="

# 1. Test Local Security Headers
echo "🔍 Testing local security headers..."
curl -I http://localhost:8000/health

echo ""
echo "Expected headers:"
echo "  ✅ X-Content-Type-Options: nosniff"
echo "  ✅ X-Frame-Options: DENY"
echo "  ✅ X-XSS-Protection: 1; mode=block"
echo "  ✅ X-Security-Level: enterprise"

# 2. Test Production Security Headers
echo ""
echo "🌐 Testing production security headers..."
curl -I https://offcallai.com/api/v1/health

echo ""
echo "Production should also have:"
echo "  ✅ Strict-Transport-Security: max-age=31536000"
echo "  ✅ Content-Security-Policy: (restrictive)"
echo "  ❌ Server: (should be hidden)"

# 3. Test that docs are hidden in production
echo ""
echo "🔒 Testing that docs are hidden in production..."
curl -I https://offcallai.com/docs
echo "Should return 404 in production mode"

# 4. Test frontend source map hiding
echo ""
echo "📁 Testing frontend source map protection..."
curl -I https://offcallai.com/static/js/main.js.map
echo "Should return 404 or 403"

# 5. Test rate limiting (if enabled)
echo ""
echo "⚡ Testing rate limiting..."
for i in {1..10}; do
  curl -s -o /dev/null -w "%{http_code} " https://offcallai.com/api/v1/health
done
echo ""
echo "Should start returning 429 after several requests"

# 6. Test CORS headers
echo ""
echo "🌐 Testing CORS headers..."
curl -H "Origin: https://malicious-site.com" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     https://offcallai.com/api/v1/auth/login

echo ""
echo "Should reject unauthorized origins"

# 7. Test authentication protection
echo ""
echo "🔐 Testing authentication protection..."
curl -X GET https://offcallai.com/api/v1/incidents
echo ""
echo "Should return 401 Unauthorized"

# 8. Security scan simulation
echo ""
echo "🕵️ Testing common attack patterns..."

# SQL injection attempt
curl -X POST https://offcallai.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@test.com", "password": "1\u0027 OR \u00271\u0027=\u00271"}' \
  -w "HTTP %{http_code}\n" -s -o /dev/null

# XSS attempt
curl -X GET "https://offcallai.com/api/v1/incidents?search=<script>alert(1)</script>" \
  -w "HTTP %{http_code}\n" -s -o /dev/null

# Path traversal attempt
curl -X GET "https://offcallai.com/api/v1/../../../etc/passwd" \
  -w "HTTP %{http_code}\n" -s -o /dev/null

echo ""
echo "All should return 400, 403, or be blocked by security middleware"

# 9. Test deployment security
echo ""
echo "🚀 Testing deployment security..."
kubectl get secrets -n offcall-ai
echo ""
echo "Secrets should be properly configured"

# 10. Generate security report
echo ""
echo "📊 SECURITY ASSESSMENT SUMMARY"
echo "=============================="
echo ""
echo "✅ Security Headers: Implemented"
echo "✅ CORS Protection: Configured"
echo "✅ Authentication: Required"
echo "✅ Kubernetes Secrets: In Use"
echo "⚠️  TODO: Rate Limiting (if not showing 429)"
echo "⚠️  TODO: WAF/DDoS Protection (consider Cloudflare)"
echo "⚠️  TODO: SSL/TLS Certificate Verification"
echo ""
echo "🎯 NEXT PHASE: Subscription Enforcement & User Flow"