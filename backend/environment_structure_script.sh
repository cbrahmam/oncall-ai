#!/bin/bash
# STEP 3: Clean Environment Structure

echo "🔧 SETTING UP PROPER ENVIRONMENT STRUCTURE"
echo "==========================================="

cd backend

# 1. CLEAN UP EXISTING FILES
echo "🧹 Cleaning up environment files..."
rm -f .env.backup .env.production .env.local 2>/dev/null || true

# 2. CREATE DEVELOPMENT ENVIRONMENT (for local work)
echo "💻 Creating .env.development..."
cat > .env.development << 'EOF'
# ===========================================
# DEVELOPMENT ENVIRONMENT
# ===========================================

# Core Settings
ENVIRONMENT=development
DEBUG=true

# Database (Local Docker)
DATABASE_URL=postgresql://admin:password@localhost:5432/oncall_ai
REDIS_URL=redis://localhost:6379

# Security (Development - weaker for convenience)
SECRET_KEY=dev-secret-key-change-in-production
JWT_SECRET=dev-jwt-secret-change-in-production
ENCRYPTION_KEY=dev-encryption-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_DAYS=7

# Frontend (Local)
FRONTEND_URL=http://localhost:3000
CORS_ORIGINS=["http://localhost:3000", "http://localhost:5173"]

# OAuth (Development - use test apps)
GOOGLE_CLIENT_ID=your-dev-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-dev-google-client-secret
MICROSOFT_CLIENT_ID=your-dev-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-dev-microsoft-client-secret
GITHUB_CLIENT_ID=your-dev-github-client-id
GITHUB_CLIENT_SECRET=your-dev-github-client-secret

# AI Services (Empty - users bring their own)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GEMINI_API_KEY=

# External Services (Development)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
SLACK_BOT_TOKEN=
SLACK_SIGNING_SECRET=
SENDGRID_API_KEY=
FROM_EMAIL=dev@offcall-ai.com

# Stripe (Test keys)
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_ID_PRO=price_test_...
STRIPE_PRICE_ID_PLUS=price_test_...

# Webhook Security
WEBHOOK_SECRET=dev-webhook-secret
EOF

# 3. CREATE PRODUCTION ENVIRONMENT TEMPLATE
echo "🏭 Creating .env.production.template..."
cat > .env.production.template << 'EOF'
# ===========================================
# PRODUCTION ENVIRONMENT TEMPLATE
# ===========================================
# 
# 🚨 NEVER COMMIT THIS FILE WITH REAL VALUES!
# Copy to .env.production and fill with real values
# or use Kubernetes secrets (recommended)
#

# Core Settings
ENVIRONMENT=production
DEBUG=false

# Database (Use your Kubernetes secrets values)
DATABASE_URL=postgresql://dbadmin:REAL_PASSWORD@4.152.201.171:5432/offcall_ai
REDIS_URL=rediss://:REAL_PASSWORD@offcall-ai-compliance-redis.redis.cache.windows.net:6380/0

# Security (Use strong secrets from Kubernetes)
SECRET_KEY=REAL_SECRET_FROM_KUBERNETES
JWT_SECRET=REAL_JWT_SECRET_FROM_KUBERNETES
ENCRYPTION_KEY=REAL_ENCRYPTION_KEY_FROM_KUBERNETES
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_DAYS=1

# Frontend (Production URLs)
FRONTEND_URL=https://offcallai.com
CORS_ORIGINS=["https://offcallai.com", "https://app.offcallai.com"]

# OAuth (Production apps)
GOOGLE_CLIENT_ID=your-prod-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-prod-google-client-secret
MICROSOFT_CLIENT_ID=your-prod-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-prod-microsoft-client-secret
GITHUB_CLIENT_ID=your-prod-github-client-id
GITHUB_CLIENT_SECRET=your-prod-github-client-secret

# AI Services (Empty - users bring their own)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GEMINI_API_KEY=

# External Services (Production)
TWILIO_ACCOUNT_SID=REAL_TWILIO_SID
TWILIO_AUTH_TOKEN=REAL_TWILIO_TOKEN
TWILIO_PHONE_NUMBER=REAL_TWILIO_PHONE
SLACK_BOT_TOKEN=REAL_SLACK_TOKEN
SLACK_SIGNING_SECRET=REAL_SLACK_SECRET
SENDGRID_API_KEY=REAL_SENDGRID_KEY
FROM_EMAIL=alerts@offcallai.com

# Stripe (Production)
STRIPE_PUBLISHABLE_KEY=pk_live_51S4Mb11mRLVuW9Gl9YKGm6z9ChBMUuDnHaqLGHQneoQPhlWD893h92VtzeNTQ4Z2eRHoQtxiBD9wbhBdw2rJcBYX00g1a1ethX
STRIPE_SECRET_KEY=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
STRIPE_PRICE_ID_PRO=price_1S4NgY1mRLVuW9GlQhGX0hQ4
STRIPE_PRICE_ID_PLUS=price_1S4NhX1mRLVuW9GldnHIVs9q

# Webhook Security
WEBHOOK_SECRET=REAL_WEBHOOK_SECRET
EOF

# 4. UPDATE .gitignore
echo "🔒 Updating .gitignore..."
cat >> .gitignore << 'EOF'

# Environment files (security)
.env
.env.local
.env.production
.env.*.local
*.env

# Secrets and keys
*.key
*.pem
secrets/
config/production.json

# Kubernetes
k8s-secrets.yaml
EOF

# 5. CREATE CURRENT .env (symlink to development)
echo "🔗 Setting up current .env for development..."
ln -sf .env.development .env

# 6. SECURE FILE PERMISSIONS
echo "🔒 Setting secure file permissions..."
chmod 600 .env.development 2>/dev/null || true
chmod 600 .env.production.template 2>/dev/null || true
chmod 600 .env 2>/dev/null || true

echo ""
echo "✅ ENVIRONMENT STRUCTURE COMPLETE!"
echo ""
echo "📁 File Structure:"
echo "   .env              -> symlink to .env.development"
echo "   .env.development  -> for local development"
echo "   .env.production.template -> template for production"
echo ""
echo "🔧 What to do next:"
echo "   1. Use .env.development for local work"
echo "   2. Production uses Kubernetes secrets (already set up)"
echo "   3. Never commit .env.production with real values"
echo ""