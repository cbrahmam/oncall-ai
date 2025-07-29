# backend/alembic/versions/add_security_tables.py
"""Add enterprise security tables

Revision ID: security_001
Revises: [current_revision]
Create Date: 2025-01-29

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = 'security_001'
down_revision = None  # Replace with your current latest revision
branch_labels = None
depends_on = None

def upgrade():
    """Add security and GDPR compliance tables"""
    
    # User consent management table
    op.create_table(
        'user_consents',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('purpose', sa.String(50), nullable=False),
        sa.Column('consent_status', sa.String(20), nullable=False),
        sa.Column('timestamp', sa.TIMESTAMP(timezone=True), server_default=sa.func.current_timestamp()),
        sa.Column('ip_address', sa.String(45)),
        sa.Column('user_agent', sa.Text),
        sa.Column('metadata', postgresql.JSONB),
        sa.UniqueConstraint('user_id', 'purpose', name='unique_user_purpose_consent')
    )
    
    # Privacy settings table
    op.create_table(
        'user_privacy_settings',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('analytics_consent', sa.Boolean, default=False),
        sa.Column('marketing_consent', sa.Boolean, default=False),
        sa.Column('third_party_sharing', sa.Boolean, default=False),
        sa.Column('data_retention_preference', sa.Interval),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.func.current_timestamp()),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), server_default=sa.func.current_timestamp(), onupdate=sa.func.current_timestamp())
    )
    
    # Security events table
    op.create_table(
        'security_events',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('event_type', sa.String(100), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('ip_address', sa.String(45)),
        sa.Column('user_agent', sa.Text),
        sa.Column('risk_level', sa.String(20), nullable=False),
        sa.Column('details', postgresql.JSONB),
        sa.Column('timestamp', sa.TIMESTAMP(timezone=True), server_default=sa.func.current_timestamp()),
        sa.Column('resolved', sa.Boolean, default=False),
        sa.Column('resolved_at', sa.TIMESTAMP(timezone=True)),
        sa.Column('resolved_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'))
    )
    
    # MFA secrets table (encrypted)
    op.create_table(
        'mfa_secrets',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('encrypted_secret', sa.Text, nullable=False),
        sa.Column('backup_codes', postgresql.JSONB),  # Encrypted backup codes
        sa.Column('enabled', sa.Boolean, default=False),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.func.current_timestamp()),
        sa.Column('last_used', sa.TIMESTAMP(timezone=True))
    )
    
    # User sessions tracking
    op.create_table(
        'user_sessions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('session_token', sa.String(255), nullable=False, unique=True),
        sa.Column('device_fingerprint', sa.String(64)),
        sa.Column('ip_address', sa.String(45)),
        sa.Column('user_agent', sa.Text),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.func.current_timestamp()),
        sa.Column('last_activity', sa.TIMESTAMP(timezone=True), server_default=sa.func.current_timestamp()),
        sa.Column('expires_at', sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column('is_active', sa.Boolean, default=True)
    )
    
    # OAuth2 provider accounts
    op.create_table(
        'oauth_accounts',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('provider', sa.String(50), nullable=False),  # 'google', 'microsoft', 'github'
        sa.Column('provider_user_id', sa.String(255), nullable=False),
        sa.Column('email', sa.String(255)),
        sa.Column('name', sa.String(255)),
        sa.Column('avatar_url', sa.String(500)),
        sa.Column('access_token', sa.Text),  # Encrypted
        sa.Column('refresh_token', sa.Text),  # Encrypted
        sa.Column('expires_at', sa.TIMESTAMP(timezone=True)),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.func.current_timestamp()),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), server_default=sa.func.current_timestamp()),
        sa.UniqueConstraint('provider', 'provider_user_id', name='unique_provider_user')
    )
    
    # GDPR requests tracking
    op.create_table(
        'gdpr_requests',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('request_type', sa.String(50), nullable=False),  # 'deletion', 'portability', 'rectification'
        sa.Column('status', sa.String(20), nullable=False, default='pending'),  # 'pending', 'processing', 'completed', 'failed'
        sa.Column('requested_at', sa.TIMESTAMP(timezone=True), server_default=sa.func.current_timestamp()),
        sa.Column('processed_at', sa.TIMESTAMP(timezone=True)),
        sa.Column('completed_at', sa.TIMESTAMP(timezone=True)),
        sa.Column('request_details', postgresql.JSONB),
        sa.Column('processing_log', postgresql.JSONB),
        sa.Column('verification_token', sa.String(255)),
        sa.Column('ip_address', sa.String(45)),
        sa.Column('user_agent', sa.Text)
    )
    
    # Create indexes for performance
    op.create_index('idx_user_consents_user_id', 'user_consents', ['user_id'])
    op.create_index('idx_security_events_user_id', 'security_events', ['user_id'])
    op.create_index('idx_security_events_timestamp', 'security_events', ['timestamp'])
    op.create_index('idx_security_events_risk_level', 'security_events', ['risk_level'])
    op.create_index('idx_user_sessions_user_id', 'user_sessions', ['user_id'])
    op.create_index('idx_user_sessions_active', 'user_sessions', ['is_active'])
    op.create_index('idx_oauth_accounts_user_id', 'oauth_accounts', ['user_id'])
    op.create_index('idx_gdpr_requests_user_id', 'gdpr_requests', ['user_id'])
    op.create_index('idx_gdpr_requests_status', 'gdpr_requests', ['status'])
    
    # Add MFA enabled column to users table
    op.add_column('users', sa.Column('mfa_enabled', sa.Boolean, default=False))
    op.add_column('users', sa.Column('last_password_change', sa.TIMESTAMP(timezone=True)))
    op.add_column('users', sa.Column('failed_login_attempts', sa.Integer, default=0))
    op.add_column('users', sa.Column('account_locked_until', sa.TIMESTAMP(timezone=True)))

def downgrade():
    """Remove security and GDPR compliance tables"""
    
    # Remove added columns from existing tables
    op.drop_column('users', 'mfa_enabled')
    op.drop_column('users', 'last_password_change')
    op.drop_column('users', 'failed_login_attempts')
    op.drop_column('users', 'account_locked_until')
    
    # Drop tables in reverse order
    op.drop_table('gdpr_requests')
    op.drop_table('oauth_accounts')
    op.drop_table('user_sessions')
    op.drop_table('mfa_secrets')
    op.drop_table('security_events')
    op.drop_table('user_privacy_settings')
    op.drop_table('user_consents')