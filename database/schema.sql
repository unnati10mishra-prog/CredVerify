-- ==============================================================================
-- CredVerify - Database Schema (Azure SQL Database / Microsoft SQL Server)
-- Third Normal Form (3NF) compliant relational schema with RBAC and audit trail.
-- Prepared for Integrated Full-Stack Project - College Submission
-- ==============================================================================

-- 1. ROLES TABLE
CREATE TABLE Roles (
    RoleId INT IDENTITY(1,1) PRIMARY KEY,
    RoleName VARCHAR(50) NOT NULL UNIQUE,
    Description NVARCHAR(255) NULL,
    CreatedAt DATETIME2 DEFAULT SYSUTCDATETIME()
);

-- 2. INSTITUTIONS TABLE
CREATE TABLE Institutions (
    InstitutionId INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(200) NOT NULL,
    Code VARCHAR(50) NOT NULL UNIQUE,
    Domain NVARCHAR(100) NULL,
    ContactEmail NVARCHAR(100) NOT NULL,
    IsVerified BIT NOT NULL DEFAULT 1,
    PublicKeyPem NVARCHAR(MAX) NULL,     -- ECDSA SECP256R1 Public Key (PEM format)
    PrivateKeyPem NVARCHAR(MAX) NULL,    -- Asymmetric Institutional Private Key
    KeyFingerprint VARCHAR(100) NULL,    -- SHA-256 Public Key Fingerprint
    CreatedAt DATETIME2 DEFAULT SYSUTCDATETIME()
);

-- 3. USERS TABLE
CREATE TABLE Users (
    UserId INT IDENTITY(1,1) PRIMARY KEY,
    InstitutionId INT NULL,
    RoleId INT NOT NULL,
    FullName NVARCHAR(150) NOT NULL,
    Email NVARCHAR(150) NOT NULL UNIQUE,
    PasswordHash NVARCHAR(255) NOT NULL,
    Salt NVARCHAR(100) NOT NULL,
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIME2 DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_Users_Institutions FOREIGN KEY (InstitutionId) REFERENCES Institutions(InstitutionId),
    CONSTRAINT FK_Users_Roles FOREIGN KEY (RoleId) REFERENCES Roles(RoleId)
);

-- 4. PROGRAMS TABLE
CREATE TABLE Programs (
    ProgramId INT IDENTITY(1,1) PRIMARY KEY,
    InstitutionId INT NOT NULL,
    Name NVARCHAR(200) NOT NULL,
    Code VARCHAR(50) NOT NULL,
    DegreeType VARCHAR(50) NOT NULL,
    CreatedAt DATETIME2 DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_Programs_Institutions FOREIGN KEY (InstitutionId) REFERENCES Institutions(InstitutionId),
    CONSTRAINT UQ_Institution_ProgramCode UNIQUE (InstitutionId, Code)
);

-- 5. CREDENTIALS TABLE
CREATE TABLE Credentials (
    CredentialId NVARCHAR(64) PRIMARY KEY, -- Unique cryptographic or UUID identifier
    InstitutionId INT NOT NULL,
    ProgramId INT NOT NULL,
    StudentName NVARCHAR(150) NOT NULL,
    StudentEmail NVARCHAR(150) NOT NULL,
    IssuerUserId INT NOT NULL,
    IssueDate DATE NOT NULL,
    Status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'REVOKED', 'SUSPENDED'
    QrCodeHash NVARCHAR(128) NULL,
    CreatedAt DATETIME2 DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2 DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_Credentials_Institutions FOREIGN KEY (InstitutionId) REFERENCES Institutions(InstitutionId),
    CONSTRAINT FK_Credentials_Programs FOREIGN KEY (ProgramId) REFERENCES Programs(ProgramId),
    CONSTRAINT FK_Credentials_Users FOREIGN KEY (IssuerUserId) REFERENCES Users(UserId),
    CONSTRAINT CHK_Credential_Status CHECK (Status IN ('ACTIVE', 'REVOKED', 'SUSPENDED'))
);

