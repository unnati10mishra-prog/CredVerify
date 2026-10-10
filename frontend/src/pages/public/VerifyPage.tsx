import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  ShieldCheck,
  Search,
  QrCode,
  CheckCircle2,
  AlertOctagon,
  HelpCircle,
  Calendar,
  Building2,
  GraduationCap,
  Hash,
  Clock,
  Printer,
  Copy,
  Check,
} from 'lucide-react';
import { verifyCredential } from '../../services/api';
import type { VerificationResult, VerificationState } from '../../types';
import { QRScannerModal } from '../../components/qr/QRScannerModal';

export const VerifyPage: React.FC = () => {
  const { credentialId: routeId } = useParams<{ credentialId?: string }>();
  const [searchParams] = useSearchParams();
  const initialId = routeId || searchParams.get('id') || '';

  const [inputQuery, setInputQuery] = useState(initialId);
  const [state, setState] = useState<VerificationState>('IDLE');
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Trigger search
  const handleVerify = async (idToVerify: string) => {
    if (!idToVerify.trim()) return;
    setState('LOADING');
    try {
      const res = await verifyCredential(idToVerify);
      setResult(res);
      setState(res.status);
    } catch {
      setState('NOT_FOUND');
    }
  };

  useEffect(() => {
    if (initialId) {
      handleVerify(initialId);
    }
  }, [initialId]);

  const handleCopyLink = () => {
    if (!result?.credentialId) return;
    const url = `${window.location.origin}/verify/${result.credentialId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4" />
            Public Verification Portal
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
            Authenticate Academic Credentials
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base max-w-xl mx-auto">
            Scan a graduate's QR code or enter their unique Credential ID to perform real-time verification against the issuing institution's records.
          </p>
        </div>

        {/* Search & Scan Box */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleVerify(inputQuery);
            }}
            className="flex flex-col sm:flex-row gap-2"
          >
            <div className="relative flex-1">
              <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder="Enter Credential ID (e.g. CRED-2026-CS101)"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-12 pr-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsScannerOpen(true)}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold transition border border-slate-300 dark:border-slate-700"
              >
                <QrCode className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="hidden sm:inline">Scan QR</span>
              </button>

              <button
                type="submit"
                disabled={state === 'LOADING'}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold transition shadow-md"
              >
                {state === 'LOADING' ? 'Checking...' : 'Verify'}
              </button>
            </div>
          </form>

          {/* Quick Demo Pre-fill Pills */}
          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Quick Demo Tests:</span>
            <button
              onClick={() => {
                setInputQuery('CRED-2026-CS101');
                handleVerify('CRED-2026-CS101');
              }}
              className="px-2.5 py-1 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 transition"
            >
              Valid Credential (B.Tech CS)
            </button>
            <button
              onClick={() => {
                setInputQuery('CRED-2025-ME402');
                handleVerify('CRED-2025-ME402');
              }}
              className="px-2.5 py-1 rounded-md bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 transition"
            >
              Revoked Credential (ME)
            </button>
            <button
              onClick={() => {
                setInputQuery('CRED-INVALID-000');
                handleVerify('CRED-INVALID-000');
              }}
              className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition"
            >
              Non-Existent ID
            </button>
          </div>
        </div>

        {/* Verification Result Display */}
        {state === 'LOADING' && (
          <div className="p-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center animate-pulse space-y-4">
            <div className="w-12 h-12 rounded-full bg-blue-500/20 mx-auto animate-spin border-2 border-blue-600 dark:border-blue-400 border-t-transparent" />
            <p className="text-slate-700 dark:text-slate-300 text-sm font-medium">
              Consulting Azure SQL Relational Registry & Validating Audit State...
            </p>
          </div>
        )}

        {state === 'VALID' && result && (
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-emerald-500/40 p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

            {/* Banner Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      Authentic & Verified
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Academic Credential Validated</h2>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-slate-700 transition"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Link Copied' : 'Share Verification'}
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-slate-700 transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Proof
                </button>
              </div>
            </div>

            {/* Data Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
              <div className="space-y-1">
                <span className="text-xs text-slate-500 flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-slate-400" /> Student / Holder
                </span>
                <p className="text-base font-semibold text-slate-900 dark:text-white">{result.studentName}</p>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-slate-400" /> Issuing Institution
                </span>
                <p className="text-base font-semibold text-slate-900 dark:text-white">{result.institutionName}</p>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-slate-500 flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-slate-400" /> Degree & Program
                </span>
                <p className="text-base font-semibold text-slate-900 dark:text-white">{result.programName}</p>
                <span className="inline-block text-xs text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 mt-1">
                  {result.degreeType}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-slate-400" /> Date of Official Issue
                </span>
                <p className="text-base font-semibold text-slate-900 dark:text-white">{result.issueDate}</p>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Hash className="w-4 h-4 text-slate-400" /> Unique Credential ID
                </span>
                <p className="font-mono text-sm text-blue-600 dark:text-blue-400 bg-slate-100 dark:bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 inline-block">
                  {result.credentialId}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-slate-400" /> Verification Timestamp
                </span>
                <p className="text-xs font-mono text-slate-600 dark:text-slate-300">
                  {result.verifiedAt ? new Date(result.verifiedAt).toLocaleString() : 'Just now'}
                </p>
              </div>
            </div>

            {/* Cryptographic SHA-256 Hash Seal */}
            {result.tamperEvidentHash && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-600 dark:text-slate-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  <span className="text-slate-500">Tamper-Evident SHA-256:</span>
                  <span className="truncate max-w-[280px] sm:max-w-md text-emerald-600 dark:text-emerald-300">
                    {result.tamperEvidentHash}
                  </span>
                </div>
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  Cryptographically Bound
                </span>
              </div>
            )}
          </div>
        )}

        {state === 'REVOKED' && result && (
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-rose-500/40 p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-6">
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 dark:bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400">
                <AlertOctagon className="w-7 h-7" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                  Status: Invalidated
                </span>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Credential Has Been Revoked</h2>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-sm space-y-2">
              <p className="font-semibold flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-rose-600 dark:text-rose-400" /> Official Invalidation Notice:
              </p>
              <p className="text-slate-700 dark:text-slate-300">{result.revocationReason}</p>
              <div className="text-xs text-rose-600 dark:text-rose-400 pt-2 border-t border-rose-500/20">
                Revoked on: {result.revokedAt ? new Date(result.revokedAt).toLocaleString() : 'N/A'}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-600 dark:text-slate-400">
              <div>
                <span className="text-xs text-slate-500">Subject:</span>
                <p className="font-semibold text-slate-900 dark:text-white">{result.studentName}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500">Institution:</span>
                <p className="font-semibold text-slate-900 dark:text-white">{result.institutionName}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500">Degree:</span>
                <p className="font-semibold text-slate-900 dark:text-white">{result.programName}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500">Credential ID:</span>
                <p className="font-mono text-xs text-slate-700 dark:text-slate-300">{result.credentialId}</p>
              </div>
            </div>
          </div>
        )}

        {state === 'NOT_FOUND' && (
          <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-amber-500/30 text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 mx-auto">
              <HelpCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Credential Record Not Found</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm max-w-md mx-auto">
              We could not find any academic credential matching ID <span className="font-mono text-slate-900 dark:text-white font-semibold">"{inputQuery}"</span> in the registry.
            </p>
            <p className="text-xs text-slate-500">
              Please double check the ID format or request an updated link/QR code from the issuing institution.
            </p>
          </div>
        )}
      </div>

      {/* QR Scanner Simulator Modal */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanResult={(scannedId) => {
          setInputQuery(scannedId);
          handleVerify(scannedId);
        }}
      />
    </div>
  );
};
