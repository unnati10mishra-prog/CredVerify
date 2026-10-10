# CredVerify — Production Readiness Analysis & Roadmap

> **Current Architecture:** React 19 + TypeScript + Tailwind CSS (Frontend) | FastAPI (Python Backend) | SQLite (Dev DB) / Azure SQL (Target 3NF Production DB)

This roadmap outlines the journey from the current functional prototype to a scalable, production-grade academic credential issuance and verification platform.

---

## 🗺️ Roadmap Pillars

### 1. Authentication & Onboarding (Crucial for Real Users)
* **Current Status:** ✅ **Completed**
  * **Self-Serve Student Registration:** Graduate sign-up flow (`POST /api/auth/register-student`) linking student profile to their issued credentials with instant JWT login and welcome email.
  * **University / College Onboarding Workflow:** Institutions apply (`POST /api/auth/apply-institution`), trigger compliance confirmation emails, and appear in the SysAdmin Vetting Console.
  * **Admin Vetting & Accreditation:** SysAdmins review pending applications (`GET /api/admin/institution-applications`), approve or reject them with audit logging, and activate accredited issuing authorities.
  * **Staff Delegation & Token Invitations:** Institution registrars can invite faculty/colleagues (`POST /api/institution/invite-staff`), dispatching secure tokens via email (`/register?invite={token}`) to activate issuer accounts.
  * **Frontend Interfaces:** Dedicated [`RegisterPage.tsx`](../frontend/src/pages/auth/RegisterPage.tsx), real credential sign-in on [`LoginPage.tsx`](../frontend/src/pages/auth/LoginPage.tsx), Staff Management Modal on [`InstitutionDashboard.tsx`](../frontend/src/pages/institution/InstitutionDashboard.tsx), and Vetting Console on [`AdminAuditPage.tsx`](../frontend/src/pages/admin/AdminAuditPage.tsx).

---

### 2. Dynamic Student Wallet
* **Current Status:** ✅ **Completed**
  * Backend route `GET /api/student/credentials` queries SQLite/SQL database filtering by the student's authenticated JWT email.
  * `StudentWalletPage.tsx` dynamically renders all credentials issued to the student, providing live verification links, tamper-evident SHA-256 hashes, and downloadable verification QR SVGs.
* **Next Iteration:**
  * Support for multi-institution credential portfolios and batch PDF/certificate downloads.

---

### 3. Email Notifications (The "Real-Time" Element)
* **Current Status:** ✅ **Completed**
  * **Asynchronous Dispatch:** Integrated via `FastAPI BackgroundTasks` in `backend/main.py`.
  * **Dedicated Email Service:** Built in [`backend/email_service.py`](../backend/email_service.py) supporting standard SMTP (SendGrid, AWS SES, Resend, Gmail) and fallback development console/in-memory outbox.
  * **Automated Event Triggers:**
    * **Issuance Event:** Dispatches styled HTML & plain-text email with institution name, credential ID, program name, direct verification link, and student wallet link.
    * **Revocation Event:** Dispatches official revocation notice with reason, timestamp, and guidance.
  * **Audit & Preview Console:** Added `GET /api/notifications/emails` and an interactive **Email Outbox & Alerts** inspection tab in the Admin Console (`AdminAuditPage.tsx`).

---

### 4. Cloud Infrastructure & Storage (Moving off SQLite)
* **Current Status:** ✅ **Completed**
  * **Abstracted Storage Provider:** Built [`backend/storage_service.py`](../backend/storage_service.py) with dual-mode storage engine:
    * Native Microsoft **Azure Blob Storage** container support (`AZURE_STORAGE_CONNECTION_STRING`).
    * Cryptographically signed **Local Blob Storage Engine** (`backend/evidence_files/`) with zero cloud lock-in.
  * **Expiring Shared Access Signature (SAS) URLs:** Generates time-limited HMAC-SHA256 signed SAS tokens expiring after 60 minutes for document security.
  * **Streaming Download Gateway:** `GET /api/evidence/download/{token}` validates SAS tokens and streams certified PDFs/transcripts with `Content-Disposition: inline`.
  * **Direct Evidence Ingestion:** `POST /api/evidence` computes SHA-256 tamper-evident hashes, stores files in blob storage, and binds the hash into the university's cryptographic signature.
  * **Multi-Page Inspection:** Integrated into [`VerifyPage.tsx`](../frontend/src/pages/public/VerifyPage.tsx), [`StudentWalletPage.tsx`](../frontend/src/pages/student/StudentWalletPage.tsx), and [`InstitutionDashboard.tsx`](../frontend/src/pages/institution/InstitutionDashboard.tsx).

---

### 5. Security & Verification Hardening
* **Current Status:** ✅ **Completed**
  * **Asymmetric Cryptographic Signatures (University Keypairs):**
    * Implemented in [`backend/crypto_service.py`](../backend/crypto_service.py) using industry-standard **ECDSA SECP256R1 (NIST P-256) with SHA-256** (W3C Verifiable Credentials standard).
    * Each accredited institution has a unique asymmetric keypair stored in `Institutions (PublicKeyPem, PrivateKeyPem, KeyFingerprint)`.
    * On issuance, canonical credential attributes and evidence hash are deterministically signed with the university's private key.
    * Verification mathematically proves authenticity against the institution's registered public key, returning signer name, key fingerprint (`SHA256:...`), and algorithm.
  * **Sliding-Window Rate Limiting Middleware:**
    * Implemented in [`backend/rate_limiter.py`](../backend/rate_limiter.py) protecting sensitive routes:
      * `/api/auth/login`: max 15 requests/minute per client IP (brute-force defense).
      * `/api/verify`: max 60 requests/minute per client IP (bot scraping mitigation).
    * Automatically injects standard RFC headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`) and returns HTTP 429 with `Retry-After`.
  * **Relational Audit Trail & 3NF Alignment:**
    * Created `CredentialSignatures` table in SQLite and [`database/schema.sql`](../database/schema.sql) for Azure SQL.

---

### 6. Deployment & DevOps Strategy
* **Frontend:** Deploy React Vite application to **Azure Static Web Apps**, **Vercel**, or **Cloudflare Pages** (global CDN distribution, automated SSL).
* **Backend API:** Containerize with Docker and deploy to **Azure App Service**, **Azure Container Apps**, or **Render**.
* **Domain & DNS:** Custom domain configuration (`credverify.edu` or `credverify.com`) with strict HTTPS/HSTS enforcement.
* **CI/CD:** GitHub Actions workflows for automated linting, test suites, and zero-downtime deployment.
