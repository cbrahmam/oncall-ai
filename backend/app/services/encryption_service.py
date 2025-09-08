# backend/app/services/encryption_service.py - NEW FILE
import os
import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import logging

logger = logging.getLogger(__name__)

class EncryptionService:
    """Service for encrypting/decrypting API keys securely"""
    
    @staticmethod
    def _get_encryption_key() -> bytes:
        """Generate encryption key from environment variable"""
        # Get encryption password from environment
        password = os.getenv("API_KEY_ENCRYPTION_PASSWORD", "default-dev-password-change-in-prod")
        salt = os.getenv("API_KEY_ENCRYPTION_SALT", "default-salt-change-in-prod").encode()
        
        # Derive key from password
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(password.encode()))
        return key
    
    @staticmethod
    def encrypt_api_key(api_key: str) -> str:
        """Encrypt an API key for secure storage"""
        try:
            key = EncryptionService._get_encryption_key()
            fernet = Fernet(key)
            encrypted_key = fernet.encrypt(api_key.encode())
            return base64.urlsafe_b64encode(encrypted_key).decode()
        except Exception as e:
            logger.error(f"Failed to encrypt API key: {e}")
            raise ValueError("Failed to encrypt API key")
    
    @staticmethod
    def decrypt_api_key(encrypted_key: str) -> str:
        """Decrypt an API key for use"""
        try:
            key = EncryptionService._get_encryption_key()
            fernet = Fernet(key)
            encrypted_data = base64.urlsafe_b64decode(encrypted_key.encode())
            decrypted_key = fernet.decrypt(encrypted_data)
            return decrypted_key.decode()
        except Exception as e:
            logger.error(f"Failed to decrypt API key: {e}")
            raise ValueError("Failed to decrypt API key")