export type UserRole = 'STUDENT' | 'ISSUER' | 'VERIFIER' | 'ADMIN';

export type CredentialStatus = 'ACTIVE' | 'REVOKED' | 'SUSPENDED';

export type VerificationState = 'VALID' | 'REVOKED' | 'NOT_FOUND' | 'IDLE' | 'LOADING';

export interface User {
  id: number;
  fullName: string;
  email: string;
  role: UserRole;
  institutionId?: number;
  institutionName?: string;
}

export interface CryptographicVerification {
  verified: boolean;
  algorithm: string;
  signature_hex: string;
  key_fingerprint: string;
  institution_signer: string;
  signed_at: string;
}

export interface CredentialEvidence {
  evidenceId: number;
  credentialId: string;
  fileName: string;
  blobUrl: string;
  fileHash: string;
  contentType: string;
  uploadedAt: string;
  view_url?: string;
}

export interface Credential {
  credentialId: string;
  studentName: string;
  studentEmail: string;
  programId: number;
  programName: string;
  degreeType: string;
  institutionId: number;
  institutionName: string;
  issueDate: string;
  status: CredentialStatus;
  qrCode?: string;
  tamperEvidentHash?: string;
  revocationReason?: string;
  revokedAt?: string;
  evidence?: CredentialEvidence;
  evidence_url?: string;
  evidence_filename?: string;
  key_fingerprint?: string;
  algorithm?: string;
  signed_at?: string;
}

export interface VerificationResult {
  status: 'VALID' | 'REVOKED' | 'NOT_FOUND';
  credentialId: string;
  studentName?: string;
  programName?: string;
  degreeType?: string;
  institutionName?: string;
  issueDate?: string;
  verifiedAt?: string;
  revocationReason?: string;
  revokedAt?: string;
  tamperEvidentHash?: string;
  evidenceUrl?: string;
  evidenceFileName?: string;
  evidence?: {
    evidence_id: number;
    file_name: string;
    file_hash: string;
    content_type: string;
    uploaded_at: string;
    view_url: string;
  };
  cryptographicVerification?: CryptographicVerification;
}

export interface AuditLogItem {
  auditId: number;
  actor: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  ipAddress: string;
  timestamp: string;
}

export interface EmailNotification {
  id: number;
  recipient: string;
  subject: string;
  html_body: string;
  text_body: string;
  sent_at: string;
  transport: 'SMTP' | 'MOCK_CONSOLE';
  status: string;
  error?: string | null;
}

export interface InstitutionApplicationItem {
  application_id: number;
  institution_name: string;
  code: string;
  domain: string;
  contact_email: string;
  admin_full_name: string;
  admin_email: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  notes?: string;
  created_at: string;
  reviewed_at?: string;
}

export interface StaffListResponse {
  members: Array<{
    user_id: number;
    full_name: string;
    email: string;
    role: string;
    is_active: boolean;
    created_at: string;
  }>;
  invitations: Array<{
    invitation_id: number;
    full_name: string;
    email: string;
    role: string;
    status: string;
    created_at: string;
  }>;
}


