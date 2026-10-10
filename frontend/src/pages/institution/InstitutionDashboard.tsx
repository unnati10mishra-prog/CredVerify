import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Search,
  ExternalLink,
  Ban,
  FileBadge,
  CheckCircle2,
  AlertTriangle,
  Upload,
  X,
  UserPlus,
  Users,
  Mail,
  FileText,
} from 'lucide-react';
import {
  fetchCredentials,
  issueCredential,
  revokeCredential,
  inviteStaffMember,
  fetchInstitutionStaff,
  uploadCredentialEvidence,
} from '../../services/api';
import type { Credential, StaffListResponse } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';

export const InstitutionDashboard: React.FC = () => {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Staff Modal State
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [staffData, setStaffData] = useState<StaffListResponse | null>(null);
  const [inviteStaffName, setInviteStaffName] = useState('');
  const [inviteStaffEmail, setInviteStaffEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  // Issue Modal State
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [issueLoading, setIssueLoading] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [newProgramName, setNewProgramName] = useState('Bachelor of Technology in Computer Science');
  const [newDegreeType, setNewDegreeType] = useState('Undergraduate');
  const [newIssueDate, setNewIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedEvidenceFile, setSelectedEvidenceFile] = useState<File | null>(null);

  // Evidence Attach Modal State (for existing credentials)
  const [evidenceUploadTarget, setEvidenceUploadTarget] = useState<Credential | null>(null);
  const [targetEvidenceFile, setTargetEvidenceFile] = useState<File | null>(null);
  const [targetUploadLoading, setTargetUploadLoading] = useState(false);

  // Revoke Modal State
  const [selectedForRevoke, setSelectedForRevoke] = useState<Credential | null>(null);
  const [revokeReason, setRevokeReason] = useState('Academic integrity violation: falsified examination records.');
  const [revokeLoading, setRevokeLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchCredentials();
      setCredentials(data);
    } finally {
      setLoading(false);
    }
  };

  const loadStaff = async () => {
    try {
      const data = await fetchInstitutionStaff();
      setStaffData(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIssueLoading(true);
    try {
      const created = await issueCredential({
        studentName: newStudentName,
        studentEmail: newStudentEmail,
        programName: newProgramName,
        degreeType: newDegreeType,
        issueDate: newIssueDate,
      });

      // If user selected an evidence document, upload it immediately
      if (selectedEvidenceFile && created.credentialId) {
        try {
          await uploadCredentialEvidence(created.credentialId, selectedEvidenceFile);
        } catch (uploadErr) {
          console.warn('Evidence file upload warning:', uploadErr);
        }
      }

      setIsIssueModalOpen(false);
      setNewStudentName('');
      setNewStudentEmail('');
      setSelectedEvidenceFile(null);
      await loadData();
    } finally {
      setIssueLoading(false);
    }
  };

  const handleAttachEvidenceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evidenceUploadTarget || !targetEvidenceFile) return;
    setTargetUploadLoading(true);
    try {
      await uploadCredentialEvidence(evidenceUploadTarget.credentialId, targetEvidenceFile);
      setEvidenceUploadTarget(null);
      setTargetEvidenceFile(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to upload evidence file.');
    } finally {
      setTargetUploadLoading(false);
    }
  };

  const handleRevokeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForRevoke) return;
    setRevokeLoading(true);
    try {
      await revokeCredential(selectedForRevoke.credentialId, revokeReason);
      setSelectedForRevoke(null);
      await loadData();
    } finally {
      setRevokeLoading(false);
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteLoading(true);
    setInviteSuccess(null);
    try {
      await inviteStaffMember({
        email: inviteStaffEmail,
        fullName: inviteStaffName,
        roleName: 'issuer',
      });
      setInviteSuccess(`Invitation dispatched to ${inviteStaffEmail}. They will receive an email to activate their account.`);
      setInviteStaffName('');
      setInviteStaffEmail('');
      await loadStaff();
    } catch (err: any) {
      alert(err.message || 'Failed to dispatch staff invitation.');
    } finally {
      setInviteLoading(false);
    }
  };

  const filtered = credentials.filter(
    (c) =>
      c.studentName.toLowerCase().includes(search.toLowerCase()) ||
      c.credentialId.toLowerCase().includes(search.toLowerCase()) ||
      c.programName.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = credentials.filter((c) => c.status === 'ACTIVE').length;
  const revokedCount = credentials.filter((c) => c.status === 'REVOKED').length;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 dark:bg-slate-950 py-10 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              <Building2 className="w-4 h-4" /> Apex Institute of Technology &bull; Registrar Portal
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
              Credential Lifecycle Management
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setIsStaffModalOpen(true);
                loadStaff();
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold text-xs transition shadow-sm"
            >
              <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              Team & Staff Invites
            </button>

            <button
              onClick={() => setIsIssueModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs sm:text-sm transition shadow-lg"
            >
              <Plus className="w-4 h-4" />
              Issue New Credential
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Total Issued</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{credentials.length}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <FileBadge className="w-5 h-5" />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Active & Verified</p>
              <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{activeCount}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Revocations</p>
              <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{revokedCount}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <Ban className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student name, ID, or degree..."
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
          />
        </div>

        {/* Credentials Table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/80 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4">Credential ID</th>
                  <th className="px-6 py-4">Student & Email</th>
                  <th className="px-6 py-4">Program / Degree</th>
                  <th className="px-6 py-4">Issue Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-500">
                      Loading credentials from Azure SQL...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-500">
                      No matching credentials found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((cred) => (
                    <tr key={cred.credentialId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      <td className="px-6 py-4 font-mono font-semibold text-blue-600 dark:text-blue-400">
                        {cred.credentialId}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900 dark:text-white">{cred.studentName}</div>
                        <div className="text-[11px] text-slate-500">{cred.studentEmail}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-900 dark:text-white">{cred.programName}</div>
                        <span className="text-[10px] text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                          {cred.degreeType}
                        </span>
                      </td>
                      <td className="px-6 py-4">{cred.issueDate}</td>
                      <td className="px-6 py-4">
                        <StatusBadge status={cred.status} size="sm" />
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => {
                            setEvidenceUploadTarget(cred);
                            setTargetEvidenceFile(null);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-xs transition"
                          title="Attach or inspect certified evidence document"
                        >
                          <FileText className="w-3 h-3" />
                          Evidence
                        </button>
                        <a
                          href={`/verify?id=${cred.credentialId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs transition"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Verify
                        </a>
                        {cred.status === 'ACTIVE' && (
                          <button
                            onClick={() => setSelectedForRevoke(cred)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs transition"
                          >
                            <Ban className="w-3 h-3" />
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Issue Credential Modal */}
      {isIssueModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
            <button
              onClick={() => setIsIssueModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                <FileBadge className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Issue Official Academic Credential</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Creates record via explicit SQL transaction</p>
              </div>
            </div>

            <form onSubmit={handleIssueSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-700 dark:text-slate-300 font-semibold">Student Full Name</label>
                <input
                  type="text"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  placeholder="e.g. Vikramaditya Gupta"
                  required
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-700 dark:text-slate-300 font-semibold">Student Institutional Email</label>
                <input
                  type="email"
                  value={newStudentEmail}
                  onChange={(e) => setNewStudentEmail(e.target.value)}
                  placeholder="e.g. v.gupta@apex.edu"
                  required
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-700 dark:text-slate-300 font-semibold">Degree / Program</label>
                  <select
                    value={newProgramName}
                    onChange={(e) => setNewProgramName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition"
                  >
                    <option>Bachelor of Technology in Computer Science</option>
                    <option>Bachelor of Technology in Mechanical Engineering</option>
                    <option>Master of Science in Artificial Intelligence</option>
                    <option>Master of Business Administration</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-700 dark:text-slate-300 font-semibold">Degree Level</label>
                  <select
                    value={newDegreeType}
                    onChange={(e) => setNewDegreeType(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition"
                  >
                    <option>Undergraduate</option>
                    <option>Postgraduate</option>
                    <option>Doctorate</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-700 dark:text-slate-300 font-semibold">Date of Convocational Issue</label>
                <input
                  type="date"
                  value={newIssueDate}
                  onChange={(e) => setNewIssueDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              {/* Evidence Upload */}
              <div className="p-3.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-center space-y-1.5">
                <Upload className="w-5 h-5 text-blue-600 dark:text-blue-400 mx-auto" />
                <div>
                  <label htmlFor="issue-evidence-upload" className="text-blue-600 dark:text-blue-400 font-semibold text-xs cursor-pointer hover:underline block">
                    {selectedEvidenceFile ? selectedEvidenceFile.name : 'Attach Transcript / Degree PDF (Pillar 4)'}
                  </label>
                  <input
                    id="issue-evidence-upload"
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.docx"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) setSelectedEvidenceFile(e.target.files[0]);
                    }}
                  />
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {selectedEvidenceFile
                      ? `${(selectedEvidenceFile.size / 1024).toFixed(1)} KB — Uploaded to Azure Blob & Signed`
                      : 'Computes SHA-256 seal & binds to university cryptographic signature'}
                  </p>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsIssueModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={issueLoading}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold transition shadow-md"
                >
                  {issueLoading ? 'Issuing in SQL...' : 'Sign & Issue Credential'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Evidence Document Modal */}
      {evidenceUploadTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-blue-500/40 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Attach Certified Evidence</h3>
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-mono">{evidenceUploadTarget.credentialId}</p>
                </div>
              </div>
              <button
                onClick={() => setEvidenceUploadTarget(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Uploading a certified document stores the file in <strong>Azure Blob Storage</strong> with a <strong>SHA-256 tamper-evident seal</strong> and re-signs the credential with the university's ECDSA private key.
            </p>

            <form onSubmit={handleAttachEvidenceSubmit} className="space-y-4 text-xs">
              <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 text-center space-y-2">
                <Upload className="w-6 h-6 text-blue-600 dark:text-blue-400 mx-auto" />
                <div>
                  <label htmlFor="evidence-file-input" className="text-blue-600 dark:text-blue-400 font-semibold cursor-pointer hover:underline block text-xs">
                    {targetEvidenceFile ? targetEvidenceFile.name : 'Select Official Transcript / PDF'}
                  </label>
                  <input
                    id="evidence-file-input"
                    type="file"
                    required
                    accept=".pdf,.png,.jpg,.jpeg,.docx"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) setTargetEvidenceFile(e.target.files[0]);
                    }}
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    {targetEvidenceFile
                      ? `${(targetEvidenceFile.size / 1024).toFixed(1)} KB selected`
                      : 'PDF, JPG, or PNG files up to 10MB'}
                  </p>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEvidenceUploadTarget(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={targetUploadLoading || !targetEvidenceFile}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold transition shadow-md flex items-center gap-1.5"
                >
                  {targetUploadLoading ? 'Hashing & Uploading...' : 'Upload & Re-sign Credential'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Revocation Modal */}
      {selectedForRevoke && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-rose-500/40 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Revoke Credential</h3>
                <p className="text-xs text-rose-600 dark:text-rose-400 font-mono">{selectedForRevoke.credentialId}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Revoking this credential will immediately update public verification checks to <strong>REVOKED</strong> and record an immutable entry in the audit log.
            </p>

            <form onSubmit={handleRevokeSubmit} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-700 dark:text-slate-300 font-semibold">Official Revocation Reason</label>
                <textarea
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  rows={3}
                  required
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-slate-900 dark:text-white focus:outline-none focus:border-rose-500 transition"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedForRevoke(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={revokeLoading}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-semibold transition shadow-md"
                >
                  {revokeLoading ? 'Revoking...' : 'Confirm Revocation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Staff & Team Management Modal */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Registrar Staff & Delegated Issuers</h3>
                  <p className="text-xs text-slate-500">Authorize faculty and registrar staff to issue degrees</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsStaffModalOpen(false);
                  setInviteSuccess(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Invite Form */}
            <form onSubmit={handleInviteSubmit} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                <UserPlus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Invite New Registrar Staff Member</span>
              </div>

              {inviteSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-xs text-emerald-700 dark:text-emerald-400">
                  {inviteSuccess}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="font-medium text-slate-700 dark:text-slate-300">Staff Full Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Dr. Robert Vance"
                    value={inviteStaffName}
                    onChange={(e) => setInviteStaffName(e.target.value)}
                    required
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-slate-700 dark:text-slate-300">Institutional Email</label>
                  <input
                    type="email"
                    placeholder="e.g. r.vance@apex.edu"
                    value={inviteStaffEmail}
                    onChange={(e) => setInviteStaffEmail(e.target.value)}
                    required
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
              </div>

              <div className="pt-1 flex justify-end">
                <button
                  type="submit"
                  disabled={inviteLoading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow transition disabled:opacity-50"
                >
                  <Mail className="w-3.5 h-3.5" />
                  {inviteLoading ? 'Dispatching...' : 'Send Staff Invitation'}
                </button>
              </div>
            </form>

            {/* Active Members & Pending Invites List */}
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-2">
                  Active Faculty & Issuers ({staffData?.members?.length || 0})
                </h4>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
                  {staffData?.members?.map((m) => (
                    <div key={m.user_id} className="p-3 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">{m.full_name}</div>
                        <div className="text-[11px] text-slate-500">{m.email}</div>
                      </div>
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-bold uppercase">
                        {m.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {staffData?.invitations && staffData.invitations.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-2">
                    Pending Invitations ({staffData.invitations.filter((i) => i.status === 'PENDING').length})
                  </h4>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
                    {staffData.invitations.map((inv) => (
                      <div key={inv.invitation_id} className="p-3 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-white">{inv.full_name}</div>
                          <div className="text-[11px] text-slate-500">{inv.email}</div>
                        </div>
                        <span
                          className={`font-mono text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                            inv.status === 'ACCEPTED'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
