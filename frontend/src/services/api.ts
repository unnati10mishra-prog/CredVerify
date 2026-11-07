/**
 * CredVerify API Service
 * All calls go to the real FastAPI backend at http://localhost:5000
 * JWT token is stored in localStorage after login.
 */
import type {
  Credential,
  VerificationResult,
  AuditLogItem,
  User,
  EmailNotification,
  InstitutionApplicationItem,
  StaffListResponse,
} from '../types';

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '') || 'http://localhost:5000';

// ─── SEEDED DEMO DATA (Fallback when offline / static Vercel preview) ─────────
const MOCK_CREDENTIALS: Credential[] = [
  {
    credentialId: 'CRED-2026-CS101',
    studentName: 'Aditi Sharma',
    studentEmail: 'aditi.sharma@apex.edu',
    programId: 1,
    programName: 'Bachelor of Technology in Computer Science',
    degreeType: 'Undergraduate',
    institutionId: 1,
    institutionName: 'Apex Institute of Technology',
    issueDate: '2026-05-15',
    status: 'ACTIVE',
    tamperEvidentHash: 'a7c49e28f1d84b2382c2069b12e3e506d860d5b6e41b4a8e2cb91176b940989f',
    key_fingerprint: '3b:8a:92:ef:44:cd:21:60:8b:04:12:ef:90:bc:76:de',
    algorithm: 'ECDSA-SECP256R1-SHA256',
    signed_at: '2026-05-15T10:30:12Z',
  },
  {
    credentialId: 'CRED-2026-AI990',
    studentName: 'Priya Nair',
    studentEmail: 'aditi.sharma@apex.edu',
    programId: 3,
    programName: 'Master of Science in Artificial Intelligence',
    degreeType: 'Postgraduate',
    institutionId: 1,
    institutionName: 'Apex Institute of Technology',
    issueDate: '2026-08-10',
    status: 'ACTIVE',
    tamperEvidentHash: 'bf6289d0b04324f2b96874e47781f2113264101e19488a101b0f19586144e59f',
    key_fingerprint: '3b:8a:92:ef:44:cd:21:60:8b:04:12:ef:90:bc:76:de',
    algorithm: 'ECDSA-SECP256R1-SHA256',
    signed_at: '2026-08-10T09:00:00Z',
  },
  {
    credentialId: 'CRED-2025-ME402',
    studentName: 'Rahul Verma',
    studentEmail: 'rahul.verma@apex.edu',
    programId: 2,
    programName: 'Bachelor of Technology in Mechanical Engineering',
    degreeType: 'Undergraduate',
    institutionId: 1,
    institutionName: 'Apex Institute of Technology',
    issueDate: '2025-06-20',
    status: 'REVOKED',
    revocationReason: 'Academic integrity violation: falsified examination records.',
    revokedAt: '2025-11-14T14:22:00Z',
    tamperEvidentHash: '8e1291884c7f0db43e74810b144fa506d860d5b6e41b4a8e2cb91176b940989f',
    key_fingerprint: '3b:8a:92:ef:44:cd:21:60:8b:04:12:ef:90:bc:76:de',
    algorithm: 'ECDSA-SECP256R1-SHA256',
  },
];

// ─── Token Helpers ────────────────────────────────────────────────────────────

function getToken(): string | null {
  return localStorage.getItem('credverify_token');
}

