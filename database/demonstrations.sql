-- ==============================================================================
-- CredVerify - Database Demonstration & Evaluation Scripts
-- Prepared for Integrated Full-Stack Capstone Project Viva / Evaluation
--
-- This script contains 6 live query demonstrations directly mapped to the
-- College Project Planning Guide Rubric:
-- 1. Complex Multi-Table Relational JOIN (Pillars 1 & 5)
-- 2. Secured Database View Query (vw_PublicVerification - PII Redaction)
-- 3. Stored Procedure with Explicit Transaction & Error Handling (sp_IssueCredential)
-- 4. Mandatory Database Trigger Verification (trg_AuditCredentialStatusChange)
-- 5. Query Optimization & Index Explain Plan Analysis
-- 6. Institutional Aggregate Analytics & RBAC Verification
-- ==============================================================================

USE CredVerifyDB; -- For Azure SQL / SQL Server (or sqlite3 credverify.db for local)
GO

-- ==============================================================================
-- DEMONSTRATION 1: COMPLEX MULTI-TABLE RELATIONAL JOIN
-- Rubric: Relational integrity across 3NF entities
-- Joins: Credentials, Institutions, Programs, Revocations, Evidence, and Signatures
-- ==============================================================================
SELECT 
    c.CredentialId,
    c.StudentName,
    c.StudentEmail,
    c.Status AS CredentialStatus,
    c.IssueDate,
    i.Name AS IssuingInstitution,
    i.Domain AS InstitutionDomain,
    p.Name AS ProgramName,
    p.DegreeType,
    cs.Algorithm AS CryptographicAlgorithm,
    cs.KeyFingerprint,
    cs.SignedAt AS CryptographicSignatureTimestamp,
    ce.FileName AS EvidenceDocumentName,
    ce.FileHash AS EvidenceSHA256Hash,
    COALESCE(r.Reason, 'N/A - Good Standing') AS InvalidationReason,
    r.RevokedAt
FROM Credentials c
INNER JOIN Institutions i 
    ON c.InstitutionId = i.InstitutionId
INNER JOIN Programs p 
    ON c.ProgramId = p.ProgramId
LEFT JOIN CredentialSignatures cs 
    ON c.CredentialId = cs.CredentialId
LEFT JOIN CredentialEvidence ce 
    ON c.CredentialId = ce.CredentialId
LEFT JOIN Revocations r 
    ON c.CredentialId = r.CredentialId
ORDER BY c.IssueDate DESC;
GO


-- ==============================================================================
-- DEMONSTRATION 2: SECURED DATABASE VIEW QUERY (vw_PublicVerification)
-- Rubric: "One view for a combined, secured reporting or public lookup requirement"
-- Demonstrates: Exposing public academic credentials while masking sensitive PII (emails/internal IDs)
-- ==============================================================================
SELECT 
    CredentialId,
    Status,
    IssueDate,
    ProgramName,
    DegreeType,
    InstitutionName,
    RevocationReason,
    RevokedAt
FROM vw_PublicVerification
WHERE CredentialId = 'CRED-2026-CS101';
GO


-- ==============================================================================
-- DEMONSTRATION 3: STORED PROCEDURE WITH EXPLICIT ATOMIC TRANSACTION
-- Rubric: "One stored procedure for a controlled create/update/status-change action"
-- Demonstrates: ACID properties, BEGIN TRANSACTION, COMMIT, and automated audit logging
-- ==============================================================================
DECLARE @NewCredId NVARCHAR(64) = 'CRED-2026-TEST-' + SUBSTRING(CONVERT(VARCHAR(36), NEWID()), 1, 6);

PRINT 'Executing Stored Procedure sp_IssueCredential with atomic transaction...';

EXEC sp_IssueCredential
    @CredentialId = @NewCredId,
    @InstitutionId = 1,
    @ProgramId = 1,
    @StudentName = 'Vikramaditya Roy',
    @StudentEmail = 'vikram.roy@apex.edu',
    @IssuerUserId = 1,
    @IssueDate = '2026-06-01';

-- Verify immediate insertion in Credentials table
SELECT CredentialId, StudentName, Status, IssueDate 
FROM Credentials 
WHERE CredentialId = @NewCredId;

