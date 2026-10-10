"""
CredVerify — SQLite Database Initializer
Run once to create tables and seed demo data.
Usage: python init_db.py
"""
import sqlite3
import os
from passlib.context import CryptContext
import crypto_service
import storage_service

DB_PATH = os.path.join(os.path.dirname(__file__), "credverify.db")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON")
    c = conn.cursor()

    # ─── Create Tables ────────────────────────────────────────────────────────
    c.executescript("""
        CREATE TABLE IF NOT EXISTS Roles (
            RoleId    INTEGER PRIMARY KEY AUTOINCREMENT,
            RoleName  TEXT NOT NULL UNIQUE,
            Description TEXT,
            CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS Institutions (
            InstitutionId   INTEGER PRIMARY KEY AUTOINCREMENT,
            Name            TEXT NOT NULL,
            Code            TEXT NOT NULL UNIQUE,
            Domain          TEXT,
            ContactEmail    TEXT NOT NULL,
            IsVerified      INTEGER NOT NULL DEFAULT 1,
            PublicKeyPem    TEXT,
            PrivateKeyPem   TEXT,
            KeyFingerprint  TEXT,
            CreatedAt       DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS Users (
            UserId        INTEGER PRIMARY KEY AUTOINCREMENT,
            InstitutionId INTEGER,
            RoleId        INTEGER NOT NULL,
            FullName      TEXT NOT NULL,
            Email         TEXT NOT NULL UNIQUE,
            PasswordHash  TEXT NOT NULL,
            Salt          TEXT NOT NULL DEFAULT '',
            IsActive      INTEGER NOT NULL DEFAULT 1,
            CreatedAt     DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (InstitutionId) REFERENCES Institutions(InstitutionId),
            FOREIGN KEY (RoleId)        REFERENCES Roles(RoleId)
        );

        CREATE TABLE IF NOT EXISTS Programs (
            ProgramId     INTEGER PRIMARY KEY AUTOINCREMENT,
            InstitutionId INTEGER NOT NULL,
            Name          TEXT NOT NULL,
            Code          TEXT NOT NULL,
            DegreeType    TEXT NOT NULL,
            CreatedAt     DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (InstitutionId) REFERENCES Institutions(InstitutionId)
        );

        CREATE TABLE IF NOT EXISTS Credentials (
            CredentialId  TEXT PRIMARY KEY,
            InstitutionId INTEGER NOT NULL,
            ProgramId     INTEGER NOT NULL,
            StudentName   TEXT NOT NULL,
            StudentEmail  TEXT NOT NULL,
            IssuerUserId  INTEGER NOT NULL,
            IssueDate     TEXT NOT NULL,
            Status        TEXT NOT NULL DEFAULT 'ACTIVE',
            QrCodeHash    TEXT,
            CreatedAt     DATETIME DEFAULT CURRENT_TIMESTAMP,
            UpdatedAt     DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (InstitutionId) REFERENCES Institutions(InstitutionId),
            FOREIGN KEY (ProgramId)     REFERENCES Programs(ProgramId),
            FOREIGN KEY (IssuerUserId)  REFERENCES Users(UserId)
        );

        CREATE TABLE IF NOT EXISTS CredentialEvidence (
            EvidenceId   INTEGER PRIMARY KEY AUTOINCREMENT,
            CredentialId TEXT NOT NULL,
            BlobUrl      TEXT NOT NULL,
            FileName     TEXT NOT NULL,
            FileHash     TEXT NOT NULL,
            ContentType  TEXT NOT NULL,
            UploadedAt   DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (CredentialId) REFERENCES Credentials(CredentialId)
        );

        CREATE TABLE IF NOT EXISTS CredentialSignatures (
            SignatureId     INTEGER PRIMARY KEY AUTOINCREMENT,
            CredentialId    TEXT NOT NULL UNIQUE,
            InstitutionId   INTEGER NOT NULL,
            Algorithm       TEXT NOT NULL DEFAULT 'ECDSA-SECP256R1-SHA256',
            PublicKeyPem    TEXT NOT NULL,
            KeyFingerprint  TEXT NOT NULL,
            SignatureHex    TEXT NOT NULL,
            PayloadDigest   TEXT NOT NULL,
            SignedAt        DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (CredentialId)  REFERENCES Credentials(CredentialId),
            FOREIGN KEY (InstitutionId) REFERENCES Institutions(InstitutionId)
        );

        CREATE TABLE IF NOT EXISTS Verifications (
            VerificationId INTEGER PRIMARY KEY AUTOINCREMENT,
            CredentialId   TEXT NOT NULL,
            Result         TEXT NOT NULL,
            VerifierIpHash TEXT,
            UserAgent      TEXT,
            VerifiedAt     DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (CredentialId) REFERENCES Credentials(CredentialId)
        );

        CREATE TABLE IF NOT EXISTS Revocations (
            RevocationId  INTEGER PRIMARY KEY AUTOINCREMENT,
            CredentialId  TEXT NOT NULL UNIQUE,
            RevokedByUserId INTEGER NOT NULL,
            Reason        TEXT NOT NULL,
            PreviousStatus TEXT NOT NULL,
            RevokedAt     DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (CredentialId)    REFERENCES Credentials(CredentialId),
            FOREIGN KEY (RevokedByUserId) REFERENCES Users(UserId)
        );

        CREATE TABLE IF NOT EXISTS AuditLogs (
            AuditId      INTEGER PRIMARY KEY AUTOINCREMENT,
            ActorUserId  INTEGER,
            Action       TEXT NOT NULL,
            EntityType   TEXT NOT NULL,
            EntityId     TEXT NOT NULL,
            Details      TEXT,
            IpAddress    TEXT,
            Timestamp    DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (ActorUserId) REFERENCES Users(UserId)
        );

        CREATE TABLE IF NOT EXISTS InstitutionApplications (
            ApplicationId     INTEGER PRIMARY KEY AUTOINCREMENT,
            InstitutionName   TEXT NOT NULL,
            Code              TEXT NOT NULL,
            Domain            TEXT NOT NULL,
            ContactEmail      TEXT NOT NULL,
            AdminFullName     TEXT NOT NULL,
            AdminEmail        TEXT NOT NULL,
            PasswordHash      TEXT NOT NULL,
            Status            TEXT NOT NULL DEFAULT 'PENDING',
            Notes             TEXT,
            CreatedAt         DATETIME DEFAULT CURRENT_TIMESTAMP,
            ReviewedAt        DATETIME,
            ReviewedByUserId  INTEGER,
            FOREIGN KEY (ReviewedByUserId) REFERENCES Users(UserId)
        );

        CREATE TABLE IF NOT EXISTS StaffInvitations (
            InvitationId      INTEGER PRIMARY KEY AUTOINCREMENT,
            InstitutionId     INTEGER NOT NULL,
            InvitedByUserId   INTEGER NOT NULL,
            FullName          TEXT NOT NULL,
            Email             TEXT NOT NULL,
            RoleName          TEXT NOT NULL DEFAULT 'issuer',
            Token             TEXT NOT NULL UNIQUE,
            Status            TEXT NOT NULL DEFAULT 'PENDING',
            CreatedAt         DATETIME DEFAULT CURRENT_TIMESTAMP,
            ExpiresAt         DATETIME,
            FOREIGN KEY (InstitutionId)   REFERENCES Institutions(InstitutionId),
            FOREIGN KEY (InvitedByUserId) REFERENCES Users(UserId)
        );
    """)

    # ─── Ensure columns exist on existing databases ───────────────────────────
    c.execute("PRAGMA table_info(Institutions)")
    cols = [col[1] for col in c.fetchall()]
    if "PublicKeyPem" not in cols:
        c.execute("ALTER TABLE Institutions ADD COLUMN PublicKeyPem TEXT")
    if "PrivateKeyPem" not in cols:
        c.execute("ALTER TABLE Institutions ADD COLUMN PrivateKeyPem TEXT")
    if "KeyFingerprint" not in cols:
        c.execute("ALTER TABLE Institutions ADD COLUMN KeyFingerprint TEXT")

    # ─── Seed Roles ───────────────────────────────────────────────────────────
    c.execute("SELECT COUNT(*) FROM Roles")
    if c.fetchone()[0] == 0:
        c.executemany("INSERT INTO Roles (RoleName, Description) VALUES (?, ?)", [
            ("admin",   "Platform administrator - full read/write access"),
            ("issuer",  "Institution registrar - issue and revoke credentials"),
            ("student", "Graduate - view own credential wallet"),
        ])
        print("  [OK] Seeded 3 roles")

    # ─── Seed Institution ─────────────────────────────────────────────────────
    c.execute("SELECT COUNT(*) FROM Institutions")
    if c.fetchone()[0] == 0:
        priv, pub, fp = crypto_service.generate_institution_keypair()
        c.execute("""
            INSERT INTO Institutions (Name, Code, Domain, ContactEmail, IsVerified, PublicKeyPem, PrivateKeyPem, KeyFingerprint)
            VALUES ('Apex Institute of Technology', 'AIT', 'apex.edu', 'registrar@apex.edu', 1, ?, ?, ?)
        """, (pub, priv, fp))
        print("  [OK] Seeded 1 institution with cryptographic keypair")
    else:
        # Backfill institution keypair if missing
        c.execute("SELECT InstitutionId, PublicKeyPem FROM Institutions")
        for inst_id, pub in c.fetchall():
            if not pub:
                priv, pub, fp = crypto_service.generate_institution_keypair()
                c.execute(
                    "UPDATE Institutions SET PublicKeyPem = ?, PrivateKeyPem = ?, KeyFingerprint = ? WHERE InstitutionId = ?",
                    (pub, priv, fp, inst_id),
                )
                print(f"  [OK] Generated cryptographic keypair for Institution #{inst_id}")

    # ─── Seed Programs ────────────────────────────────────────────────────────
    c.execute("SELECT COUNT(*) FROM Programs")
    if c.fetchone()[0] == 0:
        c.executemany(
            "INSERT INTO Programs (InstitutionId, Name, Code, DegreeType) VALUES (1, ?, ?, ?)",
            [
                ("Bachelor of Technology in Computer Science",    "BTCS", "Undergraduate"),
                ("Bachelor of Technology in Mechanical Engineering", "BTME", "Undergraduate"),
                ("Master of Science in Artificial Intelligence",  "MSAI", "Postgraduate"),
                ("Master of Business Administration",             "MBA",  "Postgraduate"),
            ]
        )
        print("  [OK] Seeded 4 programs")

    # ─── Seed Users (bcrypt-hashed passwords) ────────────────────────────────
    c.execute("SELECT COUNT(*) FROM Users")
    if c.fetchone()[0] == 0:
        issuer_hash  = pwd_context.hash("Issuer@123")
        admin_hash   = pwd_context.hash("Admin@123")
        student_hash = pwd_context.hash("Student@123")

        c.executemany(
            "INSERT INTO Users (InstitutionId, RoleId, FullName, Email, PasswordHash, Salt, IsActive) VALUES (?, ?, ?, ?, ?, '', 1)",
            [
                (1,    2, "Dr. Sarah Jenkins", "issuer@apex.edu",       issuer_hash),
                (None, 1, "Marcus Vance",      "admin@credverify.gov",  admin_hash),
                (1,    3, "Aditi Sharma",      "aditi.sharma@apex.edu", student_hash),
            ]
        )
        print("  [OK] Seeded 3 users")

    # ─── Seed Credentials ─────────────────────────────────────────────────────
    c.execute("SELECT COUNT(*) FROM Credentials")
    if c.fetchone()[0] == 0:
        c.executemany(
            "INSERT INTO Credentials (CredentialId, InstitutionId, ProgramId, StudentName, StudentEmail, IssuerUserId, IssueDate, Status) VALUES (?, 1, ?, ?, ?, 1, ?, ?)",
            [
                ("CRED-2026-CS101", 1, "Aditi Sharma",  "aditi.sharma@apex.edu",  "2026-05-15", "ACTIVE"),
                ("CRED-2025-ME402", 2, "Rahul Verma",   "rahul.verma@apex.edu",   "2025-06-20", "REVOKED"),
                ("CRED-2026-AI990", 3, "Priya Nair",    "priya.nair@apex.edu",    "2026-08-10", "ACTIVE"),
            ]
        )
        # Revocation record for the revoked credential
        c.execute("""
            INSERT INTO Revocations (CredentialId, RevokedByUserId, Reason, PreviousStatus, RevokedAt)
            VALUES ('CRED-2025-ME402', 1, 'Academic integrity violation: falsified examination records.', 'ACTIVE', '2026-02-14 11:20:00')
        """)
        print("  [OK] Seeded 3 credentials (2 ACTIVE, 1 REVOKED)")

    # ─── Seed Cryptographic Signatures for Credentials ───────────────────────
    c.execute("SELECT CredentialId, InstitutionId, ProgramId, StudentName, StudentEmail, IssueDate FROM Credentials")
    all_creds = c.fetchall()
    for cred_id, inst_id, prog_id, s_name, s_email, i_date in all_creds:
        c.execute("SELECT SignatureId FROM CredentialSignatures WHERE CredentialId = ?", (cred_id,))
        if not c.fetchone():
            c.execute("SELECT PublicKeyPem, PrivateKeyPem, KeyFingerprint FROM Institutions WHERE InstitutionId = ?", (inst_id,))
            inst_row = c.fetchone()
            if inst_row and inst_row[0] and inst_row[1]:
                pub_pem, priv_pem, fp = inst_row[0], inst_row[1], inst_row[2]
                payload = {
                    "credential_id": cred_id,
                    "institution_id": inst_id,
                    "program_id": prog_id,
                    "student_name": s_name,
                    "student_email": s_email,
                    "issue_date": i_date,
                    "evidence_hash": "",
                }
                sig_hex, digest = crypto_service.sign_credential(priv_pem, payload)
                c.execute("""
                    INSERT INTO CredentialSignatures (CredentialId, InstitutionId, Algorithm, PublicKeyPem, KeyFingerprint, SignatureHex, PayloadDigest)
                    VALUES (?, ?, 'ECDSA-SECP256R1-SHA256', ?, ?, ?, ?)
                """, (cred_id, inst_id, pub_pem, fp, sig_hex, digest))
                print(f"  [OK] Cryptographically signed credential: {cred_id}")

    # ─── Seed Example Certified Evidence Document for CRED-2026-CS101 ────────
    c.execute("SELECT COUNT(*) FROM CredentialEvidence WHERE CredentialId = 'CRED-2026-CS101'")
    if c.fetchone()[0] == 0:
        sample_transcript = (
            b"%PDF-1.4 Official Certified Transcript - Apex Institute of Technology\n"
            b"Student: Aditi Sharma | Program: Bachelor of Technology in Computer Science\n"
            b"Conferral Date: 2026-05-15 | Cumulative GPA: 3.94 / 4.00 (First Class Distinction)\n"
            b"Official Seal of the Registrar: Dr. Sarah Jenkins\n"
            b"Tamper-Evident Security Seal: Apex Academic Registry Azure Node.\n"
        )
        evidence_result = storage_service.upload_evidence_file(
            credential_id="CRED-2026-CS101",
            file_bytes=sample_transcript,
            original_filename="Aditi_Sharma_BTech_CS_Official_Transcript.pdf",
            content_type="application/pdf",
        )
        c.execute("""
            INSERT INTO CredentialEvidence (CredentialId, BlobUrl, FileName, FileHash, ContentType)
            VALUES (?, ?, ?, ?, ?)
        """, (
            "CRED-2026-CS101",
            evidence_result["storage_key"],
            evidence_result["file_name"],
            evidence_result["file_hash"],
            evidence_result["content_type"],
        ))
        print("  [OK] Seeded verified academic evidence document with SHA-256 seal for CRED-2026-CS101")

    # ─── Seed Audit Logs ──────────────────────────────────────────────────────
    c.execute("SELECT COUNT(*) FROM AuditLogs")
    if c.fetchone()[0] == 0:
        c.executemany(
            "INSERT INTO AuditLogs (ActorUserId, Action, EntityType, EntityId, Details, Timestamp) VALUES (?, ?, ?, ?, ?, ?)",
            [
                (1,    "CREDENTIAL_ISSUED",        "Credential",  "CRED-2026-CS101", "Credential issued to: Aditi Sharma",                                          "2026-05-15 10:30:12"),
                (1,    "CREDENTIAL_ISSUED",        "Credential",  "CRED-2026-AI990", "Credential issued to: Priya Nair",                                            "2026-08-10 09:00:00"),
                (1,    "CREDENTIAL_REVOKED",       "Credential",  "CRED-2025-ME402", "Revoked reason: Academic integrity violation: falsified examination records.", "2026-02-14 11:20:00"),
                (None, "PUBLIC_VERIFICATION_CHECK","Verification","CRED-2026-CS101", "Employer verification check. Result: ACTIVE",                                 "2026-10-10 08:45:22"),
            ]
        )
        print("  [OK] Seeded 4 audit log entries")

    conn.commit()
    conn.close()

    print(f"\nDatabase ready: {DB_PATH}")
    print("\n  Demo Login Credentials:")
    print("  ISSUER  -> issuer@apex.edu        / Issuer@123")
    print("  ADMIN   -> admin@credverify.gov   / Admin@123")
    print("  STUDENT -> aditi.sharma@apex.edu  / Student@123")


if __name__ == "__main__":
    print("Initializing CredVerify SQLite database...\n")
    init_db()