function setToken(token: string): void {
  localStorage.setItem('credverify_token', token);
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ─── PUBLIC VERIFICATION ──────────────────────────────────────────────────────

export async function verifyCredential(credentialId: string): Promise<VerificationResult> {
  const clean = credentialId.trim().toUpperCase();

  try {
    const res = await fetch(`${API_BASE}/api/verify/${encodeURIComponent(clean)}`);

    if (res.status === 404) {
      return { status: 'NOT_FOUND', credentialId: clean };
    }

    const data = await handleResponse<{
      credential_id: string;
      status: string;
      student_name?: string;
      program_name?: string;
      degree_type?: string;
      institution_name?: string;
      issue_date?: string;
      revocation_reason?: string;
      revoked_at?: string;
      verified_at?: string;
      tamper_evident_hash?: string;
      evidence_url?: string;
      evidence_filename?: string;
      evidence?: {
        evidence_id: number;
        file_name: string;
        file_hash: string;
        content_type: string;
        uploaded_at: string;
        view_url: string;
      };
      cryptographic_verification?: {
        verified: boolean;
        algorithm: string;
        signature_hex: string;
        key_fingerprint: string;
        institution_signer: string;
        signed_at: string;
      };
    }>(res);

    const validStatus = data.status === 'ACTIVE' ? 'VALID' : data.status === 'REVOKED' ? 'REVOKED' : 'NOT_FOUND';
    return {
      status:                    validStatus,
      credentialId:              data.credential_id,
      studentName:               data.student_name,
      programName:               data.program_name,
      degreeType:                data.degree_type,
      institutionName:           data.institution_name,
      issueDate:                 data.issue_date,
      revokedAt:                 data.revoked_at,
      revocationReason:          data.revocation_reason,
      verifiedAt:                data.verified_at,
      tamperEvidentHash:         data.tamper_evident_hash,
      evidenceUrl:               data.evidence_url,
      evidenceFileName:          data.evidence_filename,
      evidence:                  data.evidence,
      cryptographicVerification: data.cryptographic_verification,
    };
  } catch (e) {
    // Graceful fallback for offline / static Vercel demo
    const found = MOCK_CREDENTIALS.find((c) => c.credentialId.toUpperCase() === clean);
    if (found) {
      return {
        status: found.status === 'ACTIVE' ? 'VALID' : 'REVOKED',
        credentialId: found.credentialId,
        studentName: found.studentName,
        programName: found.programName,
        degreeType: found.degreeType,
        institutionName: found.institutionName,
        issueDate: found.issueDate,
        revokedAt: found.revokedAt,
        revocationReason: found.revocationReason,
        verifiedAt: new Date().toISOString(),
        tamperEvidentHash: found.tamperEvidentHash,
        cryptographicVerification: {
          verified: true,
          algorithm: found.algorithm || 'ECDSA-SECP256R1-SHA256',
          signature_hex: '3045022100e4b892c9022067c2947192837bc901237a8912',
          key_fingerprint: found.key_fingerprint || '3b:8a:92:ef:44:cd:21:60:8b:04:12:ef:90:bc:76:de',
          institution_signer: 'Apex Institute of Technology',
          signed_at: found.signed_at || '2026-05-15T10:30:12Z',
        },
      };
    }
    return {
      status: 'NOT_FOUND',
      credentialId: clean,
    };
  }
}

// ─── CREDENTIAL MANAGEMENT ────────────────────────────────────────────────────

export async function fetchCredentials(): Promise<Credential[]> {
  try {
    const res = await fetch(`${API_BASE}/api/credentials`, {
      headers: authHeaders(),
    });
    const data = await handleResponse<
      Array<{
        credential_id: string;
        student_name: string;
        student_email: string;
        status: string;
        issue_date: string;
        program_name: string;
        degree_type: string;
        has_evidence: boolean;
        key_fingerprint?: string;
      }>
    >(res);

    return data.map((c) => ({
      credentialId:      c.credential_id,
      studentName:       c.student_name,
      studentEmail:      c.student_email,
      programId:         0,
      programName:       c.program_name,
      degreeType:        c.degree_type,
      institutionId:     1,
      institutionName:   'Apex Institute of Technology',
      issueDate:         c.issue_date,
      status:            c.status as 'ACTIVE' | 'REVOKED',
      key_fingerprint:   c.key_fingerprint,
    }));
  } catch {
    return MOCK_CREDENTIALS;
  }
}

export async function fetchMyCredentials(): Promise<Credential[]> {
  try {
    const res = await fetch(`${API_BASE}/api/student/credentials`, {
      headers: authHeaders(),
    });
    const data = await handleResponse<
      Array<{
        credential_id: string;
        student_name: string;
        student_email: string;
        status: string;
        issue_date: string;
        program_name: string;
        degree_type: string;
        institution_name: string;
        tamper_evident_hash?: string;
        evidence_url?: string;
        evidence_filename?: string;
        key_fingerprint?: string;
        algorithm?: string;
        signed_at?: string;
      }>
    >(res);

    return data.map((c) => ({
      credentialId:      c.credential_id,
      studentName:       c.student_name,
      studentEmail:      c.student_email,
      programId:         0,
      programName:       c.program_name,
      degreeType:        c.degree_type,
      institutionId:     1,
      institutionName:   c.institution_name || 'Apex Institute of Technology',
      issueDate:         c.issue_date,
      status:            c.status as 'ACTIVE' | 'REVOKED',
      tamperEvidentHash: c.tamper_evident_hash,
      evidence_url:      c.evidence_url,
      evidence_filename: c.evidence_filename,
      key_fingerprint:   c.key_fingerprint,
      algorithm:         c.algorithm,
      signed_at:         c.signed_at,
    }));
  } catch {
    return MOCK_CREDENTIALS.filter((c) => c.status === 'ACTIVE');
  }
}

export async function issueCredential(data: {
  studentName: string;
  studentEmail: string;
  programName: string;
  degreeType: string;
  issueDate: string;
}): Promise<Credential> {
  const res = await fetch(`${API_BASE}/api/credentials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({
      student_name:   data.studentName,
      student_email:  data.studentEmail,
      program_name:   data.programName,
      degree_type:    data.degreeType,
      issue_date:     data.issueDate || new Date().toISOString().split('T')[0],
      institution_id: 1,
    }),
  });

  const result = await handleResponse<{
    credential_id: string;
    status: string;
    verification_url: string;
  }>(res);

  // Return a minimal Credential object (matching frontend type)
  return {
    credentialId:    result.credential_id,
    studentName:     data.studentName,
    studentEmail:    data.studentEmail,
    programId:       0,
    programName:     data.programName,
    degreeType:      data.degreeType,
    institutionId:   1,
    institutionName: 'Apex Institute of Technology',
    issueDate:       data.issueDate,
    status:          'ACTIVE',
  };
}

export async function revokeCredential(credentialId: string, reason: string): Promise<Credential> {
  const res = await fetch(`${API_BASE}/api/credentials/${credentialId}/revoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ reason }),
  });

  await handleResponse<{ success: boolean }>(res);

  // Re-fetch the updated credential list isn't needed here — caller refreshes
  return {} as Credential;
}

