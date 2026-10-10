import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Search,
  ArrowRight,
  Building2,
  GraduationCap,
  Briefcase,
  Layers,
  Lock,
  Database,
  Cloud,
  CheckCircle2,
  FileCheck,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const [quickId, setQuickId] = useState('');
  const navigate = useNavigate();

  const handleQuickVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickId.trim()) {
      navigate(`/verify?id=${encodeURIComponent(quickId.trim())}`);
    } else {
      navigate('/verify');
    }
  };

  return (
    <div className="bg-slate-950 text-slate-100 flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-6">
          <ShieldCheck className="w-4 h-4" />
          Academic Integrity & Credential Lifecycle
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white max-w-4xl mx-auto leading-tight">
          Verifiable Academic Credentials with Real-Time Authenticity
        </h1>

        <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
          CredVerify empowers universities to issue tamper-evident degrees and provides employers instant verification without compromising student data privacy.
        </p>

        {/* Quick Verification Lookup Bar */}
        <form onSubmit={handleQuickVerify} className="mt-10 max-w-xl mx-auto">
          <div className="p-2 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
              <input
                type="text"
                value={quickId}
                onChange={(e) => setQuickId(e.target.value)}
                placeholder="Enter Credential ID (e.g. CRED-2026-CS101)"
                className="w-full bg-transparent pl-12 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition"
            >
              Verify Now
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Live Test Shortcut */}
        <p className="mt-3 text-xs text-slate-500">
          Try test IDs: <button onClick={() => navigate('/verify?id=CRED-2026-CS101')} className="text-blue-400 underline hover:text-blue-300">CRED-2026-CS101 (Valid)</button> or <button onClick={() => navigate('/verify?id=CRED-2025-ME402')} className="text-rose-400 underline hover:text-rose-300">CRED-2025-ME402 (Revoked)</button>
        </p>
      </section>

      {/* 3-Step Lifecycle Workflow Section */}
      <section className="border-y border-slate-800/80 bg-slate-900/40 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-bold text-blue-400 uppercase tracking-widest">End-to-End Workflow</h2>
            <p className="text-2xl sm:text-3xl font-extrabold text-white mt-2">
              How CredVerify Secures The Credential Lifecycle
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <FileCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">1. Controlled Issuance</h3>
              <p className="text-sm text-slate-400">
                Authorized university staff create credentials protected by an atomic SQL transaction and bind official degree PDFs in Azure Blob Storage.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">2. Cryptographic Binding</h3>
              <p className="text-sm text-slate-400">
                SHA-256 evidence hashes and immutable audit logs ensure any tampering or retrospective modification is instantly detected.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">3. Privacy-First Verification</h3>
              <p className="text-sm text-slate-400">
                Employers scan QR codes or enter IDs to inspect valid or revoked statuses without exposing student contact information or sensitive PII.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Target Roles Grid */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-xs font-bold text-blue-400 uppercase tracking-widest">Designed For Everyone</h2>
          <p className="text-2xl sm:text-3xl font-extrabold text-white mt-2">
            Tailored Experiences for Every Stakeholder
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
            <GraduationCap className="w-8 h-8 text-blue-400 mb-3" />
            <h4 className="font-bold text-white mb-1">Graduates & Students</h4>
            <p className="text-xs text-slate-400">
              Own verifiable credentials, export official QR badges, and share direct authentication links with prospective employers.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
            <Building2 className="w-8 h-8 text-indigo-400 mb-3" />
            <h4 className="font-bold text-white mb-1">Universities & Issuers</h4>
            <p className="text-xs text-slate-400">
              Role-based management of departments, rapid credential issuance, and auditable revocations with full reason records.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
            <Briefcase className="w-8 h-8 text-emerald-400 mb-3" />
            <h4 className="font-bold text-white mb-1">Recruiters & Verifiers</h4>
            <p className="text-xs text-slate-400">
              Zero registration required to authenticate candidates. Instant QR camera scan delivers clear Active/Revoked status.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
            <Layers className="w-8 h-8 text-amber-400 mb-3" />
            <h4 className="font-bold text-white mb-1">System Administrators</h4>
            <p className="text-xs text-slate-400">
              Track append-only audit trail logs, monitor suspicious lookup spikes, and review institutional analytics.
            </p>
          </div>
        </div>
      </section>

      {/* Cloud & Architecture Trust Banner */}
      <section className="bg-slate-900/30 border-t border-slate-800 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <h3 className="text-xl font-bold text-white">Full-Stack Curriculum Architecture</h3>
            <p className="text-slate-400 text-sm mt-1 max-w-xl">
              Constructed according to Microsoft DP-900 data engineering and Cloud Security specifications with 3NF Azure SQL RDBMS and append-only audit logging.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium text-slate-400">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800">
              <Database className="w-4 h-4 text-blue-400" /> Azure SQL
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800">
              <Cloud className="w-4 h-4 text-purple-400" /> Blob Storage
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> RBAC Security
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
