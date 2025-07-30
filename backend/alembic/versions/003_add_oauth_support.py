"""Add OAuth support

Revision ID: 003_add_oauth_support
Revises: 86a710deadaa
Create Date: 2025-07-30 18:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '003_add_oauth_support'
down_revision = '86a710deadaa'  # Points to your enterprise security tables
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Create enum for OAuth providers
    oauth_provider_enum = postgresql.ENUM(
        'google', 'microsoft', 'github', 'slack',
        name='oauthprovider',
        create_type=False
    )
    oauth_provider_enum.create(op.get_bind(), checkfirst=True)
    
    # Create oauth_accounts table
    op.create_table(
        'oauth_accounts',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        
        # OAuth Provider Info
        sa.Column('provider', oauth_provider_enum, nullable=False),
        sa.Column('provider_user_id', sa.String(255), nullable=False),
        sa.Column('provider_username', sa.String(255), nullable=True),
        
        # OAuth Tokens (encrypted)
        sa.Column('access_token', sa.Text, nullable=True),
        sa.Column('refresh_token', sa.Text, nullable=True),
        sa.Column('token_expires_at', sa.DateTime(timezone=True), nullable=True),
        
        # Profile Info from Provider
        sa.Column('provider_email', sa.String(255), nullable=True),
        sa.Column('provider_name', sa.String(255), nullable=True),
        sa.Column('provider_avatar', sa.String(500), nullable=True),
        
        # Account Status
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('is_primary', sa.Boolean, default=False),
        
        # Metadata
        sa.Column('provider_data', postgresql.JSONB, default={}),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('last_used_at', sa.DateTime(timezone=True), nullable=True),
    )
    
    # Create unique constraint: one account per provider per user
    op.create_unique_constraint(
        'uq_oauth_accounts_user_provider',
        'oauth_accounts',
        ['user_id', 'provider']
    )
    
    # Create unique constraint: one provider account across all users
    op.create_unique_constraint(
        'uq_oauth_accounts_provider_user_id',
        'oauth_accounts',
        ['provider', 'provider_user_id']
    )
    
    # Add indexes for performance
    op.create_index('idx_oauth_accounts_user_id', 'oauth_accounts', ['user_id'])
    op.create_index('idx_oauth_accounts_provider', 'oauth_accounts', ['provider'])
    op.create_index('idx_oauth_accounts_active', 'oauth_accounts', ['is_active'])
    
    # Modify users table to allow NULL password_hash for OAuth-only users
    try:
        op.alter_column('users', 'password_hash', nullable=True)
    except Exception as e:
        print(f"Note: Could not modify users.password_hash column: {e}")

def downgrade() -> None:
    # Drop indexes
    op.drop_index('idx_oauth_accounts_active', 'oauth_accounts')
    op.drop_index('idx_oauth_accounts_provider', 'oauth_accounts')
    op.drop_index('idx_oauth_accounts_user_id', 'oauth_accounts')
    
    # Drop constraints
    op.drop_constraint('uq_oauth_accounts_provider_user_id', 'oauth_accounts', type_='unique')
    op.drop_constraint('uq_oauth_accounts_user_provider', 'oauth_accounts', type_='unique')
    
    # Drop table
    op.drop_table('oauth_accounts')
    
    # Drop enum
    oauth_provider_enum = postgresql.ENUM(name='oauthprovider')
    oauth_provider_enum.drop(op.get_bind(), checkfirst=True)