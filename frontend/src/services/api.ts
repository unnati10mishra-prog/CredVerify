import type { Credential, VerificationResult, AuditLogItem, User } from '../types';

const INITIAL_MOCK_CREDENTIALS: Credential[] = [
  {
    credentialId: 'CRED-2026-CS101',
    studentName: 'Aditi Sharma',
    studentEmail: 'aditi.sharma@apex.edu',
    programId: 1,
    programName: 'Bachelor of Technology in Computer Science',
    degreeType: 'Undergraduate',
    institutionId: 10,
    institutionName: 'Apex Institute of Technology',
    issueDate: '2026-05-15',
    status: 'ACTIVE',
    evidence: {
      evidenceId: 101,
      credentialId: 'CRED-2026-CS101',
      fileName: 'btech_cs_transcript_verified.pdf',
      blobUrl: 'https://credverifystorage.blob.core.windows.net/evidence/btech_cs.pdf',
      fileHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      contentType: 'application/pdf',
      uploadedAt: '2026-05-15T10:30:00Z',
    },
  },
  {
    credentialId: 'CRED-2025-ME402',
    studentName: 'Rahul Verma',
    studentEmail: 'rahul.verma@apex.edu',
    programId: 2,
    programName: 'Bachelor of Technology in Mechanical Engineering',
    degreeType: 'Undergraduate',
    institutionId: 10,
    institutionName: 'Apex Institute of Technology',
    issueDate: '2025-06-20',
    status: 'REVOKED',
    revokedAt: '2026-02-14T11:20:00Z',
    revocationReason: 'Academic integrity violation: falsified examination records.',
    evidence: {
      evidenceId: 102,
      credentialId: 'CRED-2025-ME402',
      fileName: 'mech_eng_certificate.pdf',
      blobUrl: 'https://credverifystorage.blob.core.windows.net/evidence/mech_eng.pdf',
      fileHash: '8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4',
      contentType: 'application/pdf',
      uploadedAt: '2025-06-20T14:15:00Z',
    },
  },
  {
    credentialId: 'CRED-2026-AI990',
    studentName: 'Priya Nair',
    studentEmail: 'priya.nair@apex.edu',
    programId: 3,
    programName: 'Master of Science in Artificial Intelligence',
    degreeType: 'Postgraduate',
    institutionId: 10,
    institutionName: 'Apex Institute of Technology',
    issueDate: '2026-08-10',
    status: 'ACTIVE',
    evidence: {
      evidenceId: 103,
      credentialId: 'CRED-2026-AI990',
      fileName: 'ms_ai_degree.pdf',
      blobUrl: 'https://credverifystorage.blob.core.windows.net/evidence/ms_ai.pdf',
      fileHash: 'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb',
      contentType: 'application/pdf',
      uploadedAt: '2026-08-10T09:00:00Z',
    },
  },
];

const INITIAL_MOCK_AUDIT_LOGS: AuditLogItem[] = [
  {
    auditId: 1001,
    actor: 'Dr. Sarah Jenkins (Institution Issuer)',
    action: 'CREDENTIAL_ISSUED',
    entityType: 'Credential',
    entityId: 'CRED-2026-CS101',
    details: 'Issued Bachelor of Technology degree to Aditi Sharma. Evidence SHA-256 registered.',
    ipAddress: '192.168.1.42',
    timestamp: '2026-05-15T10:30:12Z',
  },
  {
    auditId: 1002,
    actor: 'Dr. Sarah Jenkins (Institution Issuer)',
    action: 'CREDENTIAL_REVOKED',
    entityType: 'Credential',
    entityId: 'CRED-2025-ME402',
    details: 'Status changed to REVOKED. Reason: Academic integrity violation: falsified examination records.',
    ipAddress: '192.168.1.42',
    timestamp: '2026-02-14T11:20:00Z',
  },
  {
    auditId: 1003,
    actor: 'System Verifier Engine',
    action: 'PUBLIC_VERIFICATION_CHECK',
    entityType: 'Verification',
    entityId: 'CRED-2026-CS101',
    details: 'Employer scanned QR code. Verification result returned: VALID.',
    ipAddress: '203.0.113.19',
    timestamp: '2026-10-10T08:45:22Z',
  },
];

// Helper to get stored credentials or fallback
function getStoredCredentials(): Credential[] {
  const data = localStorage.getItem('credverify_credentials');
  if (data) {
    try {
      return JSON.parse(data);
    } catch {
      // fallback
    }
  }
  localStorage.setItem('credverify_credentials', JSON.stringify(INITIAL_MOCK_CREDENTIALS));
  return INITIAL_MOCK_CREDENTIALS;
}

function saveStoredCredentials(creds: Credential[]): void {
  localStorage.setItem('credverify_credentials', JSON.stringify(creds));
}

