# CredVerify — Database Design (RDBMS & Azure SQL)

This directory contains the Relational Database Management System (RDBMS) scripts and objects designed to satisfy the **Third Normal Form (3NF)** requirement and the Azure DP-900 / Cloud Security competencies.

## Mandatory SQL Demonstrations
As defined in the project specification:
1. **CREATE TABLE statements:** Included in [`schema.sql`](./schema.sql) with Primary Keys, Foreign Keys, `NOT NULL`, `UNIQUE`, and `CHECK` constraints.
2. **Multi-Table JOIN query:** Screen-facing queries (e.g., joining `Credentials`, `Institutions`, `Programs`, `Revocations`).
3. **Database VIEW:** `vw_PublicVerification` provides a sanitized, privacy-first view that strips sensitive student PII.
4. **Stored Procedure:** `sp_IssueCredential` executes issuance with an explicit transaction.
5. **Database Trigger:** Audit/history trigger for recording revocation events.
6. **Explicit TRANSACTION:** Multi-step atomic state changes guaranteeing ACID compliance.
7. **Indexes:** Performance indexes on `StudentEmail`, `Status`, `VerifiedAt`, and `Timestamp`.

## Entity Relationships (9 Tables)
- `Users` $\leftrightarrow$ `Roles`
- `Users` $\leftrightarrow$ `Institutions`
- `Programs` $\leftrightarrow$ `Institutions`
- `Credentials` $\leftrightarrow$ `Institutions`, `Programs`, `Users`
- `CredentialEvidence` $\leftrightarrow$ `Credentials` (Blob links & SHA-256 hashes)
- `Verifications` $\leftrightarrow$ `Credentials` (Audit log of verifications)
- `Revocations` $\leftrightarrow$ `Credentials`, `Users`
- `AuditLogs` $\leftrightarrow$ `Users` (Append-only security log)
