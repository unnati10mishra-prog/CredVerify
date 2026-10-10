import React, { useState } from 'react';
import {
  GraduationCap,
  ShieldCheck,
  QrCode,
  Copy,
  Check,
  Download,
  Building2,
  Calendar,
  ExternalLink,
} from 'lucide-react';
import { StatusBadge } from '../../components/common/StatusBadge';

export const StudentWalletPage: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const studentCred = {
    credentialId: 'CRED-2026-CS101',
    studentName: 'Aditi Sharma',
    programName: 'Bachelor of Technology in Computer Science',
    degreeType: 'Undergraduate',
    institutionName: 'Apex Institute of Technology',
    issueDate: '2026-05-15',
    status: 'ACTIVE' as const,
    fileHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  };

  const verifyUrl = `${window.location.origin}/verify?id=${studentCred.credentialId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(verifyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Page Title */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-xs font-semibold">
            <GraduationCap className="w-4 h-4" />
            Graduate Credential Wallet
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Your Verifiable Degrees</h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            Digital academic credentials issued to you by certified institutions. Share the verification link or QR code with prospective employers.
          </p>
        </div>

        {/* Digital Certificate Card */}
        <div className="relative rounded-3xl bg-white dark:bg-gradient-to-b dark:from-slate-900 dark:to-slate-950 border border-slate-200 dark:border-slate-800 p-8 shadow-2xl overflow-hidden space-y-8">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />

          {/* Certificate Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/10 dark:bg-blue-600/20 border border-blue-500/20 dark:border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div>
                <span className="text-xs font-mono text-blue-600 dark:text-blue-400 font-semibold">{studentCred.credentialId}</span>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{studentCred.programName}</h2>
              </div>
            </div>

            <StatusBadge status={studentCred.status} size="md" />
          </div>

          {/* Details Grid & QR Preview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            <div className="md:col-span-2 space-y-4 text-sm">
              <div>
                <span className="text-xs text-slate-500">Degree Holder:</span>
                <p className="text-lg font-bold text-slate-900 dark:text-white">{studentCred.studentName}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5" /> Institution
                  </span>
                  <p className="font-semibold text-slate-900 dark:text-white">{studentCred.institutionName}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Issued
                  </span>
                  <p className="font-semibold text-slate-900 dark:text-white">{studentCred.issueDate}</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-600 dark:text-slate-400">
                <span className="text-slate-500">SHA-256 Fingerprint:</span>
                <p className="truncate text-emerald-600 dark:text-emerald-400 mt-0.5">{studentCred.fileHash}</p>
              </div>
            </div>

            {/* QR Code Container */}
            <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center space-y-3">
              <div className="w-32 h-32 rounded-xl bg-white p-2.5 flex items-center justify-center shadow-md">
                <QrCode className="w-full h-full text-slate-950" />
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Scan to Verify</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center gap-3">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition shadow-md"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Verification URL Copied!' : 'Copy Verification Link'}
            </button>

            <a
              href={`/verify?id=${studentCred.credentialId}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs border border-slate-200 dark:border-slate-700 transition"
            >
              <ExternalLink className="w-4 h-4" />
              Test Public Verification
            </a>

            <button
              onClick={() => alert('Downloaded digital QR verification badge.')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs border border-slate-200 dark:border-slate-700 transition"
            >
              <Download className="w-4 h-4" />
              Save QR Badge
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