// -----------------------------------------------------------------------------
// PUBLIC VERIFICATION API
// -----------------------------------------------------------------------------
export async function verifyCredential(credentialId: string): Promise<VerificationResult> {
  // Simulate network latency (400ms) for realistic UI state transitions
  await new Promise((r) => setTimeout(r, 400));

  const cleanId = credentialId.trim().toUpperCase();
  const creds = getStoredCredentials();
  const match = creds.find((c) => c.credentialId.toUpperCase() === cleanId);

  if (!match) {
    return {
      status: 'NOT_FOUND',
      credentialId: cleanId,
    };
  }

  if (match.status === 'REVOKED') {
    return {
      status: 'REVOKED',
      credentialId: match.credentialId,
      studentName: match.studentName,
      programName: match.programName,
      degreeType: match.degreeType,
      institutionName: match.institutionName,
      issueDate: match.issueDate,
      revokedAt: match.revokedAt,
      revocationReason: match.revocationReason || 'Revoked by issuing authority.',
      verifiedAt: new Date().toISOString(),
      tamperEvidentHash: match.evidence?.fileHash,
    };
  }

  return {
    status: 'VALID',
    credentialId: match.credentialId,
    studentName: match.studentName,
    programName: match.programName,
    degreeType: match.degreeType,
    institutionName: match.institutionName,
    issueDate: match.issueDate,
    verifiedAt: new Date().toISOString(),
    tamperEvidentHash: match.evidence?.fileHash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  };
}

// -----------------------------------------------------------------------------
// CREDENTIAL MANAGEMENT API (For Issuer/Staff)
// -----------------------------------------------------------------------------
export async function fetchCredentials(): Promise<Credential[]> {
  await new Promise((r) => setTimeout(r, 300));
  return getStoredCredentials();
}

export async function issueCredential(data: {
  studentName: string;
  studentEmail: string;
  programName: string;
  degreeType: string;
  issueDate: string;
}): Promise<Credential> {
  await new Promise((r) => setTimeout(r, 600));
  const creds = getStoredCredentials();
  const idNumber = Math.floor(1000 + Math.random() * 9000);
  const newCred: Credential = {
    credentialId: `CRED-2026-NEW${idNumber}`,
    studentName: data.studentName,
    studentEmail: data.studentEmail,
    programId: 1,
    programName: data.programName,
    degreeType: data.degreeType,
    institutionId: 10,
    institutionName: 'Apex Institute of Technology',
    issueDate: data.issueDate || new Date().toISOString().split('T')[0],
    status: 'ACTIVE',
    evidence: {
      evidenceId: Math.floor(Math.random() * 1000),
      credentialId: `CRED-2026-NEW${idNumber}`,
      fileName: `${data.studentName.toLowerCase().replace(/\s+/g, '_')}_degree.pdf`,
      blobUrl: 'https://credverifystorage.blob.core.windows.net/evidence/sample.pdf',
      fileHash: Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      contentType: 'application/pdf',
      uploadedAt: new Date().toISOString(),
    },
  };

  creds.unshift(newCred);
  saveStoredCredentials(creds);
  return newCred;
}

export async function revokeCredential(credentialId: string, reason: string): Promise<Credential> {
  await new Promise((r) => setTimeout(r, 500));
  const creds = getStoredCredentials();
  const index = creds.findIndex((c) => c.credentialId.toUpperCase() === credentialId.toUpperCase());
  if (index === -1) throw new Error('Credential not found');

  creds[index].status = 'REVOKED';
  creds[index].revokedAt = new Date().toISOString();
  creds[index].revocationReason = reason;

  saveStoredCredentials(creds);
  return creds[index];
}

// -----------------------------------------------------------------------------
// AUDIT LOGS API (For Admin)
// -----------------------------------------------------------------------------
export async function fetchAuditLogs(): Promise<AuditLogItem[]> {
  await new Promise((r) => setTimeout(r, 300));
  return INITIAL_MOCK_AUDIT_LOGS;
}

// -----------------------------------------------------------------------------
// AUTHENTICATION API
// -----------------------------------------------------------------------------
export async function mockLogin(role: 'ISSUER' | 'STUDENT' | 'ADMIN'): Promise<User> {
  await new Promise((r) => setTimeout(r, 300));
  if (role === 'ISSUER') {
    return {
      id: 1,
      fullName: 'Dr. Sarah Jenkins',
      email: 's.jenkins@apex.edu',
      role: 'ISSUER',
      institutionId: 10,
      institutionName: 'Apex Institute of Technology',
    };
  } else if (role === 'STUDENT') {
    return {
      id: 2,
      fullName: 'Aditi Sharma',
      email: 'aditi.sharma@apex.edu',
      role: 'STUDENT',
      institutionId: 10,
      institutionName: 'Apex Institute of Technology',
    };
  } else {
    return {
      id: 3,
      fullName: 'Marcus Vance',
      email: 'admin@credverify.gov',
      role: 'ADMIN',
    };
  }
}
