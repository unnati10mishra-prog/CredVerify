import os
import uuid
import sqlite3
import hashlib
from datetime import datetime

from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from dotenv import load_dotenv

from database import get_db
from models import (
    Token,
    CredentialIssue,
    CredentialRevoke,
    StudentRegister,
    InstitutionApply,
    StaffInviteCreate,
    StaffInviteAccept,
    ApplicationReview,
)
from auth import verify_password, get_password_hash, create_access_token, get_current_user
import email_service
import storage_service
import crypto_service
from rate_limiter import RateLimiterMiddleware

load_dotenv()

app = FastAPI(
    title="CredVerify API",
    version="1.0.0",
    description="Secure Academic Credential Verification — SQLite Backend",
)

# Apply Rate Limiter middleware to protect public verification and auth routes
app.add_middleware(RateLimiterMiddleware)

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
        data={"sub": row["UserId"], "role": row["RoleName"], "email": form_data.username}
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


# ─── SELF-SERVE ONBOARDING & REGISTRATION ─────────────────────────────────────

@app.post("/api/auth/register-student", status_code=201)
def register_student(
    req: StudentRegister,
    background_tasks: BackgroundTasks,
    db: sqlite3.Connection = Depends(get_db),
):
    cursor = db.cursor()
    cursor.execute("SELECT UserId FROM Users WHERE Email = ?", (req.email.lower(),))
    if cursor.fetchone():
        raise HTTPException(status_code=400, detail="An account with this email address already exists.")

    cursor.execute("SELECT RoleId FROM Roles WHERE RoleName = 'student'")
    role_row = cursor.fetchone()
    if not role_row:
        raise HTTPException(status_code=500, detail="Student role definition missing in database")

    hashed_pw = get_password_hash(req.password)

    try:
        cursor.execute(
            """
            INSERT INTO Users (RoleId, FullName, Email, PasswordHash, IsActive)
            VALUES (?, ?, ?, ?, 1)
            """,
            (role_row["RoleId"], req.full_name.strip(), req.email.lower(), hashed_pw),
        )
        user_id = cursor.lastrowid
        cursor.execute(
            """
            INSERT INTO AuditLogs (ActorUserId, Action, EntityType, EntityId, Details)
            VALUES (?, 'USER_REGISTERED', 'User', ?, ?)
            """,
            (user_id, str(user_id), f"Student account registered: {req.email}"),
        )
        db.commit()

        background_tasks.add_task(
            email_service.send_welcome_student_email,
            student_email=req.email.lower(),
            student_name=req.full_name.strip(),
        )

        token = create_access_token(data={"sub": user_id, "role": "student", "email": req.email.lower()})
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": user_id,
                "fullName": req.full_name.strip(),
                "email": req.email.lower(),
                "role": "STUDENT",
                "institutionId": None,
                "institutionName": None,
            },
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/auth/apply-institution", status_code=201)
def apply_institution(
    req: InstitutionApply,
    background_tasks: BackgroundTasks,
    db: sqlite3.Connection = Depends(get_db),
):
    cursor = db.cursor()
    code_clean = req.code.strip().upper()
    email_clean = req.admin_email.lower().strip()

    # Check for duplicate pending application or existing institution
    cursor.execute("SELECT InstitutionId FROM Institutions WHERE Code = ?", (code_clean,))
    if cursor.fetchone():
        raise HTTPException(status_code=400, detail=f"Institution with code '{code_clean}' already exists.")

    cursor.execute("SELECT ApplicationId FROM InstitutionApplications WHERE Code = ? AND Status = 'PENDING'", (code_clean,))
    if cursor.fetchone():
        raise HTTPException(status_code=400, detail=f"An application for institution code '{code_clean}' is already pending review.")

    cursor.execute("SELECT UserId FROM Users WHERE Email = ?", (email_clean,))
    if cursor.fetchone():
        raise HTTPException(status_code=400, detail=f"Account with email '{email_clean}' is already registered.")

    hashed_pw = get_password_hash(req.password)

    try:
        cursor.execute(
            """
            INSERT INTO InstitutionApplications
                (InstitutionName, Code, Domain, ContactEmail, AdminFullName, AdminEmail, PasswordHash, Status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')
            """,
            (
                req.institution_name.strip(),
                code_clean,
                req.domain.strip().lower(),
                req.contact_email.lower().strip(),
                req.admin_full_name.strip(),
                email_clean,
                hashed_pw,
            ),
        )
        app_id = cursor.lastrowid
        db.commit()

        background_tasks.add_task(
            email_service.send_institution_applied_email,
            contact_email=email_clean,
            institution_name=req.institution_name.strip(),
            admin_name=req.admin_full_name.strip(),
        )

        return {
            "message": "Institution application submitted successfully and is pending platform review.",
            "application_id": app_id,
            "status": "PENDING",
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/admin/institution-applications")
def list_institution_applications(
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Platform administrator access required")

    cursor = db.cursor()
    cursor.execute(
        """
        SELECT ApplicationId, InstitutionName, Code, Domain, ContactEmail,
               AdminFullName, AdminEmail, Status, Notes, CreatedAt, ReviewedAt
        FROM   InstitutionApplications
        ORDER  BY CreatedAt DESC
        """
    )
    return [
        {
            "application_id":   r["ApplicationId"],
            "institution_name": r["InstitutionName"],
            "code":             r["Code"],
            "domain":           r["Domain"],
            "contact_email":    r["ContactEmail"],
            "admin_full_name":  r["AdminFullName"],
            "admin_email":      r["AdminEmail"],
            "status":           r["Status"],
            "notes":            r["Notes"],
            "created_at":       r["CreatedAt"],
            "reviewed_at":      r["ReviewedAt"],
        }
        for r in cursor.fetchall()
    ]


@app.post("/api/admin/institution-applications/{application_id}/approve")
def approve_institution_application(
    application_id: int,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Platform administrator access required")

    cursor = db.cursor()
    cursor.execute("SELECT * FROM InstitutionApplications WHERE ApplicationId = ?", (application_id,))
    app_row = cursor.fetchone()
    if not app_row:
        raise HTTPException(status_code=404, detail="Application not found")
    if app_row["Status"] != "PENDING":
        raise HTTPException(status_code=400, detail=f"Application has already been {app_row['Status'].lower()}")

    cursor.execute("SELECT RoleId FROM Roles WHERE RoleName = 'issuer'")
    issuer_role = cursor.fetchone()["RoleId"]

    try:
        # 1. Create Verified Institution
        cursor.execute(
            """
            INSERT INTO Institutions (Name, Code, Domain, ContactEmail, IsVerified)
            VALUES (?, ?, ?, ?, 1)
            """,
            (
                app_row["InstitutionName"],
                app_row["Code"],
                app_row["Domain"],
                app_row["ContactEmail"],
            ),
        )
        institution_id = cursor.lastrowid

        # 2. Create Default Program for Institution
        cursor.execute(
            """
            INSERT INTO Programs (InstitutionId, Name, Code, DegreeType)
            VALUES (?, 'General Studies & Science', 'GEN-01', 'Bachelor')
            """,
            (institution_id,),
        )

        # 3. Create Activated Administrator/Issuer User
        cursor.execute(
            """
            INSERT INTO Users (InstitutionId, RoleId, FullName, Email, PasswordHash, IsActive)
            VALUES (?, ?, ?, ?, ?, 1)
            """,
            (
                institution_id,
                issuer_role,
                app_row["AdminFullName"],
                app_row["AdminEmail"],
                app_row["PasswordHash"],
            ),
        )
        new_user_id = cursor.lastrowid

        # 4. Mark Application Approved
        cursor.execute(
            """
            UPDATE InstitutionApplications
            SET    Status = 'APPROVED', ReviewedAt = CURRENT_TIMESTAMP, ReviewedByUserId = ?
            WHERE  ApplicationId = ?
            """,
            (current_user["user_id"], application_id),
        )

        # 5. Audit Log
        cursor.execute(
            """
            INSERT INTO AuditLogs (ActorUserId, Action, EntityType, EntityId, Details)
            VALUES (?, 'INSTITUTION_APPROVED', 'Institution', ?, ?)
            """,
            (
                current_user["user_id"],
                str(institution_id),
                f"Approved onboarding for {app_row['InstitutionName']} (Admin: {app_row['AdminEmail']})",
            ),
        )

        db.commit()

        background_tasks.add_task(
            email_service.send_institution_approved_email,
            contact_email=app_row["AdminEmail"],
            institution_name=app_row["InstitutionName"],
            admin_name=app_row["AdminFullName"],
        )

        return {
            "message": "Institution onboarded successfully and issuing authority granted.",
            "institution_id": institution_id,
            "admin_user_id": new_user_id,
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/admin/institution-applications/{application_id}/reject")
def reject_institution_application(
    application_id: int,
    req: ApplicationReview,
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Platform administrator access required")

    cursor = db.cursor()
    cursor.execute("SELECT * FROM InstitutionApplications WHERE ApplicationId = ?", (application_id,))
    app_row = cursor.fetchone()
    if not app_row:
        raise HTTPException(status_code=404, detail="Application not found")
    if app_row["Status"] != "PENDING":
        raise HTTPException(status_code=400, detail=f"Application has already been {app_row['Status'].lower()}")

    try:
        cursor.execute(
            """
            UPDATE InstitutionApplications
            SET    Status = 'REJECTED', Notes = ?, ReviewedAt = CURRENT_TIMESTAMP, ReviewedByUserId = ?
            WHERE  ApplicationId = ?
            """,
            (req.notes or "Application does not meet platform accreditation requirements.", current_user["user_id"], application_id),
        )
        db.commit()
        return {"message": "Application rejected."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ─── STAFF DELEGATION & INVITATIONS ───────────────────────────────────────────

@app.post("/api/institution/invite-staff", status_code=201)
def invite_staff_member(
    req: StaffInviteCreate,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    if current_user["role"] not in ["issuer", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized to invite institutional staff")

    cursor = db.cursor()
    cursor.execute("SELECT InstitutionId, FullName FROM Users WHERE UserId = ?", (current_user["user_id"],))
    inviter = cursor.fetchone()
    inst_id = inviter["InstitutionId"]
    if not inst_id:
        inst_id = 1  # Fallback for demo admin

    cursor.execute("SELECT Name FROM Institutions WHERE InstitutionId = ?", (inst_id,))
    inst_row = cursor.fetchone()
    institution_name = inst_row["Name"] if inst_row else "Apex Institute of Technology"

    email_clean = req.email.lower().strip()
    cursor.execute("SELECT UserId FROM Users WHERE Email = ?", (email_clean,))
    if cursor.fetchone():
        raise HTTPException(status_code=400, detail=f"User with email '{email_clean}' is already registered.")

    token = uuid.uuid4().hex

    try:
        cursor.execute(
            """
            INSERT INTO StaffInvitations
                (InstitutionId, InvitedByUserId, FullName, Email, RoleName, Token, Status)
            VALUES (?, ?, ?, ?, ?, ?, 'PENDING')
            """,
            (inst_id, current_user["user_id"], req.full_name.strip(), email_clean, req.role_name, token),
        )
        db.commit()

        background_tasks.add_task(
            email_service.send_staff_invitation_email,
            staff_email=email_clean,
            staff_name=req.full_name.strip(),
            institution_name=institution_name,
            inviter_name=inviter["FullName"],
            invite_token=token,
        )

        return {
            "message": "Staff invitation dispatched successfully.",
            "invite_token": token,
            "recipient": email_clean,
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/institution/staff")
def list_institution_staff(
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    if current_user["role"] not in ["issuer", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    cursor = db.cursor()
    cursor.execute("SELECT InstitutionId FROM Users WHERE UserId = ?", (current_user["user_id"],))
    u = cursor.fetchone()
    inst_id = u["InstitutionId"] or 1

    cursor.execute(
        """
        SELECT u.UserId, u.FullName, u.Email, r.RoleName, u.IsActive, u.CreatedAt
        FROM   Users u
        JOIN   Roles r ON u.RoleId = r.RoleId
        WHERE  u.InstitutionId = ?
        ORDER  BY u.CreatedAt DESC
        """,
        (inst_id,)
    )
    members = [
        {
            "user_id":    r["UserId"],
            "full_name":  r["FullName"],
            "email":      r["Email"],
            "role":       r["RoleName"].upper(),
            "is_active":  bool(r["IsActive"]),
            "created_at": r["CreatedAt"],
        }
        for r in cursor.fetchall()
    ]

    cursor.execute(
        """
        SELECT InvitationId, FullName, Email, RoleName, Status, CreatedAt
        FROM   StaffInvitations
        WHERE  InstitutionId = ?
        ORDER  BY CreatedAt DESC
        """,
        (inst_id,)
    )
    invites = [
        {
            "invitation_id": r["InvitationId"],
            "full_name":     r["FullName"],
            "email":         r["Email"],
            "role":          r["RoleName"].upper(),
            "status":        r["Status"],
            "created_at":    r["CreatedAt"],
        }
        for r in cursor.fetchall()
    ]

    return {"members": members, "invitations": invites}


@app.get("/api/auth/invite/{token}")
def get_invitation_details(
    token: str,
    db: sqlite3.Connection = Depends(get_db),
):
    cursor = db.cursor()
    cursor.execute(
        """
        SELECT s.InvitationId, s.FullName, s.Email, s.RoleName, s.Status,
               i.Name AS InstitutionName
        FROM   StaffInvitations s
        JOIN   Institutions i ON s.InstitutionId = i.InstitutionId
        WHERE  s.Token = ?
        """,
        (token,)
    )
    row = cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Invitation link is invalid or expired.")
    if row["Status"] != "PENDING":
        raise HTTPException(status_code=400, detail=f"This invitation has already been {row['Status'].lower()}.")

    return {
        "valid":            True,
        "email":            row["Email"],
        "full_name":        row["FullName"],
        "role":             row["RoleName"].upper(),
        "institution_name": row["InstitutionName"],
    }


@app.post("/api/auth/accept-invite")
def accept_staff_invitation(
    req: StaffInviteAccept,
    db: sqlite3.Connection = Depends(get_db),
):
    cursor = db.cursor()
    cursor.execute(
        """
        SELECT s.InvitationId, s.InstitutionId, s.FullName, s.Email, s.RoleName, s.Status,
               i.Name AS InstitutionName
        FROM   StaffInvitations s
        JOIN   Institutions i ON s.InstitutionId = i.InstitutionId
        WHERE  s.Token = ?
        """,
        (req.token,)
    )
    invite = cursor.fetchone()
    if not invite:
        raise HTTPException(status_code=404, detail="Invitation token not found")
    if invite["Status"] != "PENDING":
        raise HTTPException(status_code=400, detail=f"Invitation has already been {invite['Status'].lower()}")

    cursor.execute("SELECT RoleId FROM Roles WHERE RoleName = ?", (invite["RoleName"].lower(),))
    role_row = cursor.fetchone()
    role_id = role_row["RoleId"] if role_row else 2  # default issuer

    hashed_pw = get_password_hash(req.password)
    full_name = req.full_name.strip() if req.full_name else invite["FullName"]

    try:
        cursor.execute(
            """
            INSERT INTO Users (InstitutionId, RoleId, FullName, Email, PasswordHash, IsActive)
            VALUES (?, ?, ?, ?, ?, 1)
            """,
            (invite["InstitutionId"], role_id, full_name, invite["Email"], hashed_pw),
        )
        new_user_id = cursor.lastrowid

        cursor.execute(
            "UPDATE StaffInvitations SET Status = 'ACCEPTED' WHERE InvitationId = ?",
            (invite["InvitationId"],),
        )

        cursor.execute(
            """
            INSERT INTO AuditLogs (ActorUserId, Action, EntityType, EntityId, Details)
            VALUES (?, 'STAFF_INVITE_ACCEPTED', 'User', ?, ?)
            """,
            (new_user_id, str(new_user_id), f"Staff member joined: {invite['Email']} ({invite['InstitutionName']})"),
        )
        db.commit()

        token = create_access_token(data={"sub": new_user_id, "role": invite["RoleName"].lower(), "email": invite["Email"]})
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": new_user_id,
                "fullName": full_name,
                "email": invite["Email"],
                "role": invite["RoleName"].upper(),
                "institutionId": invite["InstitutionId"],
                "institutionName": invite["InstitutionName"],
            },
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ─── PUBLIC VERIFICATION ──────────────────────────────────────────────────────

@app.get("/api/verify/{credential_id}")
def verify_credential(
    credential_id: str,
    db: sqlite3.Connection = Depends(get_db),
):
    cursor = db.cursor()
    cursor.execute(
        """
        SELECT c.CredentialId, c.Status, c.IssueDate, c.StudentName, c.StudentEmail,
               c.InstitutionId, c.ProgramId,
               p.Name      AS ProgramName,
               p.DegreeType,
               i.Name      AS InstitutionName,
               rev.Reason  AS RevocationReason,
               rev.RevokedAt
        FROM   Credentials c
        JOIN   Programs     p   ON c.ProgramId     = p.ProgramId
        JOIN   Institutions i   ON c.InstitutionId = i.InstitutionId
        LEFT JOIN Revocations rev ON c.CredentialId = rev.CredentialId
        WHERE  c.CredentialId = ?
        """,
        (credential_id.strip().upper(),),
    )
    row = cursor.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Credential not found")

    # Fetch evidence details if available
    cursor.execute(
        """
        SELECT EvidenceId, BlobUrl, FileName, FileHash, ContentType, UploadedAt
        FROM   CredentialEvidence
        WHERE  CredentialId = ?
        ORDER  BY UploadedAt DESC
        LIMIT  1
        """,
        (row["CredentialId"],)
    )
    evidence_row = cursor.fetchone()
    evidence_data = None
    tamper_hash = None
    if evidence_row:
        fresh_view_url = storage_service.get_fresh_view_url(evidence_row["BlobUrl"], expiry_minutes=60)
        evidence_data = {
            "evidence_id":   evidence_row["EvidenceId"],
            "file_name":     evidence_row["FileName"],
            "file_hash":     evidence_row["FileHash"],
            "content_type":  evidence_row["ContentType"],
            "uploaded_at":   evidence_row["UploadedAt"],
            "view_url":      fresh_view_url,
        }
        tamper_hash = evidence_row["FileHash"]

    # Fetch and verify cryptographic signature
    cursor.execute(
        """
        SELECT Algorithm, PublicKeyPem, KeyFingerprint, SignatureHex, PayloadDigest, SignedAt
        FROM   CredentialSignatures
        WHERE  CredentialId = ?
        """,
        (row["CredentialId"],)
    )
    sig_row = cursor.fetchone()
    crypto_verification = None
    if sig_row:
        # Canonical payload verification
        canonical_payload = {
            "credential_id":  row["CredentialId"],
            "institution_id": row["InstitutionId"],
            "program_id":     row["ProgramId"],
            "student_name":   row["StudentName"],
            "student_email":  row["StudentEmail"],
            "issue_date":     row["IssueDate"],
            "evidence_hash":  tamper_hash or "",
        }
        is_valid = crypto_service.verify_credential_signature(
            sig_row["PublicKeyPem"], canonical_payload, sig_row["SignatureHex"]
        )
        if not is_valid and tamper_hash:
            # Fallback check without evidence_hash if signed before evidence upload
            canonical_payload["evidence_hash"] = ""
            is_valid = crypto_service.verify_credential_signature(
                sig_row["PublicKeyPem"], canonical_payload, sig_row["SignatureHex"]
            )

        crypto_verification = {
            "verified":           is_valid,
            "algorithm":          sig_row["Algorithm"],
            "signature_hex":      sig_row["SignatureHex"],
            "key_fingerprint":    sig_row["KeyFingerprint"],
            "institution_signer": row["InstitutionName"],
            "signed_at":          sig_row["SignedAt"],
        }

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
        "credential_id":             row["CredentialId"],
        "status":                    row["Status"],
        "student_name":              row["StudentName"],
        "issue_date":                row["IssueDate"],
        "program_name":              row["ProgramName"],
        "degree_type":               row["DegreeType"],
        "institution_name":          row["InstitutionName"],
        "revocation_reason":         row["RevocationReason"],
        "revoked_at":                row["RevokedAt"],
        "tamper_evident_hash":       tamper_hash,
        "evidence_url":              evidence_data["view_url"] if evidence_data else None,
        "evidence_filename":         evidence_data["file_name"] if evidence_data else None,
        "evidence":                  evidence_data,
        "cryptographic_verification": crypto_verification,
        "verified_at":               datetime.utcnow().isoformat() + "Z",
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
                WHERE e.CredentialId = c.CredentialId) AS EvidenceCount,
               (SELECT cs.KeyFingerprint FROM CredentialSignatures cs
                WHERE cs.CredentialId = c.CredentialId) AS KeyFingerprint
        FROM   Credentials c
        JOIN   Programs p ON c.ProgramId = p.ProgramId
        ORDER  BY c.CreatedAt DESC
        """
    )
    return [
        {
            "credential_id":   r["CredentialId"],
            "student_name":    r["StudentName"],
            "student_email":   r["StudentEmail"],
            "status":          r["Status"],
            "issue_date":      r["IssueDate"],
            "program_name":    r["ProgramName"],
            "degree_type":     r["DegreeType"],
            "has_evidence":    r["EvidenceCount"] > 0,
            "key_fingerprint": r["KeyFingerprint"],
        }
        for r in cursor.fetchall()
    ]


@app.post("/api/credentials", status_code=201)
def issue_credential(
    cred: CredentialIssue,
    background_tasks: BackgroundTasks,
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

    # Resolve institution details for cryptographic signing & email
    cursor.execute("SELECT Name, PublicKeyPem, PrivateKeyPem, KeyFingerprint FROM Institutions WHERE InstitutionId = ?", (cred.institution_id,))
    inst_row = cursor.fetchone()
    institution_name = inst_row["Name"] if inst_row else "Apex Institute of Technology"

    credential_id = f"CRED-{datetime.utcnow().year}-{uuid.uuid4().hex[:6].upper()}"

    try:
        # Insert credential record
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

        # Cryptographically sign credential with Institution's ECDSA Keypair
        pub_pem = inst_row["PublicKeyPem"] if inst_row else None
        priv_pem = inst_row["PrivateKeyPem"] if inst_row else None
        fp_val = inst_row["KeyFingerprint"] if inst_row else None

        if not pub_pem or not priv_pem:
            priv_pem, pub_pem, fp_val = crypto_service.generate_institution_keypair()
            cursor.execute(
                "UPDATE Institutions SET PublicKeyPem = ?, PrivateKeyPem = ?, KeyFingerprint = ? WHERE InstitutionId = ?",
                (pub_pem, priv_pem, fp_val, cred.institution_id),
            )

        canonical_payload = {
            "credential_id":  credential_id,
            "institution_id": cred.institution_id,
            "program_id":     program["ProgramId"],
            "student_name":   cred.student_name,
            "student_email":  cred.student_email,
            "issue_date":     str(cred.issue_date),
            "evidence_hash":  "",
        }
        sig_hex, digest = crypto_service.sign_credential(priv_pem, canonical_payload)
        cursor.execute(
            """
            INSERT INTO CredentialSignatures
                (CredentialId, InstitutionId, Algorithm, PublicKeyPem, KeyFingerprint, SignatureHex, PayloadDigest)
            VALUES (?, ?, 'ECDSA-SECP256R1-SHA256', ?, ?, ?, ?)
            """,
            (credential_id, cred.institution_id, pub_pem, fp_val, sig_hex, digest),
        )

        cursor.execute(
            """
            INSERT INTO AuditLogs (ActorUserId, Action, EntityType, EntityId, Details)
            VALUES (?, 'CREDENTIAL_ISSUED', 'Credential', ?, ?)
            """,
            (
                current_user["user_id"],
                credential_id,
                f"Credential issued to: {cred.student_name} (ECDSA signature: {sig_hex[:16]}...)",
            ),
        )
        db.commit()

        # Asynchronously dispatch email notification to the student
        background_tasks.add_task(
            email_service.send_credential_issued_email,
            student_email=cred.student_email,
            student_name=cred.student_name,
            credential_id=credential_id,
            program_name=cred.program_name,
            degree_type=cred.degree_type,
            institution_name=institution_name,
            issue_date=str(cred.issue_date),
        )

        return {
            "message":          "Credential issued and digitally signed successfully",
            "credential_id":    credential_id,
            "status":           "ACTIVE",
            "verification_url": f"http://localhost:5173/verify?id={credential_id}",
            "cryptographic_signature": {
                "algorithm":       "ECDSA-SECP256R1-SHA256",
                "signature_hex":   sig_hex,
                "key_fingerprint": fp_val,
            },
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/student/credentials")
def list_my_credentials(
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    if current_user["role"] != "student":
        raise HTTPException(status_code=403, detail="Student access required")

    cursor = db.cursor()
    student_email = current_user.get("email")
    if not student_email:
        cursor.execute("SELECT Email FROM Users WHERE UserId = ?", (current_user["user_id"],))
        user_row = cursor.fetchone()
        student_email = user_row["Email"] if user_row else None

    if not student_email:
        raise HTTPException(status_code=404, detail="Student profile not found")

    cursor.execute(
        """
        SELECT c.CredentialId, c.StudentName, c.StudentEmail,
               c.Status, c.IssueDate,
               p.Name       AS ProgramName,
               p.DegreeType,
               i.Name       AS InstitutionName,
               e.BlobUrl,
               e.FileName   AS EvidenceFileName,
               e.FileHash   AS TamperEvidentHash,
               cs.KeyFingerprint,
               cs.Algorithm,
               cs.SignedAt
        FROM   Credentials c
        JOIN   Programs p ON c.ProgramId = p.ProgramId
        JOIN   Institutions i ON c.InstitutionId = i.InstitutionId
        LEFT JOIN CredentialEvidence e ON c.CredentialId = e.CredentialId
        LEFT JOIN CredentialSignatures cs ON c.CredentialId = cs.CredentialId
        WHERE  c.StudentEmail = ?
        ORDER  BY c.CreatedAt DESC
        """,
        (student_email,)
    )
    result = []
    for r in cursor.fetchall():
        evidence_url = storage_service.get_fresh_view_url(r["BlobUrl"]) if r["BlobUrl"] else None
        result.append({
            "credential_id":       r["CredentialId"],
            "student_name":        r["StudentName"],
            "student_email":       r["StudentEmail"],
            "status":              r["Status"],
            "issue_date":          r["IssueDate"],
            "program_name":        r["ProgramName"],
            "degree_type":         r["DegreeType"],
            "institution_name":    r["InstitutionName"],
            "tamper_evident_hash": r["TamperEvidentHash"],
            "evidence_url":        evidence_url,
            "evidence_filename":   r["EvidenceFileName"],
            "key_fingerprint":     r["KeyFingerprint"],
            "algorithm":           r["Algorithm"] or "ECDSA-SECP256R1-SHA256",
            "signed_at":           r["SignedAt"],
        })
    return result


@app.post("/api/credentials/{credential_id}/revoke")
def revoke_credential(
    credential_id: str,
    req: CredentialRevoke,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    if current_user["role"] not in ["issuer", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized to revoke credentials")

    cursor = db.cursor()
    cursor.execute(
        """
        SELECT c.Status, c.StudentName, c.StudentEmail,
               p.Name AS ProgramName, i.Name AS InstitutionName
        FROM   Credentials c
        LEFT JOIN Programs p ON c.ProgramId = p.ProgramId
        LEFT JOIN Institutions i ON c.InstitutionId = i.InstitutionId
        WHERE  c.CredentialId = ?
        """,
        (credential_id,)
    )
    row = cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Credential not found")
    if row["Status"] == "REVOKED":
        raise HTTPException(status_code=400, detail="Credential is already revoked")

    previous_status = row["Status"]
    revocation_timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")

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

        # Asynchronously dispatch revocation email to the student
        if row["StudentEmail"]:
            background_tasks.add_task(
                email_service.send_credential_revoked_email,
                student_email=row["StudentEmail"],
                student_name=row["StudentName"] or "Student",
                credential_id=credential_id,
                program_name=row["ProgramName"] or "Academic Program",
                institution_name=row["InstitutionName"] or "Issuing Institution",
                reason=req.reason,
                revocation_date=revocation_timestamp,
            )

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


# ─── EVIDENCE STORAGE & AUDITABLE BLOB MANAGEMENT ─────────────────────────────

@app.post("/api/evidence", status_code=201)
def upload_evidence(
    credential_id: str = Form(...),
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    if current_user["role"] not in ["issuer", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized to upload evidence")

    cred_clean = credential_id.strip().upper()
    cursor = db.cursor()
    cursor.execute(
        """
        SELECT c.CredentialId, c.InstitutionId, c.ProgramId, c.StudentName, c.StudentEmail, c.IssueDate,
               i.PrivateKeyPem, i.PublicKeyPem, i.KeyFingerprint
        FROM   Credentials c
        JOIN   Institutions i ON c.InstitutionId = i.InstitutionId
        WHERE  c.CredentialId = ?
        """,
        (cred_clean,)
    )
    cred_row = cursor.fetchone()
    if not cred_row:
        raise HTTPException(status_code=404, detail="Credential not found")

    try:
        contents = file.file.read()
        evidence_result = storage_service.upload_evidence_file(
            credential_id=cred_clean,
            file_bytes=contents,
            original_filename=file.filename or "evidence.bin",
            content_type=file.content_type or "application/octet-stream",
        )

        cursor.execute(
            """
            INSERT INTO CredentialEvidence (CredentialId, BlobUrl, FileName, FileHash, ContentType)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                cred_clean,
                evidence_result["storage_key"],
                evidence_result["file_name"],
                evidence_result["file_hash"],
                evidence_result["content_type"],
            ),
        )

        # Cryptographically re-sign credential to bind the evidence hash into the university signature!
        if cred_row["PrivateKeyPem"]:
            canonical_payload = {
                "credential_id":  cred_clean,
                "institution_id": cred_row["InstitutionId"],
                "program_id":     cred_row["ProgramId"],
                "student_name":   cred_row["StudentName"],
                "student_email":  cred_row["StudentEmail"],
                "issue_date":     cred_row["IssueDate"],
                "evidence_hash":  evidence_result["file_hash"],
            }
            sig_hex, digest = crypto_service.sign_credential(cred_row["PrivateKeyPem"], canonical_payload)
            cursor.execute(
                """
                INSERT INTO CredentialSignatures
                    (CredentialId, InstitutionId, Algorithm, PublicKeyPem, KeyFingerprint, SignatureHex, PayloadDigest)
                VALUES (?, ?, 'ECDSA-SECP256R1-SHA256', ?, ?, ?, ?)
                ON CONFLICT(CredentialId) DO UPDATE SET
                    SignatureHex = excluded.SignatureHex,
                    PayloadDigest = excluded.PayloadDigest,
                    SignedAt = CURRENT_TIMESTAMP
                """,
                (cred_clean, cred_row["InstitutionId"], cred_row["PublicKeyPem"], cred_row["KeyFingerprint"], sig_hex, digest)
            )

        cursor.execute(
            """
            INSERT INTO AuditLogs (ActorUserId, Action, EntityType, EntityId, Details)
            VALUES (?, 'EVIDENCE_UPLOADED', 'CredentialEvidence', ?, ?)
            """,
            (
                current_user["user_id"],
                cred_clean,
                f"Attached certified evidence {evidence_result['file_name']} (SHA-256: {evidence_result['file_hash'][:16]}...)",
            ),
        )
        db.commit()

        return {
            "message": "Certified academic evidence uploaded and cryptographically bound to credential signature.",
            "evidence": {
                "credential_id":     cred_clean,
                "file_name":         evidence_result["file_name"],
                "file_hash":         evidence_result["file_hash"],
                "content_type":      evidence_result["content_type"],
                "storage_provider":  evidence_result["storage_provider"],
                "is_cloud":          evidence_result["is_cloud"],
                "view_url":          evidence_result["view_url"],
                "uploaded_at":       datetime.utcnow().isoformat() + "Z",
            },
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Evidence upload failed: {str(e)}")


@app.get("/api/credentials/{credential_id}/evidence")
def list_credential_evidence(
    credential_id: str,
    db: sqlite3.Connection = Depends(get_db),
):
    cursor = db.cursor()
    cursor.execute(
        """
        SELECT EvidenceId, CredentialId, BlobUrl, FileName, FileHash, ContentType, UploadedAt
        FROM   CredentialEvidence
        WHERE  CredentialId = ?
        ORDER  BY UploadedAt DESC
        """,
        (credential_id.strip().upper(),)
    )
    rows = cursor.fetchall()
    return [
        {
            "evidence_id":   r["EvidenceId"],
            "credential_id": r["CredentialId"],
            "file_name":     r["FileName"],
            "file_hash":     r["FileHash"],
            "content_type":  r["ContentType"],
            "uploaded_at":   r["UploadedAt"],
            "view_url":      storage_service.get_fresh_view_url(r["BlobUrl"]),
        }
        for r in rows
    ]


@app.get("/api/evidence/download/{token}")
def download_evidence_file(
    token: str,
    db: sqlite3.Connection = Depends(get_db),
):
    """
    Secure Evidence Download Gateway.
    Verifies cryptographic expiring SAS token and streams the certified document.
    """
    verified = storage_service.verify_local_sas_token(token)
    if not verified:
        raise HTTPException(
            status_code=403,
            detail="The evidence access link is invalid or has expired (SAS tokens expire after 60 minutes). Please refresh the verification page to generate a new link."
        )

    file_id, expires_at = verified
    file_path = storage_service.get_local_file_path(file_id)
    if not file_path:
        raise HTTPException(status_code=404, detail="Evidence document not found in storage archive.")

    cursor = db.cursor()
    cursor.execute(
        "SELECT FileName, ContentType FROM CredentialEvidence WHERE BlobUrl = ?",
        (file_id,)
    )
    row = cursor.fetchone()
    filename = row["FileName"] if row else os.path.basename(file_path)
    content_type = row["ContentType"] if row else "application/pdf"

    return FileResponse(
        path=file_path,
        media_type=content_type,
        filename=filename,
        headers={"Content-Disposition": f'inline; filename="{filename}"'}
    )


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


# ─── NOTIFICATIONS & EMAIL AUDIT ──────────────────────────────────────────────

@app.get("/api/notifications/emails")
def list_dispatched_emails(
    limit: int = 20,
    current_user: dict = Depends(get_current_user),
):
    return {
        "emails": email_service.get_sent_emails(limit=limit),
        "total": len(email_service._sent_emails_store),
    }


@app.delete("/api/notifications/emails")
def clear_dispatched_emails(
    current_user: dict = Depends(get_current_user),
):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    email_service.clear_sent_emails()
    return {"message": "Email notification history cleared"}


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