-- 6. CREDENTIAL EVIDENCE TABLE (Azure Blob Storage References)
CREATE TABLE CredentialEvidence (
    EvidenceId INT IDENTITY(1,1) PRIMARY KEY,
    CredentialId NVARCHAR(64) NOT NULL,
    BlobUrl NVARCHAR(500) NOT NULL,
    FileName NVARCHAR(255) NOT NULL,
    FileHash CHAR(64) NOT NULL, -- SHA-256 tamper-evident hash
    ContentType VARCHAR(100) NOT NULL,
    UploadedAt DATETIME2 DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_CredentialEvidence_Credentials FOREIGN KEY (CredentialId) REFERENCES Credentials(CredentialId) ON DELETE CASCADE
);

-- 6b. CREDENTIAL SIGNATURES TABLE (Asymmetric ECDSA / University Keypairs)
CREATE TABLE CredentialSignatures (
    SignatureId INT IDENTITY(1,1) PRIMARY KEY,
    CredentialId NVARCHAR(64) NOT NULL UNIQUE,
    InstitutionId INT NOT NULL,
    Algorithm VARCHAR(50) NOT NULL DEFAULT 'ECDSA-SECP256R1-SHA256',
    PublicKeyPem NVARCHAR(MAX) NOT NULL,
    KeyFingerprint VARCHAR(100) NOT NULL,
    SignatureHex VARCHAR(512) NOT NULL,
    PayloadDigest CHAR(64) NOT NULL,
    SignedAt DATETIME2 DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_CredentialSignatures_Credentials FOREIGN KEY (CredentialId) REFERENCES Credentials(CredentialId) ON DELETE CASCADE,
    CONSTRAINT FK_CredentialSignatures_Institutions FOREIGN KEY (InstitutionId) REFERENCES Institutions(InstitutionId)
);

-- 7. VERIFICATIONS TABLE (Public / Employer verification events)
CREATE TABLE Verifications (
    VerificationId BIGINT IDENTITY(1,1) PRIMARY KEY,
    CredentialId NVARCHAR(64) NOT NULL,
    Result VARCHAR(20) NOT NULL, -- 'VERIFIED', 'REVOKED', 'NOT_FOUND'
    VerifierIpHash VARCHAR(64) NULL, -- Hashed IP for anomaly detection without violating privacy
    UserAgent NVARCHAR(255) NULL,
    VerifiedAt DATETIME2 DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_Verifications_Credentials FOREIGN KEY (CredentialId) REFERENCES Credentials(CredentialId)
);

-- 8. REVOCATIONS TABLE
CREATE TABLE Revocations (
    RevocationId INT IDENTITY(1,1) PRIMARY KEY,
    CredentialId NVARCHAR(64) NOT NULL UNIQUE,
    RevokedByUserId INT NOT NULL,
    Reason NVARCHAR(500) NOT NULL,
    PreviousStatus VARCHAR(20) NOT NULL,
    RevokedAt DATETIME2 DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_Revocations_Credentials FOREIGN KEY (CredentialId) REFERENCES Credentials(CredentialId),
    CONSTRAINT FK_Revocations_Users FOREIGN KEY (RevokedByUserId) REFERENCES Users(UserId)
);

-- 9. AUDIT LOGS TABLE (Append-Only)
CREATE TABLE AuditLogs (
    AuditId BIGINT IDENTITY(1,1) PRIMARY KEY,
    ActorUserId INT NULL,
    Action NVARCHAR(100) NOT NULL,
    EntityType VARCHAR(50) NOT NULL,
    EntityId NVARCHAR(64) NOT NULL,
    Details NVARCHAR(MAX) NULL,
    IpAddress VARCHAR(45) NULL,
    Timestamp DATETIME2 DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_AuditLogs_Users FOREIGN KEY (ActorUserId) REFERENCES Users(UserId)
);

-- ==============================================================================
-- INDEXES FOR PERFORMANCE & SEARCH SPEED
-- ==============================================================================
CREATE NONCLUSTERED INDEX IX_Credentials_StudentEmail ON Credentials(StudentEmail);
CREATE NONCLUSTERED INDEX IX_Credentials_Status ON Credentials(Status);
CREATE NONCLUSTERED INDEX IX_Verifications_CredentialId_VerifiedAt ON Verifications(CredentialId, VerifiedAt);
CREATE NONCLUSTERED INDEX IX_AuditLogs_Timestamp ON AuditLogs(Timestamp DESC);

