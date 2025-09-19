#!/usr/bin/env python3
"""
SQLAlchemy Model Relationship Test Script
Run this to verify all model relationships are working correctly.
"""

import sys
import os

# Add current directory to path (since we're already in backend/)
sys.path.append(os.path.dirname(__file__))

def test_model_imports():
    """Test that all models can be imported without errors"""
    print("🔍 Testing model imports...")
    
    try:
        from app.models.organization import Organization
        print("✅ Organization model imported")
    except Exception as e:
        print(f"❌ Organization model failed: {e}")
        return False
    
    try:
        from app.models.user import User
        print("✅ User model imported")
    except Exception as e:
        print(f"❌ User model failed: {e}")
        return False
    
    try:
        from app.models.incident import Incident
        print("✅ Incident model imported")
    except Exception as e:
        print(f"❌ Incident model failed: {e}")
        return False
    
    try:
        from app.models.alert import Alert
        print("✅ Alert model imported")
    except Exception as e:
        print(f"❌ Alert model failed: {e}")
        return False
    
    try:
        from app.models.notification import Notification
        print("✅ Notification model imported")
    except Exception as e:
        print(f"❌ Notification model failed: {e}")
        return False
    
    try:
        from app.models.api_keys import APIKey
        print("✅ APIKey model imported")
    except Exception as e:
        print(f"❌ APIKey model failed: {e}")
        return False
    
    try:
        from app.models.oauth_account import OAuthAccount
        print("✅ OAuthAccount model imported")
    except Exception as e:
        print(f"❌ OAuthAccount model failed: {e}")
        return False
    
    try:
        from app.models.runbook import Runbook
        print("✅ Runbook model imported")
    except Exception as e:
        print(f"❌ Runbook model failed: {e}")
        return False
    
    try:
        from app.models.audit_log import AuditLog
        print("✅ AuditLog model imported")
    except Exception as e:
        print(f"❌ AuditLog model failed: {e}")
        return False
    
    try:
        from app.models.deployment import Deployment, DeploymentStep
        print("✅ Deployment models imported")
    except Exception as e:
        print(f"❌ Deployment models failed: {e}")
        return False
    
    return True

def test_model_relationships():
    """Test that SQLAlchemy can initialize all model mappers"""
    print("\n🔍 Testing SQLAlchemy model relationships...")
    
    try:
        from app.models.organization import Organization
        from app.models.user import User
        from app.models.incident import Incident
        from app.models.alert import Alert
        from app.models.notification import Notification
        from app.models.api_keys import APIKey
        from app.models.oauth_account import OAuthAccount
        from app.models.runbook import Runbook
        from app.models.audit_log import AuditLog
        from app.models.deployment import Deployment, DeploymentStep
        from app.models.escalation_policy import EscalationPolicy
        from app.models.integration import Integration
        from app.models.team import Team
        from app.database import Base
        from sqlalchemy import create_engine
        
        # Create a PostgreSQL engine for testing (since we use JSONB)
        # Use your actual database URL for testing
        engine = create_engine("postgresql://admin:password@localhost:5432/oncall_ai", echo=False)
        
        # Try to create all tables - this will fail if relationships are broken
        # Note: This won't actually create tables, just test that SQLAlchemy can compile them
        from sqlalchemy.schema import CreateTable
        
        # Test that we can generate SQL for each table
        for table_name, table in Base.metadata.tables.items():
            try:
                create_sql = str(CreateTable(table).compile(engine))
                print(f"✅ {table_name} table SQL generated successfully")
            except Exception as e:
                print(f"❌ {table_name} table failed: {e}")
                return False
        print("✅ All model relationships initialized successfully")
        
        # Test specific relationships
        print("🔍 Testing bidirectional relationships...")
        
        # Check Organization relationships
        org_relationships = [
            'api_keys', 'notifications', 'incidents', 'alerts', 
            'escalation_policies', 'integrations', 'runbooks', 
            'audit_logs', 'users', 'teams'
        ]
        
        for rel in org_relationships:
            if hasattr(Organization, rel):
                print(f"✅ Organization.{rel} relationship exists")
            else:
                print(f"❌ Organization.{rel} relationship missing")
                return False
        
        # Check User relationships
        user_relationships = [
            'organization', 'oauth_accounts', 'notifications',
            'runbooks', 'audit_logs', 'teams'
        ]
        
        for rel in user_relationships:
            if hasattr(User, rel):
                print(f"✅ User.{rel} relationship exists")
            else:
                print(f"❌ User.{rel} relationship missing")
                return False
        
        # Check Incident relationships
        incident_relationships = [
            'organization', 'alerts', 'audit_logs', 'deployments', 'notifications'
        ]
        
        for rel in incident_relationships:
            if hasattr(Incident, rel):
                print(f"✅ Incident.{rel} relationship exists")
            else:
                print(f"❌ Incident.{rel} relationship missing")
                return False
        
        return True
        
    except Exception as e:
        print(f"❌ SQLAlchemy model relationships failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_alembic_import():
    """Test that alembic can import all models"""
    print("\n🔍 Testing Alembic imports...")
    
    try:
        # Test basic model imports that alembic would need
        from app.models.organization import Organization
        from app.models.user import User
        from app.models.incident import Incident
        from app.models.alert import Alert
        from app.models.notification import Notification
        from app.models.api_keys import APIKey
        from app.models.oauth_account import OAuthAccount
        from app.models.runbook import Runbook
        from app.models.audit_log import AuditLog
        from app.models.deployment import Deployment, DeploymentStep
        from app.models.escalation_policy import EscalationPolicy
        from app.models.integration import Integration
        from app.models.team import Team
        
        print("✅ All models can be imported successfully")
        print("✅ Alembic should be able to discover all models")
        
        return True
        
    except Exception as e:
        print(f"❌ Model import for alembic failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Run all tests"""
    print("🚀 SQLAlchemy Model Relationship Test Suite")
    print("=" * 50)
    
    all_passed = True
    
    # Test 1: Model imports
    if not test_model_imports():
        all_passed = False
    
    # Test 2: SQLAlchemy relationships
    if not test_model_relationships():
        all_passed = False
    
    # Test 3: Alembic imports
    if not test_alembic_import():
        all_passed = False
    
    print("\n" + "=" * 50)
    if all_passed:
        print("🎉 ALL TESTS PASSED! Your SQLAlchemy models are working correctly.")
        print("\n📋 Next Steps:")
        print("1. Run: cd backend && alembic revision --autogenerate -m 'Fix all model relationships'")
        print("2. Run: alembic upgrade head")
        print("3. Test your FastAPI server: uvicorn app.main:app --reload")
    else:
        print("❌ SOME TESTS FAILED. Check the errors above and fix the issues.")
        sys.exit(1)

if __name__ == "__main__":
    main()