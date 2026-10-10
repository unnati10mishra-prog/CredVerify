"""
CredVerify — Cloud Storage & Evidence Service
Abstracted blob storage provider supporting:
1. Microsoft Azure Blob Storage (when AZURE_STORAGE_CONNECTION_STRING is configured)
2. Local Secure Blob Storage with cryptographic expiring SAS (Shared Access Signature) tokens.
Computes tamper-evident SHA-256 hashes and serves secure, expiring viewing links.
"""

import os
import hmac
import uuid
import hashlib
import base64
from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple

AZURE_STORAGE_CONNECTION_STRING = os.getenv("AZURE_STORAGE_CONNECTION_STRING", "").strip()
AZURE_CONTAINER_NAME = os.getenv("AZURE_STORAGE_CONTAINER_NAME", "credential-evidence").strip()
STORAGE_SECRET_KEY = os.getenv("JWT_SECRET", "credverify-blob-storage-secret-key")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:5000").rstrip("/")

EVIDENCE_DIR = os.path.join(os.path.dirname(__file__), "evidence_files")
os.makedirs(EVIDENCE_DIR, exist_ok=True)


def _generate_local_sas_token(file_id: str, expiry_minutes: int = 60) -> str:
    """Generates an HMAC-signed time-limited SAS token for viewing evidence."""
    expires_at = int((datetime.utcnow() + timedelta(minutes=expiry_minutes)).timestamp())
    payload = f"{file_id}:{expires_at}"
    sig = hmac.new(STORAGE_SECRET_KEY.encode(), payload.encode(), hashlib.sha256).hexdigest()[:32]
    token_str = f"{payload}:{sig}"
    return base64.urlsafe_b64encode(token_str.encode()).decode()


def verify_local_sas_token(token: str) -> Optional[Tuple[str, int]]:
    """Verifies the SAS token and returns (file_id, expires_at) if valid and not expired."""
    try:
        raw = base64.urlsafe_b64decode(token.encode()).decode()
        parts = raw.split(":")
        if len(parts) != 3:
            return None
        file_id, expires_at_str, sig = parts
        expires_at = int(expires_at_str)

        # Check expiration
        if int(datetime.utcnow().timestamp()) > expires_at:
            return None

        # Check signature
        expected_payload = f"{file_id}:{expires_at_str}"
        expected_sig = hmac.new(STORAGE_SECRET_KEY.encode(), expected_payload.encode(), hashlib.sha256).hexdigest()[:32]
        if not hmac.compare_digest(sig, expected_sig):
            return None

        return file_id, expires_at
    except Exception:
        return None


def upload_evidence_file(
    credential_id: str,
    file_bytes: bytes,
    original_filename: str,
    content_type: str,
) -> Dict:
    """
    Computes SHA-256 tamper-evident hash and uploads evidence.
    Uses Azure Blob Storage if configured, otherwise uses local secure storage.
    """
    file_hash = hashlib.sha256(file_bytes).hexdigest()
    safe_name = os.path.basename(original_filename)
    unique_key = f"{credential_id}_{uuid.uuid4().hex[:8]}_{safe_name}"

    # Check for Azure Blob Storage configuration
    if AZURE_STORAGE_CONNECTION_STRING and "placeholder" not in AZURE_STORAGE_CONNECTION_STRING.lower():
        try:
            from azure.storage.blob import BlobServiceClient, generate_blob_sas, BlobSasPermissions
            blob_service = BlobServiceClient.from_connection_string(AZURE_STORAGE_CONNECTION_STRING)
            container_client = blob_service.get_container_client(AZURE_CONTAINER_NAME)
            if not container_client.exists():
                container_client.create_container()

            blob_client = container_client.get_blob_client(unique_key)
            blob_client.upload_blob(file_bytes, overwrite=True, content_type=content_type)

            # Generate expiring Azure SAS URL (1 hour validity)
            sas_token = generate_blob_sas(
                account_name=blob_service.account_name,
                container_name=AZURE_CONTAINER_NAME,
                blob_name=unique_key,
                account_key=blob_service.credential.account_key,
                permission=BlobSasPermissions(read=True),
                expiry=datetime.utcnow() + timedelta(hours=1),
            )
            blob_url = f"{blob_client.url}?{sas_token}"

            return {
                "storage_provider": "AZURE_BLOB_STORAGE",
                "storage_key": unique_key,
                "file_hash": file_hash,
                "file_name": safe_name,
                "file_size": len(file_bytes),
                "content_type": content_type,
                "view_url": blob_url,
                "is_cloud": True,
            }
        except Exception as e:
            # Fallback to local storage if Azure credentials fail
            pass

    # Local Secure Storage Provider
    file_path = os.path.join(EVIDENCE_DIR, unique_key)
    with open(file_path, "wb") as f:
        f.write(file_bytes)

    sas_token = _generate_local_sas_token(unique_key, expiry_minutes=60)
    view_url = f"{API_BASE_URL}/api/evidence/download/{sas_token}"

    return {
        "storage_provider": "LOCAL_BLOB_SIMULATOR",
        "storage_key": unique_key,
        "file_hash": file_hash,
        "file_name": safe_name,
        "file_size": len(file_bytes),
        "content_type": content_type,
        "view_url": view_url,
        "is_cloud": False,
    }


def get_fresh_view_url(storage_key: str, expiry_minutes: int = 60) -> str:
    """Generates a fresh, expiring SAS token URL for an existing stored evidence document."""
    if AZURE_STORAGE_CONNECTION_STRING and "placeholder" not in AZURE_STORAGE_CONNECTION_STRING.lower():
        try:
            from azure.storage.blob import BlobServiceClient, generate_blob_sas, BlobSasPermissions
            blob_service = BlobServiceClient.from_connection_string(AZURE_STORAGE_CONNECTION_STRING)
            sas_token = generate_blob_sas(
                account_name=blob_service.account_name,
                container_name=AZURE_CONTAINER_NAME,
                blob_name=storage_key,
                account_key=blob_service.credential.account_key,
                permission=BlobSasPermissions(read=True),
                expiry=datetime.utcnow() + timedelta(minutes=expiry_minutes),
            )
            container_client = blob_service.get_container_client(AZURE_CONTAINER_NAME)
            blob_client = container_client.get_blob_client(storage_key)
            return f"{blob_client.url}?{sas_token}"
        except Exception:
            pass

    sas_token = _generate_local_sas_token(storage_key, expiry_minutes=expiry_minutes)
    return f"{API_BASE_URL}/api/evidence/download/{sas_token}"


def get_local_file_path(file_id: str) -> Optional[str]:
    """Retrieves absolute file path for a locally stored file ID, verifying file existence."""
    path = os.path.join(EVIDENCE_DIR, file_id)
    if os.path.exists(path) and os.path.isfile(path):
        return path
    return None