-- ==============================================================================
-- SAMPLE STORED PROCEDURE: IssueCredential (Demonstrating Explicit SQL Transaction)
-- ==============================================================================
GO
CREATE PROCEDURE sp_IssueCredential
    @CredentialId NVARCHAR(64),
    @InstitutionId INT,
    @ProgramId INT,
    @StudentName NVARCHAR(150),
    @StudentEmail NVARCHAR(150),
    @IssuerUserId INT,
    @IssueDate DATE
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;
    BEGIN TRY
        INSERT INTO Credentials (CredentialId, InstitutionId, ProgramId, StudentName, StudentEmail, IssuerUserId, IssueDate, Status)
        VALUES (@CredentialId, @InstitutionId, @ProgramId, @StudentName, @StudentEmail, @IssuerUserId, @IssueDate, 'ACTIVE');

        INSERT INTO AuditLogs (ActorUserId, Action, EntityType, EntityId, Details)
        VALUES (@IssuerUserId, 'CREDENTIAL_ISSUED', 'Credential', @CredentialId, CONCAT('Credential issued to: ', @StudentName));

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

-- ==============================================================================
-- SAMPLE DATABASE VIEW: vw_PublicVerification
-- (Strictly excludes sensitive student PII per security specification)
-- ==============================================================================
GO
CREATE VIEW vw_PublicVerification AS
SELECT 
    c.CredentialId,
    c.Status,
    c.IssueDate,
    p.Name AS ProgramName,
    p.DegreeType,
    i.Name AS InstitutionName,
    r.Reason AS RevocationReason,
    r.RevokedAt
FROM Credentials c
INNER JOIN Institutions i ON c.InstitutionId = i.InstitutionId
INNER JOIN Programs p ON c.ProgramId = p.ProgramId
LEFT JOIN Revocations r ON c.CredentialId = r.CredentialId;
GO

-- ------------------------------------------------------------------------------
-- Table 10: InstitutionApplications (Onboarding & Vetting Workflow)
-- ------------------------------------------------------------------------------
CREATE TABLE InstitutionApplications (
    ApplicationId     INT IDENTITY(1,1) PRIMARY KEY,
    InstitutionName   NVARCHAR(150) NOT NULL,
    Code              NVARCHAR(20) NOT NULL,
    Domain            NVARCHAR(100) NOT NULL,
    ContactEmail      NVARCHAR(150) NOT NULL,
    AdminFullName     NVARCHAR(100) NOT NULL,
    AdminEmail        NVARCHAR(150) NOT NULL,
    PasswordHash      NVARCHAR(256) NOT NULL,
    Status            NVARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (Status IN ('PENDING', 'APPROVED', 'REJECTED')),
    Notes             NVARCHAR(500),
    CreatedAt         DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    ReviewedAt        DATETIME2 NULL,
    ReviewedByUserId  INT NULL,
    CONSTRAINT FK_App_ReviewedBy FOREIGN KEY (ReviewedByUserId) REFERENCES Users(UserId)
);
GO

-- ------------------------------------------------------------------------------
-- Table 11: StaffInvitations (Institutional Staff Delegation)
-- ------------------------------------------------------------------------------
CREATE TABLE StaffInvitations (
    InvitationId      INT IDENTITY(1,1) PRIMARY KEY,
    InstitutionId     INT NOT NULL,
    InvitedByUserId   INT NOT NULL,
    FullName          NVARCHAR(100) NOT NULL,
    Email             NVARCHAR(150) NOT NULL,
    RoleName          NVARCHAR(50) NOT NULL DEFAULT 'issuer',
    Token             NVARCHAR(64) NOT NULL UNIQUE,
    Status            NVARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (Status IN ('PENDING', 'ACCEPTED', 'EXPIRED')),
    CreatedAt         DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    ExpiresAt         DATETIME2 NULL,
    CONSTRAINT FK_Invite_Institution FOREIGN KEY (InstitutionId) REFERENCES Institutions(InstitutionId),
    CONSTRAINT FK_Invite_InvitedBy FOREIGN KEY (InvitedByUserId) REFERENCES Users(UserId)
);
GO

