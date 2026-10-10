# CredVerify — Backend Service

This directory is dedicated to the backend API service for **CredVerify**.

## Responsibilities & Ownership
- **Owner:** Teammate (Backend & Cloud Infrastructure)
- **Role:** Handles business logic, authentication, RBAC authorization, Azure SQL database interactions, Azure Blob Storage uploads, and audit logging.

## Recommended Tech Stack
- **Runtime:** Node.js (Express / Fastify) OR ASP.NET Core Web API / Python (FastAPI)
- **Database ORM/Query:** Parameterized SQL queries / Prisma / Drizzle / Entity Framework
- **Azure Integration:** `@azure/storage-blob` (or equivalent SDK) for evidence uploads

## Core API Endpoints to Implement
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Authenticate user (PBKDF2/bcrypt) & return JWT token |
| `GET` | `/api/verify/:credentialId` | Public verification lookup (minimal data, no private student PII) |
| `GET` | `/api/credentials` | List credentials with search/filter (Issuer/Admin only) |
| `POST` | `/api/credentials` | Issue new credential (protected by explicit SQL transaction) |
| `POST` | `/api/evidence` | Upload evidence file to Azure Blob Storage & record file hash |
| `POST` | `/api/credentials/:id/revoke` | Revoke credential with reason and audit timestamp |
| `GET` | `/api/audit` | Retrieve append-only audit trail (Admin only) |

## Development Setup
1. Copy `.env.example` from the root directory to `.env` in this directory.
2. Ensure database migrations/scripts in `database/schema.sql` are executed.
3. Start the API server on `http://localhost:5000`.

Refer to [docs/API_CONTRACTS.md](../docs/API_CONTRACTS.md) for request/response payloads.
