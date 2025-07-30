"""Merge migration heads

Revision ID: 4a0e7974dec9
Revises: 003_add_oauth_support, 7221dbb4dcce
Create Date: 2025-07-30 18:21:46.238664

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4a0e7974dec9'
down_revision: Union[str, Sequence[str], None] = ('003_add_oauth_support', '7221dbb4dcce')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
