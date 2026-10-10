# CredVerify — System Architecture & Design Documentation

## 1. Executive Summary
**CredVerify** is a secure, verifiable academic credential lifecycle platform designed for the Integrated Full-Stack Project curriculum. It addresses the growing issue of fraudulent certificates by providing a single source of truth for universities to issue credentials and verifiers to authenticate them without compromising student data privacy.

---

## 2. High-Level Architecture

```
[Users / Clients]
        │
        ▼
[Frontend: React + Vite + TS + Tailwind CSS] (D:\Credverify\frontend)
        │
        ▼ (HTTPS REST API / JSON)
[Backend: Modular Monolith API] (D:\Credverify\backend)
        ├── Authentication & RBAC Middleware
        ├── Credential Lifecycle Service
        ├── Storage Service (Blob Upload & Hashing)
        └── Append-Only Audit Service
        │
        ├─────────────────────────────┬─────────────────────────────┐
        ▼                             ▼                             ▼
[Azure SQL Database]        [Azure Blob Storage]             [Power BI / Analytics]
 (3NF Relational DB)      (Evidence PDFs & Documents)     (Issuance & Verification Trends)
```

---

## 3. Team Responsibilities & Boundaries

| Member | Focus Area | Directory Scope | Primary Technologies |
| :--- | :--- | :--- | :--- |
| **Member 1 (You)** | Frontend & UI/UX | `frontend/` | React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, React Router |
| **Member 2 (Teammate)** | Backend, Cloud, DB & Analytics | `backend/`, `database/` | Node.js / ASP.NET, Azure SQL, Azure Blob Storage, Power BI |

---

## 4. Cloud & Data Design (DP-900 Mapping)
1. **Relational Source of Truth (Azure SQL):** Stores 9 3NF relational tables managing users, credentials, programs, institutions, revocations, and audit logs.
2. **Unstructured Evidence Storage (Azure Blob Storage):** Document certificates and transcripts are kept in Blob Storage. SQL stores only metadata, access URLs, and tamper-evident SHA-256 hashes.
3. **Analytics (Power BI):** Connects to Azure SQL views to display issuance trends, verification success/failure rates, and suspicious query spikes.
4. **Secret Protection:** Secrets, passwords, and connection strings are managed via `.env` (local) and Azure Key Vault (production), never committed to Git.

---

## 5. Security & Privacy Highlights
- **No PII on Public Verification:** Public lookups return only minimal verification badges (Institution, Program, Degree, Status, Date) without revealing personal contact details.
- **Role-Based Access Control (RBAC):** Server-side enforcement for 4 roles: `STUDENT`, `ISSUER`, `VERIFIER`, `ADMIN`.
- **Append-Only Audit Trail:** Administrative and state actions are immutably logged for forensic accountability.
- **SQL Transactions:** Credential issuance and revocations use explicit multi-step SQL transactions to prevent partial writes.
