/**
 * CredVerify API Service
 * All calls go to the real FastAPI backend at http://localhost:5000
 * JWT token is stored in localStorage after login.
 */
import type { Credential, VerificationResult, AuditLogItem, User } from '../types';

const API_BASE = 'http://localhost:5000';

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
    }>(res);

    return {
      status:            data.status === 'ACTIVE' ? 'VALID' : data.status,
      credentialId:      data.credential_id,
      studentName:       data.student_name,
      programName:       data.program_name,
      degreeType:        data.degree_type,
      institutionName:   data.institution_name,
      issueDate:         data.issue_date,
      revokedAt:         data.revoked_at,
      revocationReason:  data.revocation_reason,
      verifiedAt:        data.verified_at,
      tamperEvidentHash: data.tamper_evident_hash,
    };
  } catch (e) {
    // Network error — backend not running
    if (e instanceof TypeError && e.message.includes('fetch')) {
      return {
        status:      'NOT_FOUND',
        credentialId: clean,
      };
    }
    throw e;
  }
}

// ─── CREDENTIAL MANAGEMENT ────────────────────────────────────────────────────

export async function fetchCredentials(): Promise<Credential[]> {
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
    }>
  >(res);

  return data.map((c) => ({
    credentialId:    c.credential_id,
    studentName:     c.student_name,
    studentEmail:    c.student_email,
    programId:       0,
    programName:     c.program_name,
    degreeType:      c.degree_type,
    institutionId:   1,
    institutionName: 'Apex Institute of Technology',
    issueDate:       c.issue_date,
    status:          c.status as 'ACTIVE' | 'REVOKED',
  }));
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

// ─── AUDIT LOGS ───────────────────────────────────────────────────────────────

export async function fetchAuditLogs(): Promise<AuditLogItem[]> {
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
}
