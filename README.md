# CredVerify — Secure Academic Credential Verification

> **A secure credential lifecycle platform where institutions issue verifiable academic credentials and employers verify or revoke them.**

Prepared for the **Integrated Full-Stack Project** (System Design • RDBMS • DP-900 • Cloud Security).

---

## 📌 Project Overview
Academic certificates are frequently shared as unverified static documents susceptible to tampering and fraud. **CredVerify** provides an end-to-end digital lifecycle:
- **Institution Onboarding & Management:** Controlled issuance with role-based access control.
- **Tamper-Evident Issuance:** Certificates paired with cryptographic hashes and stored evidence.
- **Public / QR Verification:** Instant employer verification without exposing private student PII.
- **Real-Time Revocation:** Immediate invalidation with audit reasoning.
- **Immutable Audit Trail:** Append-only logging for security compliance and forensic accountability.

---

## 📂 Project Architecture & Monorepo Structure

```
CredVerify/
├── frontend/             # Frontend Application (React + Vite + TypeScript + Tailwind CSS)
│   ├── src/              # Components, Pages, Hooks, Context, Services
│   ├── public/           # Static assets and icons
│   └── package.json      # Frontend dependencies
├── backend/              # Backend REST API Service (Modular Monolith)
│   └── README.md         # Backend API specifications and setup
├── database/             # Relational Database Schema & Scripts (Azure SQL / 3NF)
│   ├── schema.sql        # 9 3NF tables, indexes, stored procedure, view, audit trigger
│   └── README.md         # Database documentation & SQL demonstration notes
├── docs/                 # Project Documentation
│   ├── ARCHITECTURE.md   # System architecture, DP-900 cloud mapping & viva guide
│   └── API_CONTRACTS.md  # Detailed API contracts between Frontend and Backend
├── .env.example          # Environment variables template (NO SECRETS)
├── .gitignore            # Multi-tier ignore rules (protects credentials & build artifacts)
└── README.md             # Root documentation
```

---

## 👥 Team Responsibilities & Division of Work

| Member | Domain | Scope Directory | Primary Stack |
| :--- | :--- | :--- | :--- |
| **Frontend Engineer & UI/UX** | User Interface, Design System, Interactions | `frontend/` | React 19, Vite, TypeScript, Tailwind CSS, Lucide React, React Router |
| **Backend & Cloud Engineer** | REST API, Database, Azure Cloud, Analytics | `backend/`, `database/` | Node.js / ASP.NET, Azure SQL, Azure Blob Storage, Power BI |

To avoid merge conflicts, team members work inside their designated top-level folders and coordinate using API contracts in [`docs/API_CONTRACTS.md`](docs/API_CONTRACTS.md).

---

## 🌿 Git Branching Strategy & Workflow

1. **`main`**: Production-ready, stable codebase.
2. **`dev`**: Main integration branch for active development.
3. **Feature Branches:**
   - Frontend features: `feature/fe-<feature-name>` (e.g., `feature/fe-public-verify`, `feature/fe-issuer-dashboard`)
   - Backend features: `feature/be-<feature-name>` (e.g., `feature/be-auth-api`, `feature/be-azure-storage`)
4. **Pull Requests:** Open PRs from feature branches targeting `dev`. Test integration before merging to `main`.

---

## 🚀 Quickstart Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (v20+ recommended)
- Git

### 1. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
The frontend will start at `http://localhost:5173`.

### 2. Backend Setup
```bash
cd backend
# Follow setup instructions in backend/README.md
```

### 3. Database Setup
Execute [`database/schema.sql`](database/schema.sql) in your Azure SQL Database or local SQL Server instance.

---

## 🔒 Security Best Practices
- **No Secrets in Git:** Never commit `.env` files, connection strings, or private keys. Use `.env.example` as a template.
- **Privacy-First Design:** Public verification endpoints never return student PII (email, phone, address).
- **Server-Side Validation:** All form inputs and files are validated on the backend.