-- Verify immediate insertion in AuditLogs table
SELECT TOP 1 AuditId, ActorUserId, Action, EntityId, Details, Timestamp 
FROM AuditLogs 
WHERE EntityId = @NewCredId 
ORDER BY Timestamp DESC;
GO


-- ==============================================================================
-- DEMONSTRATION 4: MANDATORY DATABASE TRIGGER VERIFICATION
-- Rubric: "One trigger for a controlled audit/history action"
-- Demonstrates: Firing of trg_AuditCredentialStatusChange upon status change
-- ==============================================================================

-- Step 1: Note current audit log count
DECLARE @PreCount INT;
SELECT @PreCount = COUNT(*) FROM AuditLogs;
PRINT 'AuditLogs record count before status update: ' + CAST(@PreCount AS VARCHAR(10));

-- Step 2: Update status of a credential to trigger the automated database trigger
UPDATE Credentials
SET Status = 'SUSPENDED'
WHERE CredentialId = 'CRED-2026-CS101';

-- Step 3: Query AuditLogs to prove the trigger executed automatically
SELECT TOP 3 
    AuditId,
    ActorUserId,
    Action,
    EntityType,
    EntityId,
    Details,
    Timestamp
FROM AuditLogs
WHERE EntityId = 'CRED-2026-CS101'
ORDER BY Timestamp DESC;

-- Step 4: Revert status back to ACTIVE (Trigger fires again for audit history!)
UPDATE Credentials
SET Status = 'ACTIVE'
WHERE CredentialId = 'CRED-2026-CS101';

SELECT TOP 1 
    Action AS LastTriggerAction, 
    Details AS LastAuditDetails, 
    Timestamp 
FROM AuditLogs 
WHERE EntityId = 'CRED-2026-CS101' 
ORDER BY Timestamp DESC;
GO


-- ==============================================================================
-- DEMONSTRATION 5: INDEX PERFORMANCE & EXPLAIN PLAN
-- Rubric: Indexes for performance on lookup keys (CredentialId, StudentEmail, Status)
-- Demonstrates: Index Seek vs Table Scan execution
-- ==============================================================================
SET SHOWPLAN_TEXT ON;
GO

-- 5a. Lookup by Primary Key (Clustered Index Seek)
SELECT * FROM Credentials WHERE CredentialId = 'CRED-2026-CS101';
GO

-- 5b. Lookup by Non-Clustered Indexed Column (IX_Credentials_Status Index Seek)
SELECT CredentialId, StudentName, IssueDate 
FROM Credentials 
WHERE Status = 'ACTIVE';
GO

-- 5c. Audit Log Recent Timestamp Index Seek (IX_AuditLogs_Timestamp)
SELECT TOP 20 * 
FROM AuditLogs 
ORDER BY Timestamp DESC;
GO

SET SHOWPLAN_TEXT OFF;
GO


-- ==============================================================================
-- DEMONSTRATION 6: INSTITUTIONAL AUDIT & RBAC ANALYTICS
-- Rubric: Analytical reporting query for institutional administrators
-- ==============================================================================
SELECT 
    i.Name AS InstitutionName,
    p.DegreeType,
    COUNT(c.CredentialId) AS TotalIssued,
    SUM(CASE WHEN c.Status = 'ACTIVE' THEN 1 ELSE 0 END) AS ActiveCredentials,
    SUM(CASE WHEN c.Status = 'REVOKED' THEN 1 ELSE 0 END) AS RevokedCredentials,
    (
        SELECT COUNT(*) 
        FROM Users u 
        WHERE u.InstitutionId = i.InstitutionId AND u.IsActive = 1
    ) AS ActiveStaffMembers,
    (
        SELECT COUNT(*) 
        FROM Verifications v 
        INNER JOIN Credentials c2 ON v.CredentialId = c2.CredentialId 
        WHERE c2.InstitutionId = i.InstitutionId
    ) AS TotalPublicVerificationChecks
FROM Institutions i
INNER JOIN Programs p ON i.InstitutionId = p.InstitutionId
LEFT JOIN Credentials c ON p.ProgramId = c.ProgramId
GROUP BY i.InstitutionId, i.Name, p.DegreeType
ORDER BY TotalIssued DESC;
GO
