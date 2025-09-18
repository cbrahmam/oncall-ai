# backend/app/api/v1/endpoints/__init__.py - FIXED: Added users import
# This file needs to be updated to include the users module

# Core endpoints that should always be available
from . import auth, billing

# Additional endpoints with graceful import handling
try:
    from . import users
except ImportError as e:
    print(f"⚠️ Users endpoints not available: {e}")
    users = None

try:
    from . import incidents
except ImportError as e:
    print(f"⚠️ Incidents endpoints not available: {e}")
    incidents = None

try:
    from . import webhooks
except ImportError as e:
    print(f"⚠️ Webhooks endpoints not available: {e}")
    webhooks = None

try:
    from . import teams
except ImportError as e:
    print(f"⚠️ Teams endpoints not available: {e}")
    teams = None

try:
    from . import slack
except ImportError as e:
    print(f"⚠️ Slack endpoints not available: {e}")
    slack = None

try:
    from . import ai
except ImportError as e:
    print(f"⚠️ AI endpoints not available: {e}")
    ai = None

try:
    from . import integrations
except ImportError as e:
    print(f"⚠️ Integrations endpoints not available: {e}")
    integrations = None

try:
    from . import oauth
except ImportError as e:
    print(f"⚠️ OAuth endpoints not available: {e}")
    oauth = None

try:
    from . import security
except ImportError as e:
    print(f"⚠️ Security endpoints not available: {e}")
    security = None

try:
    from . import notifications
except ImportError as e:
    print(f"⚠️ Notifications endpoints not available: {e}")
    notifications = None

# Export all available modules
__all__ = ['auth', 'billing']

# Add optional modules if they loaded successfully
if users:
    __all__.append('users')
if incidents:
    __all__.append('incidents')
if webhooks:
    __all__.append('webhooks')
if teams:
    __all__.append('teams')
if slack:
    __all__.append('slack')
if ai:
    __all__.append('ai')
if integrations:
    __all__.append('integrations')
if oauth:
    __all__.append('oauth')
if security:
    __all__.append('security')
if notifications:
    __all__.append('notifications')