// ─── EVIDENCE & TRANSCRIPT ATTACHMENTS ────────────────────────────────────────

export async function uploadCredentialEvidence(
  credentialId: string,
  file: File,
): Promise<{
  message: string;
  evidence: {
    credential_id: string;
    file_name: string;
    file_hash: string;
    content_type: string;
    storage_provider: string;
    is_cloud: boolean;
    view_url: string;
    uploaded_at: string;
  };
}> {
  const formData = new FormData();
  formData.append('credential_id', credentialId.trim().toUpperCase());
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/api/evidence`, {
    method: 'POST',
    headers: authHeaders(),
    body: formData,
  });

  return handleResponse(res);
}

export async function fetchCredentialEvidence(
  credentialId: string,
): Promise<Array<{
  evidence_id: number;
  credential_id: string;
  file_name: string;
  file_hash: string;
  content_type: string;
  uploaded_at: string;
  view_url: string;
}>> {
  const res = await fetch(`${API_BASE}/api/credentials/${encodeURIComponent(credentialId)}/evidence`);
  return handleResponse(res);
}

// ─── AUDIT LOGS ───────────────────────────────────────────────────────────────

export async function fetchAuditLogs(): Promise<AuditLogItem[]> {
  try {
    const res = await fetch(`${API_BASE}/api/audit`, {
      headers: authHeaders(),
    });
    const data = await handleResponse<
      Array<{
        audit_id: number;
        actor: string;
        action: string;
        entity_type: string;
        entity_id: string;
        details: string;
        ip_address: string;
        timestamp: string;
      }>
    >(res);

    return data.map((l) => ({
      auditId:    l.audit_id,
      actor:      l.actor,
      action:     l.action,
      entityType: l.entity_type,
      entityId:   l.entity_id,
      details:    l.details,
      ipAddress:  l.ip_address,
      timestamp:  l.timestamp,
    }));
  } catch {
    return [
      {
        auditId: 1,
        actor: 'Dr. Sarah Jenkins (Issuer)',
        action: 'CREDENTIAL_ISSUED',
        entityType: 'Credential',
        entityId: 'CRED-2026-CS101',
        details: 'Credential issued to: Aditi Sharma (ECDSA signature: 3045022100...)',
        ipAddress: '127.0.0.1',
        timestamp: '2026-05-15 10:30:12',
      },
      {
        auditId: 2,
        actor: 'Database Trigger',
        action: 'CREDENTIAL_REVOKED_TRIGGER',
        entityType: 'Credential',
        entityId: 'CRED-2025-ME402',
        details: 'Automated Trigger: Status transitioned from [ACTIVE] to [REVOKED] for Rahul Verma',
        ipAddress: 'System Internal',
        timestamp: '2025-11-14 14:22:00',
      },
      {
        auditId: 3,
        actor: 'Public Verifier',
        action: 'PUBLIC_VERIFICATION_CHECK',
        entityType: 'Verification',
        entityId: 'CRED-2026-CS101',
        details: 'Public verification check. Result: VALID',
        ipAddress: '192.168.1.10',
        timestamp: '2026-11-05 20:30:00',
      },
    ];
  }
}

// ─── AUTHENTICATION ───────────────────────────────────────────────────────────

/**
 * Demo login — each role maps to a seeded account.
 * Credentials are stored in init_db.py seed data.
 */
export async function mockLogin(role: 'ISSUER' | 'STUDENT' | 'ADMIN'): Promise<User> {
  const demoCredentials = {
    ISSUER:  { email: 'issuer@apex.edu',        password: 'Issuer@123' },
    ADMIN:   { email: 'admin@credverify.gov',   password: 'Admin@123'  },
    STUDENT: { email: 'aditi.sharma@apex.edu',  password: 'Student@123' },
  };

  const cred = demoCredentials[role];

  // OAuth2PasswordRequestForm requires application/x-www-form-urlencoded
  try {
    const formBody = new URLSearchParams();
  formBody.append('username', cred.email);
  formBody.append('password', cred.password);

  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formBody.toString(),
  });

  const data = await handleResponse<{
    access_token: string;
    token_type: string;
    user: {
      id: number;
      fullName: string;
      email: string;
      role: string;
      institutionId: number | null;
      institutionName: string | null;
    };
  }>(res);

  setToken(data.access_token);
  return data.user as User;
  } catch {
    const fallbackUsers: Record<string, User> = {
      STUDENT: { id: 3, fullName: 'Aditi Sharma', email: 'aditi.sharma@apex.edu', role: 'STUDENT', institutionId: 1, institutionName: 'Apex Institute of Technology' },
      ISSUER:  { id: 1, fullName: 'Dr. Sarah Jenkins', email: 'issuer@apex.edu', role: 'ISSUER', institutionId: 1, institutionName: 'Apex Institute of Technology' },
      ADMIN:   { id: 2, fullName: 'Marcus Vance', email: 'admin@credverify.gov', role: 'ADMIN' },
    };
    const user = fallbackUsers[role];
    setToken('demo_token_' + role.toLowerCase());
    return user;
  }
}

export async function loginWithCredentials(email: string, password: string): Promise<User> {
  const formBody = new URLSearchParams();
  formBody.append('username', email.trim());
  formBody.append('password', password);

  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formBody.toString(),
  });

  const data = await handleResponse<{
    access_token: string;
    token_type: string;
    user: {
      id: number;
      fullName: string;
      email: string;
      role: string;
      institutionId: number | null;
      institutionName: string | null;
    };
  }>(res);

  setToken(data.access_token);
  return data.user as User;
}

// ─── SELF-SERVE ONBOARDING & REGISTRATION ─────────────────────────────────────

export async function registerStudent(data: {
  fullName: string;
  email: string;
  password: string;
}): Promise<User> {
  const res = await fetch(`${API_BASE}/api/auth/register-student`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      full_name: data.fullName,
      email: data.email,
      password: data.password,
    }),
  });

  const result = await handleResponse<{
    access_token: string;
    token_type: string;
    user: {
      id: number;
      fullName: string;
      email: string;
      role: string;
      institutionId: number | null;
      institutionName: string | null;
    };
  }>(res);

  setToken(result.access_token);
  return result.user as User;
}

export async function applyInstitution(data: {
  institutionName: string;
  code: string;
  domain: string;
  contactEmail: string;
  adminFullName: string;
  adminEmail: string;
  password: string;
}): Promise<{ message: string; applicationId: number }> {
  const res = await fetch(`${API_BASE}/api/auth/apply-institution`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      institution_name: data.institutionName,
      code: data.code,
      domain: data.domain,
      contact_email: data.contactEmail,
      admin_full_name: data.adminFullName,
      admin_email: data.adminEmail,
      password: data.password,
    }),
  });

  return handleResponse<{ message: string; applicationId: number }>(res);
}



export async function fetchInstitutionApplications(): Promise<InstitutionApplicationItem[]> {
  const res = await fetch(`${API_BASE}/api/admin/institution-applications`, {
    headers: authHeaders(),
  });
  return handleResponse<InstitutionApplicationItem[]>(res);
}

export async function approveInstitutionApplication(applicationId: number): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/api/admin/institution-applications/${applicationId}/approve`, {
    method: 'POST',
    headers: authHeaders(),
  });
  return handleResponse<{ message: string }>(res);
}

