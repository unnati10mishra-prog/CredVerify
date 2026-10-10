from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import date, datetime


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str


class CredentialIssue(BaseModel):
    """
    Frontend sends program_name (string) — backend resolves to ProgramId via lookup.
    institution_id defaults to 1 (Apex Institute of Technology) for the demo.
    """
    student_name: str
    student_email: EmailStr
    program_name: str
    degree_type: str
    issue_date: date
    institution_id: int = 1


class CredentialRevoke(BaseModel):
    reason: str


class VerificationResult(BaseModel):
    credential_id: str
    status: str
    student_name: Optional[str] = None
    issue_date: Optional[date] = None
    program_name: Optional[str] = None
    degree_type: Optional[str] = None
    institution_name: Optional[str] = None
    revocation_reason: Optional[str] = None
    revoked_at: Optional[datetime] = None
    verified_at: Optional[str] = None
    tamper_evident_hash: Optional[str] = None


class StudentRegister(BaseModel):
    full_name: str
    email: EmailStr
    password: str


class InstitutionApply(BaseModel):
    institution_name: str
    code: str
    domain: str
    contact_email: EmailStr
    admin_full_name: str
    admin_email: EmailStr
    password: str


class StaffInviteCreate(BaseModel):
    email: EmailStr
    full_name: str
    role_name: str = "issuer"


class StaffInviteAccept(BaseModel):
    token: str
    password: str
    full_name: Optional[str] = None


class ApplicationReview(BaseModel):
    notes: Optional[str] = None

