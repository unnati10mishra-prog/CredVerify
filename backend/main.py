import os
import uuid
import sqlite3
import hashlib
from datetime import datetime

from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from dotenv import load_dotenv

from database import get_db
from models import Token, CredentialIssue, CredentialRevoke
from auth import verify_password, create_access_token, get_current_user

load_dotenv()

app = FastAPI(
    title="CredVerify API",
    version="1.0.0",
    description="Secure Academic Credential Verification — SQLite Backend",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Health Check ─────────────────────────────────────────────────────────────

@app.get("/")
def read_root():
    return {"message": "CredVerify API is running", "docs": "/docs"}


# ─── AUTH ─────────────────────────────────────────────────────────────────────

@app.post("/api/auth/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: sqlite3.Connection = Depends(get_db),
):
    cursor = db.cursor()
    cursor.execute(
        """
        SELECT u.UserId, u.PasswordHash, u.FullName, u.InstitutionId,
               r.RoleName,
               i.Name AS InstitutionName
        FROM   Users u
        JOIN   Roles r ON u.RoleId = r.RoleId
        LEFT JOIN Institutions i ON u.InstitutionId = i.InstitutionId
        WHERE  u.Email = ? AND u.IsActive = 1
        """,
        (form_data.username,),
    )
    row = cursor.fetchone()

    if not row or not verify_password(form_data.password, row["PasswordHash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(
        data={"sub": row["UserId"], "role": row["RoleName"]}
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": row["UserId"],
            "fullName": row["FullName"],
            "email": form_data.username,
            "role": row["RoleName"].upper(),
            "institutionId": row["InstitutionId"],
            "institutionName": row["InstitutionName"],
        },
    }


# ─── PUBLIC VERIFICATION ──────────────────────────────────────────────────────

@app.get("/api/verify/{credential_id}")
def verify_credential(
    credential_id: str,
    db: sqlite3.Connection = Depends(get_db),
):
    cursor = db.cursor()
    cursor.execute(
        """
        SELECT c.CredentialId, c.Status, c.IssueDate, c.StudentName,
               p.Name      AS ProgramName,
               p.DegreeType,
               i.Name      AS InstitutionName,
               e.FileHash  AS TamperEvidentHash,
               rev.Reason  AS RevocationReason,
               rev.RevokedAt
        FROM   Credentials c
        JOIN   Programs     p   ON c.ProgramId     = p.ProgramId
        JOIN   Institutions i   ON c.InstitutionId = i.InstitutionId
        LEFT JOIN CredentialEvidence e ON c.CredentialId = e.CredentialId
        LEFT JOIN Revocations rev      ON c.CredentialId = rev.CredentialId
        WHERE  c.CredentialId = ?
        """,
        (credential_id.strip().upper(),),
    )
    row = cursor.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Credential not found")

    # Log verification event (anonymously — no user id)
    cursor.execute(
        """
        INSERT INTO AuditLogs (ActorUserId, Action, EntityType, EntityId, Details)
        VALUES (NULL, 'PUBLIC_VERIFICATION_CHECK', 'Verification', ?, ?)
        """,
        (row["CredentialId"], f"Public verification check. Result: {row['Status']}"),
    )
    db.commit()

    return {
        "credential_id":      row["CredentialId"],
        "status":             row["Status"],
        "student_name":       row["StudentName"],
        "issue_date":         row["IssueDate"],
        "program_name":       row["ProgramName"],
        "degree_type":        row["DegreeType"],
        "institution_name":   row["InstitutionName"],
        "revocation_reason":  row["RevocationReason"],
        "revoked_at":         row["RevokedAt"],
        "tamper_evident_hash":row["TamperEvidentHash"],
        "verified_at":        datetime.utcnow().isoformat() + "Z",
    }


# ─── CREDENTIAL MANAGEMENT ────────────────────────────────────────────────────

@app.get("/api/credentials")
def list_credentials(
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    if current_user["role"] not in ["issuer", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized to view credentials")

    cursor = db.cursor()
    cursor.execute(
        """
        SELECT c.CredentialId, c.StudentName, c.StudentEmail,
               c.Status, c.IssueDate,
               p.Name       AS ProgramName,
               p.DegreeType,
               (SELECT COUNT(*) FROM CredentialEvidence e
                WHERE e.CredentialId = c.CredentialId) AS EvidenceCount
        FROM   Credentials c
        JOIN   Programs p ON c.ProgramId = p.ProgramId
        ORDER  BY c.CreatedAt DESC
        """
    )
    return [
        {
            "credential_id": r["CredentialId"],
            "student_name":  r["StudentName"],
            "student_email": r["StudentEmail"],
            "status":        r["Status"],
            "issue_date":    r["IssueDate"],
            "program_name":  r["ProgramName"],
            "degree_type":   r["DegreeType"],
            "has_evidence":  r["EvidenceCount"] > 0,
        }
        for r in cursor.fetchall()
    ]


@app.post("/api/credentials", status_code=201)
def issue_credential(
    cred: CredentialIssue,
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    if current_user["role"] not in ["issuer", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized to issue credentials")

    cursor = db.cursor()

    # Resolve program by name (frontend sends program_name string)
    cursor.execute(
        "SELECT ProgramId FROM Programs WHERE Name = ? AND InstitutionId = ?",
        (cred.program_name, cred.institution_id),
    )
    program = cursor.fetchone()
    if not program:
        raise HTTPException(
            status_code=404,
            detail=f"Program '{cred.program_name}' not found for institution {cred.institution_id}",
        )

    credential_id = f"CRED-{datetime.utcnow().year}-{uuid.uuid4().hex[:6].upper()}"

    try:
        cursor.execute(
            """
            INSERT INTO Credentials
                (CredentialId, InstitutionId, ProgramId, StudentName, StudentEmail, IssuerUserId, IssueDate, Status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
            """,
            (
                credential_id,
                cred.institution_id,
                program["ProgramId"],
                cred.student_name,
                cred.student_email,
                current_user["user_id"],
                str(cred.issue_date),
            ),
        )
        cursor.execute(
            """
            INSERT INTO AuditLogs (ActorUserId, Action, EntityType, EntityId, Details)
            VALUES (?, 'CREDENTIAL_ISSUED', 'Credential', ?, ?)
            """,
            (
                current_user["user_id"],
                credential_id,
                f"Credential issued to: {cred.student_name}",
            ),
        )
        db.commit()
        return {
            "message":          "Credential issued successfully",
            "credential_id":    credential_id,
            "status":           "ACTIVE",
            "verification_url": f"http://localhost:5173/verify?id={credential_id}",
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/credentials/{credential_id}/revoke")
def revoke_credential(
    credential_id: str,
    req: CredentialRevoke,
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    if current_user["role"] not in ["issuer", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized to revoke credentials")

    cursor = db.cursor()
    cursor.execute(
        "SELECT Status FROM Credentials WHERE CredentialId = ?", (credential_id,)
    )
    row = cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Credential not found")
    if row["Status"] == "REVOKED":
        raise HTTPException(status_code=400, detail="Credential is already revoked")

    previous_status = row["Status"]
    try:
        cursor.execute(
            "UPDATE Credentials SET Status = 'REVOKED', UpdatedAt = CURRENT_TIMESTAMP WHERE CredentialId = ?",
            (credential_id,),
        )
        cursor.execute(
            """
            INSERT INTO Revocations (CredentialId, RevokedByUserId, Reason, PreviousStatus)
            VALUES (?, ?, ?, ?)
            """,
            (credential_id, current_user["user_id"], req.reason, previous_status),
        )
        cursor.execute(
            """
            INSERT INTO AuditLogs (ActorUserId, Action, EntityType, EntityId, Details)
            VALUES (?, 'CREDENTIAL_REVOKED', 'Credential', ?, ?)
            """,
            (
                current_user["user_id"],
                credential_id,
                f"Revoked reason: {req.reason}",
            ),
        )
        db.commit()
        return {
            "success":      True,
            "credential_id": credential_id,
            "status":        "REVOKED",
            "revoked_at":    datetime.utcnow().isoformat() + "Z",
            "reason":        req.reason,
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ─── EVIDENCE UPLOAD (local file storage — no Azure Blob required) ────────────

@app.post("/api/evidence", status_code=201)
def upload_evidence(
    credential_id: str = Form(...),
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    if current_user["role"] not in ["issuer", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized to upload evidence")

    try:
        contents = file.file.read()
        file_hash = hashlib.sha256(contents).hexdigest()

        # Store locally (swap this for Azure Blob upload when credentials are available)
        evidence_dir = os.path.join(os.path.dirname(__file__), "evidence_files")
        os.makedirs(evidence_dir, exist_ok=True)
        local_filename = f"{credential_id}_{uuid.uuid4().hex}_{file.filename}"
        with open(os.path.join(evidence_dir, local_filename), "wb") as f:
            f.write(contents)

        local_url = f"file://local/evidence/{local_filename}"

        cursor = db.cursor()
        cursor.execute(
            """
            INSERT INTO CredentialEvidence (CredentialId, BlobUrl, FileName, FileHash, ContentType)
            VALUES (?, ?, ?, ?, ?)
            """,
            (credential_id, local_url, file.filename, file_hash, file.content_type),
        )
        db.commit()

        return {
            "message": "Evidence stored locally (Azure Blob: configure AZURE_STORAGE_CONNECTION_STRING to enable cloud storage)",
            "evidence": {
                "credential_id": credential_id,
                "file_name":     file.filename,
                "file_hash":     file_hash,
                "blob_url":      local_url,
                "uploaded_at":   datetime.utcnow().isoformat() + "Z",
            },
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


# ─── AUDIT TRAIL ──────────────────────────────────────────────────────────────

@app.get("/api/audit")
def get_audit_logs(
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    cursor = db.cursor()
    cursor.execute(
        """
        SELECT a.AuditId,
               COALESCE(u.FullName, 'System / Public') AS Actor,
               a.Action, a.EntityType, a.EntityId, a.Details, a.IpAddress, a.Timestamp
        FROM   AuditLogs a
        LEFT JOIN Users u ON a.ActorUserId = u.UserId
        ORDER  BY a.Timestamp DESC
        LIMIT  100
        """
    )
    return [
        {
            "audit_id":    r["AuditId"],
            "actor":       r["Actor"],
            "action":      r["Action"],
            "entity_type": r["EntityType"],
            "entity_id":   r["EntityId"],
            "details":     r["Details"],
            "ip_address":  r["IpAddress"] or "N/A",
            "timestamp":   r["Timestamp"],
        }
        for r in cursor.fetchall()
    ]


# ─── PROGRAMS (helper for frontend dropdowns) ─────────────────────────────────

@app.get("/api/programs")
def list_programs(db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute(
        "SELECT ProgramId, Name, Code, DegreeType, InstitutionId FROM Programs ORDER BY ProgramId"
    )
    return [
        {
            "program_id":     r["ProgramId"],
            "name":           r["Name"],
            "code":           r["Code"],
            "degree_type":    r["DegreeType"],
            "institution_id": r["InstitutionId"],
        }
        for r in cursor.fetchall()
    ]


# ─── Entry Point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    # Auto-initialize DB if it doesn't exist yet
    from database import DB_PATH
    import os
    if not os.path.exists(DB_PATH):
        print("First run: initializing database...")
        from init_db import init_db
        init_db()

    port = int(os.getenv("PORT", 5000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