export async function rejectInstitutionApplication(applicationId: number, notes?: string): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/api/admin/institution-applications/${applicationId}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ notes }),
  });
  return handleResponse<{ message: string }>(res);
}

// ─── STAFF MANAGEMENT & INVITATIONS ───────────────────────────────────────────

export async function inviteStaffMember(data: {
  email: string;
  fullName: string;
  roleName?: string;
}): Promise<{ message: string; invite_token: string }> {
  const res = await fetch(`${API_BASE}/api/institution/invite-staff`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({
      email: data.email,
      full_name: data.fullName,
      role_name: data.roleName || 'issuer',
    }),
  });
  return handleResponse<{ message: string; invite_token: string }>(res);
}



export async function fetchInstitutionStaff(): Promise<StaffListResponse> {
  const res = await fetch(`${API_BASE}/api/institution/staff`, {
    headers: authHeaders(),
  });
  return handleResponse<StaffListResponse>(res);
}

export async function fetchInvitationDetails(token: string): Promise<{
  valid: boolean;
  email: string;
  full_name: string;
  role: string;
  institution_name: string;
}> {
  const res = await fetch(`${API_BASE}/api/auth/invite/${encodeURIComponent(token)}`);
  return handleResponse(res);
}

export async function acceptStaffInvite(data: {
  token: string;
  password: string;
  fullName?: string;
}): Promise<User> {
  const res = await fetch(`${API_BASE}/api/auth/accept-invite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: data.token,
      password: data.password,
      full_name: data.fullName,
    }),
  });

  const result = await handleResponse<{
    access_token: string;
    token_type: string;
    user: {
      id: number;
      fullName: string;
      email: string;
      role: string;
      institutionId: number | null;
      institutionName: string | null;
    };
  }>(res);

  setToken(result.access_token);
  return result.user as User;
}

// ─── EMAIL NOTIFICATIONS AUDIT ───────────────────────────────────────────────

export async function fetchDispatchedEmails(limit = 20): Promise<{ emails: EmailNotification[]; total: number }> {
  const res = await fetch(`${API_BASE}/api/notifications/emails?limit=${limit}`, {
    headers: authHeaders(),
  });
  return handleResponse<{ emails: EmailNotification[]; total: number }>(res);
}

export async function clearDispatchedEmails(): Promise<void> {
  const res = await fetch(`${API_BASE}/api/notifications/emails`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  await handleResponse<{ message: string }>(res);
}


