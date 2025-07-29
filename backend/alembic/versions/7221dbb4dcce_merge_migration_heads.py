"""Merge migration heads

Revision ID: 7221dbb4dcce
Revises: 86a710deadaa, security_001
Create Date: 2025-07-29 15:23:47.585199

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7221dbb4dcce'
down_revision: Union[str, Sequence[str], None] = ('86a710deadaa', 'security_001')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
