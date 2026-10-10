"""
CredVerify — Asymmetric Cryptographic Signature Service
Implements University Keypairs using ECDSA SECP256R1 (NIST P-256) with SHA-256.
Allows institutions to digitally sign issued academic credentials with private keys,
and verifiers to mathematically prove authenticity using the institution's public key.
"""

import json
import hashlib
from typing import Dict, Tuple, Optional
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.backends import default_backend


def generate_institution_keypair() -> Tuple[str, str, str]:
    """
    Generates a new ECDSA SECP256R1 keypair for an academic institution.
    Returns:
        (private_key_pem, public_key_pem, key_fingerprint)
    """
    private_key = ec.generate_private_key(ec.SECP256R1(), default_backend())
    public_key = private_key.public_key()

    # Serialize private key to PEM
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode("utf-8")

    # Serialize public key to PEM
    public_pem = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    ).decode("utf-8")

    # Compute key fingerprint (SHA-256 of DER-encoded public key)
    public_der = public_key.public_bytes(
        encoding=serialization.Encoding.DER,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    fingerprint_hash = hashlib.sha256(public_der).hexdigest()
    fingerprint = f"SHA256:{':'.join(fingerprint_hash[i:i+2] for i in range(0, 16, 2))}"

    return private_pem, public_pem, fingerprint


def canonicalize_credential_payload(payload: Dict) -> bytes:
    """
    Produces deterministic, sorted canonical bytes of credential attributes
    to ensure reproducible cryptographic hashing across environments.
    """
    canonical_dict = {
        "credential_id": str(payload.get("credential_id", "")).strip().upper(),
        "institution_id": int(payload.get("institution_id", 0)),
        "program_id": int(payload.get("program_id", 0)),
        "student_name": str(payload.get("student_name", "")).strip(),
        "student_email": str(payload.get("student_email", "")).strip().lower(),
        "issue_date": str(payload.get("issue_date", "")).strip(),
        "evidence_hash": str(payload.get("evidence_hash", "")).strip().lower(),
    }
    canonical_json = json.dumps(canonical_dict, sort_keys=True, separators=(",", ":"))
    return canonical_json.encode("utf-8")


def sign_credential(private_key_pem: str, payload: Dict) -> Tuple[str, str]:
    """
    Signs the canonical credential payload using ECDSA (SECP256R1) + SHA-256.
    Returns:
        (signature_hex, payload_digest_hex)
    """
    private_key = serialization.load_pem_private_key(
        private_key_pem.encode("utf-8"),
        password=None,
        backend=default_backend(),
    )
    canonical_bytes = canonicalize_credential_payload(payload)
    payload_digest = hashlib.sha256(canonical_bytes).hexdigest()

    signature = private_key.sign(
        canonical_bytes,
        ec.ECDSA(hashes.SHA256()),
    )
    return signature.hex(), payload_digest


def verify_credential_signature(public_key_pem: str, payload: Dict, signature_hex: str) -> bool:
    """
    Mathematically verifies that the credential was signed by the holder of the private key.
    """
    try:
        public_key = serialization.load_pem_public_key(
            public_key_pem.encode("utf-8"),
            backend=default_backend(),
        )
        canonical_bytes = canonicalize_credential_payload(payload)
        signature = bytes.fromhex(signature_hex)

        public_key.verify(
            signature,
            canonical_bytes,
            ec.ECDSA(hashes.SHA256()),
        )
        return True
    except Exception:
        return False
