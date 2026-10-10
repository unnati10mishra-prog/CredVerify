import { useState } from 'react'
import { ShieldCheck, CheckCircle2, Lock, FileBadge, ArrowRight } from 'lucide-react'

export default function App() {
  const [credentialId, setCredentialId] = useState('')

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white">CredVerify</span>
              <span className="hidden sm:inline-block ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                v1.0 Architecture Ready
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm font-medium">
            <span className="text-slate-400 hover:text-white cursor-pointer transition">Docs</span>
            <span className="text-slate-400 hover:text-white cursor-pointer transition">Public Verify</span>
            <button className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition">
              Sign In
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-5xl mx-auto px-4 py-16 flex flex-col items-center justify-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-6">
          <CheckCircle2 className="w-4 h-4" />
          Frontend Environment Initialized
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-3xl">
          Secure Academic Credential Verification Platform
        </h1>

        <p className="mt-6 text-lg text-slate-400 max-w-2xl">
          A tamper-evident credential lifecycle solution where universities issue verifiable digital degrees and employers verify authenticity in real-time.
        </p>

        {/* Quick Verification Lookup Bar Preview */}
        <div className="mt-10 w-full max-w-xl p-2 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={credentialId}
            onChange={(e) => setCredentialId(e.target.value)}
            placeholder="Enter Credential ID (e.g. CRED-2026-XXXX)"
            className="flex-1 bg-transparent px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none"
          />
          <button className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition">
            Verify Now
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Feature Cards Grid */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 text-left w-full">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4">
              <FileBadge className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white">Institution Issuance</h3>
            <p className="mt-2 text-sm text-slate-400">
              Role-based credential issuance with evidence file upload and automated QR code generation.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white">Public Verification</h3>
            <p className="mt-2 text-sm text-slate-400">
              Instant verification badge displaying active/revoked status with privacy-first data masking.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white">Tamper-Proof Audit</h3>
            <p className="mt-2 text-sm text-slate-400">
              Append-only audit trail tracking every issuance, verification, and revocation action.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        CredVerify &bull; Integrated Full-Stack Academic Project &bull; React + Vite + TypeScript + Tailwind CSS
      </footer>
    </div>
  )
}
