# CredVerify — API Contracts Specification

This document defines the formal request/response contract between the **Frontend (React)** and **Backend (REST API)** to enable independent parallel development.

---

## 1. Authentication (`/api/auth`)

### `POST /api/auth/login`
- **Access:** Public
- **Request Body:**
  ```json
  {
    "email": "staff@university.edu",
    "password": "SecurePassword123!"
  }
  ```
- **Success Response (`200 OK`):**
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "fullName": "Dr. Sarah Jenkins",
      "email": "staff@university.edu",
      "role": "ISSUER",
      "institutionId": 10,
      "institutionName": "Apex Institute of Technology"
    }
  }
  ```
- **Error Response (`401 Unauthorized`):**
  ```json
  {
    "error": "Invalid credentials"
  }
  ```

---

## 2. Public Verification (`/api/verify`)

### `GET /api/verify/:credentialId`
- **Access:** Public (No authorization header required)
- **Security Rule:** **Never return student personal contact information (email, phone, home address) on this public endpoint.**
- **Success Response (`200 OK`):**
  ```json
  {
    "credentialId": "CRED-2026-9812A",
    "status": "ACTIVE",
    "studentName": "A. Sharma",
    "programName": "Bachelor of Technology in Computer Science",
    "degreeType": "Undergraduate",
    "institutionName": "Apex Institute of Technology",
    "issueDate": "2026-05-15",
    "verifiedAt": "2026-10-10T09:00:00Z"
  }
  ```
- **Revoked Credential Response (`200 OK`):**
  ```json
  {
    "credentialId": "CRED-2026-4410X",
    "status": "REVOKED",
    "studentName": "R. Patel",
    "programName": "Diploma in Information Technology",
    "institutionName": "Apex Institute of Technology",
    "issueDate": "2025-06-20",
    "revokedAt": "2026-02-14T11:20:00Z",
    "revocationReason": "Academic integrity violation: falsified examination records."
  }
  ```
- **Not Found Response (`404 Not Found`):**
  ```json
  {
    "error": "Credential not found in registry"
  }
  ```

---

## 3. Credential Management (`/api/credentials`)

### `GET /api/credentials`
- **Access:** Bearer Token (Role: `ISSUER` or `ADMIN`)
- **Query Params:** `page=1&limit=10&status=ACTIVE&search=computer`
- **Success Response (`200 OK`):**
  ```json
  {
    "items": [
      {
        "credentialId": "CRED-2026-9812A",
        "studentName": "Aditi Sharma",
        "studentEmail": "aditi@example.com",
        "programName": "B.Tech Computer Science",
        "status": "ACTIVE",
        "issueDate": "2026-05-15",
        "hasEvidence": true
      }
    ],
    "total": 45,
    "page": 1,
    "limit": 10
  }
  ```

### `POST /api/credentials`
- **Access:** Bearer Token (Role: `ISSUER`)
- **Request Body:**
  ```json
  {
    "studentName": "Aditi Sharma",
    "studentEmail": "aditi@example.com",
    "programId": 3,
    "issueDate": "2026-05-15"
  }
  ```
- **Success Response (`201 Created`):**
  ```json
  {
    "credentialId": "CRED-2026-9812A",
    "status": "ACTIVE",
    "verificationUrl": "https://credverify.app/verify/CRED-2026-9812A",
    "qrCode": "data:image/png;base64,..."
  }
  ```

---

## 4. Evidence Storage (`/api/evidence`)

### `POST /api/evidence`
- **Access:** Bearer Token (Role: `ISSUER`)
- **Request Format:** `multipart/form-data`
  - `file`: PDF or Image file (max 10MB)
  - `credentialId`: `"CRED-2026-9812A"`
- **Success Response (`201 Created`):**
  ```json
  {
    "evidenceId": 104,
    "credentialId": "CRED-2026-9812A",
    "fileName": "degree_certificate_official.pdf",
    "blobUrl": "https://credverifystorage.blob.core.windows.net/credential-evidence/uuid.pdf",
    "fileHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "uploadedAt": "2026-10-10T09:05:00Z"
  }
  ```

---

## 5. Revocation (`/api/credentials/:id/revoke`)

### `POST /api/credentials/:id/revoke`
- **Access:** Bearer Token (Role: `ISSUER` or `ADMIN`)
- **Request Body:**
  ```json
  {
    "reason": "Administrative correction: Duplicate issuance."
  }
  ```
- **Success Response (`200 OK`):**
  ```json
  {
    "success": true,
    "credentialId": "CRED-2026-9812A",
    "status": "REVOKED",
    "revokedAt": "2026-10-10T09:10:00Z",
    "reason": "Administrative correction: Duplicate issuance."
  }
  ```

---

## 6. Audit Trail (`/api/audit`)

### `GET /api/audit`
- **Access:** Bearer Token (Role: `ADMIN`)
- **Query Params:** `limit=50&action=CREDENTIAL_REVOKED`
- **Success Response (`200 OK`):**
  ```json
  {
    "logs": [
      {
        "auditId": 501,
        "actor": "Dr. Sarah Jenkins",
        "action": "CREDENTIAL_REVOKED",
        "entityType": "Credential",
        "entityId": "CRED-2026-9812A",
        "details": "Revocation submitted with reason: Duplicate issuance.",
        "ipAddress": "192.168.1.1",
        "timestamp": "2026-10-10T09:10:00Z"
      }
    ],
    "total": 120
  }
  ```
