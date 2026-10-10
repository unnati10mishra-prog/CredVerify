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

export interface CredentialEvidence {
  evidenceId: number;
  credentialId: string;
  fileName: string;
  blobUrl: string;
  fileHash: string;
  contentType: string;
  uploadedAt: string;
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
  revocationReason?: string;
  revokedAt?: string;
  evidence?: CredentialEvidence;
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
