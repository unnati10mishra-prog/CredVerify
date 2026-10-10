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
} from 'lucide-react';
import { fetchCredentials, issueCredential, revokeCredential } from '../../services/api';
import type { Credential } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';

export const InstitutionDashboard: React.FC = () => {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Issue Modal State
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [issueLoading, setIssueLoading] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [newProgramName, setNewProgramName] = useState('Bachelor of Technology in Computer Science');
  const [newDegreeType, setNewDegreeType] = useState('Undergraduate');
  const [newIssueDate, setNewIssueDate] = useState(new Date().toISOString().split('T')[0]);

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

  useEffect(() => {
    loadData();
  }, []);

  const handleIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIssueLoading(true);
    try {
      await issueCredential({
        studentName: newStudentName,
        studentEmail: newStudentEmail,
        programName: newProgramName,
        degreeType: newDegreeType,
        issueDate: newIssueDate,
      });
      setIsIssueModalOpen(false);
      setNewStudentName('');
      setNewStudentEmail('');
      await loadData();
    } finally {
      setIssueLoading(false);
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

          <button
            onClick={() => setIsIssueModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition shadow-lg"
          >
            <Plus className="w-4 h-4" />
            Issue New Credential
          </button>
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

              {/* Evidence Upload Simulation */}
              <div className="p-3.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-center space-y-1">
                <Upload className="w-5 h-5 text-blue-600 dark:text-blue-400 mx-auto" />
                <p className="text-slate-700 dark:text-slate-300 font-semibold text-[11px]">Upload Transcript / Degree PDF</p>
                <p className="text-[10px] text-slate-500">Will be uploaded to Azure Blob Storage with SHA-256 hash</p>
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
    </div>
  );
};
