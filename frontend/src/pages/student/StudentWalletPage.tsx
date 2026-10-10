import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap,
  ShieldCheck,
  Copy,
  Check,
  Download,
  Building2,
  Calendar,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Award,
  Fingerprint,
  FileText,
} from 'lucide-react';
import { StatusBadge } from '../../components/common/StatusBadge';
import { QRCodeSVG } from 'qrcode.react';
import { fetchMyCredentials, mockLogin } from '../../services/api';
import type { Credential, User } from '../../types';

export const StudentWalletPage: React.FC = () => {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const loadStudentData = async () => {
    setLoading(true);
    setError(null);
    try {
      const stored = localStorage.getItem('credverify_user');
      let user: User | null = stored ? JSON.parse(stored) : null;

      // If no student token or logged in as a different role, automatically demo-auth as student
      if (!user || user.role !== 'STUDENT') {
        user = await mockLogin('STUDENT');
        localStorage.setItem('credverify_user', JSON.stringify(user));
      }
      setCurrentUser(user);

      const creds = await fetchMyCredentials();
      setCredentials(creds);
    } catch (err: any) {
      console.error('Failed to load credentials:', err);
      setError(err.message || 'Unable to load wallet credentials. Ensure the backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudentData();
  }, []);

  const handleCopy = (credentialId: string) => {
    const verifyUrl = `${window.location.origin}/verify?id=${credentialId}`;
    navigator.clipboard.writeText(verifyUrl);
    setCopiedId(credentialId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleDownloadQr = (credentialId: string) => {
    const svgElement = document.getElementById(`qr-${credentialId}`);
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const blobUrl = URL.createObjectURL(svgBlob);

    const downloadLink = document.createElement('a');
    downloadLink.href = blobUrl;
    downloadLink.download = `${credentialId}-verification-qr.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(blobUrl);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header & Student Identity */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-xs font-semibold">
              <GraduationCap className="w-4 h-4" />
              Graduate Credential Wallet
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Your Verifiable Degrees</h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Cryptographically backed credentials issued to your registered student profile. Share the live verification link or high-resolution QR badge with prospective employers.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadStudentData}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-xs font-semibold shadow-sm transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh Wallet
            </button>
          </div>
        </div>

        {/* Student Profile Ribbon */}
        {currentUser && (
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold">
                {currentUser.fullName.split(' ').map((n) => n[0]).join('')}
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">{currentUser.fullName}</p>
                <p className="text-slate-500">{currentUser.email}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold">
                Verified Graduate
              </span>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="space-y-6">
            {[1].map((n) => (
              <div key={n} className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 shadow-sm animate-pulse space-y-6">
                <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-lg w-1/3" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 space-y-4">
                    <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
                    <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
                    <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl" />
                  </div>
                  <div className="h-40 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="p-6 rounded-3xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex flex-col items-center text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-rose-500" />
            <div className="space-y-1">
              <h3 className="font-bold text-rose-900 dark:text-rose-200 text-sm">Failed to Load Credentials</h3>
              <p className="text-xs text-rose-700 dark:text-rose-400 max-w-md">{error}</p>
            </div>
            <button
              onClick={loadStudentData}
              className="mt-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && credentials.length === 0 && (
          <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center">
              <Award className="w-7 h-7" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Credentials Found Yet</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Degrees and certificates issued to <strong className="text-slate-700 dark:text-slate-300">{currentUser?.email}</strong> by certified academic institutions will appear here automatically.
              </p>
            </div>
            <div className="pt-2">
              <Link
                to="/institution"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition"
              >
                Go to Issuer Portal to Issue a Test Degree
              </Link>
            </div>
          </div>
        )}

        {/* Credentials List */}
        {!loading && !error && credentials.length > 0 && (
          <div className="space-y-8">
            {credentials.map((cred) => {
              const verifyUrl = `${window.location.origin}/verify?id=${cred.credentialId}`;
              const isCopied = copiedId === cred.credentialId;
              const displayHash = cred.tamperEvidentHash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

              return (
                <div
                  key={cred.credentialId}
                  className="relative rounded-3xl bg-white dark:bg-gradient-to-b dark:from-slate-900 dark:to-slate-950 border border-slate-200 dark:border-slate-800 p-8 shadow-2xl overflow-hidden space-y-8"
                >
                  <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />

                  {/* Certificate Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-blue-600/10 dark:bg-blue-600/20 border border-blue-500/20 dark:border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <ShieldCheck className="w-7 h-7" />
                      </div>
                      <div>
                        <span className="text-xs font-mono text-blue-600 dark:text-blue-400 font-semibold">{cred.credentialId}</span>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{cred.programName}</h2>
                        <span className="text-xs text-slate-500">{cred.degreeType}</span>
                      </div>
                    </div>

                    <StatusBadge status={cred.status} size="md" />
                  </div>

                  {/* Details Grid & QR Preview */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                    <div className="md:col-span-2 space-y-4 text-sm">
                      <div>
                        <span className="text-xs text-slate-500">Degree Holder:</span>
                        <p className="text-lg font-bold text-slate-900 dark:text-white">{cred.studentName}</p>
                        <p className="text-xs text-slate-500">{cred.studentEmail}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5" /> Institution
                          </span>
                          <p className="font-semibold text-slate-900 dark:text-white">{cred.institutionName}</p>
                        </div>
                        <div>
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" /> Issued Date
                          </span>
                          <p className="font-semibold text-slate-900 dark:text-white">{cred.issueDate}</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-600 dark:text-slate-400">
                          <div className="flex items-center justify-between gap-1.5 text-slate-500 mb-0.5">
                            <div className="flex items-center gap-1.5">
                              <Fingerprint className="w-3.5 h-3.5 text-blue-500" />
                              <span>Tamper-Evident SHA-256 Digest:</span>
                            </div>
                            {cred.key_fingerprint && (
                              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold truncate max-w-[140px]">
                                Key: {cred.key_fingerprint}
                              </span>
                            )}
                          </div>
                          <p className="truncate text-emerald-600 dark:text-emerald-400 font-mono">{displayHash}</p>
                        </div>

                        {/* Evidence Document Attachment with Expiring SAS Link */}
                        {cred.evidence_url && (
                          <div className="p-3 rounded-xl bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20 text-xs flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 truncate">
                              <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                              <div className="truncate">
                                <span className="font-semibold text-slate-900 dark:text-white block truncate">
                                  {cred.evidence_filename || 'Certified_Transcript.pdf'}
                                </span>
                                <span className="text-[10px] text-slate-500">Official Evidence Document (Pillar 4)</span>
                              </div>
                            </div>
                            <a
                              href={cred.evidence_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold flex-shrink-0 transition"
                            >
                              <ExternalLink className="w-3 h-3" />
                              View PDF
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* QR Code Container */}
                    <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center space-y-3">
                      <div className="w-32 h-32 rounded-xl bg-white p-2.5 flex items-center justify-center shadow-md">
                        <QRCodeSVG
                          id={`qr-${cred.credentialId}`}
                          value={verifyUrl}
                          size={108}
                          level="M"
                          includeMargin={false}
                        />
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Scan to Verify Live</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => handleCopy(cred.credentialId)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition shadow-md"
                    >
                      {isCopied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                      {isCopied ? 'Verification Link Copied!' : 'Copy Verification Link'}
                    </button>

                    <Link
                      to={`/verify?id=${cred.credentialId}`}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs border border-slate-200 dark:border-slate-700 transition"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Test Public Verification
                    </Link>

                    {cred.evidence_url && (
                      <a
                        href={cred.evidence_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 font-semibold text-xs border border-emerald-500/20 transition"
                      >
                        <FileText className="w-4 h-4" />
                        Download Certified Evidence PDF
                      </a>
                    )}

                    <button
                      onClick={() => handleDownloadQr(cred.credentialId)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs border border-slate-200 dark:border-slate-700 transition"
                    >
                      <Download className="w-4 h-4" />
                      Save QR Badge (SVG)
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
