import React from 'react';
import { ShieldCheck, Database, Cloud, Lock } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 py-12 text-slate-400 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 text-white font-bold text-lg mb-2">
              <ShieldCheck className="w-5 h-5 text-blue-400" />
              CredVerify
            </div>
            <p className="text-slate-400 max-w-sm text-sm">
              An enterprise-grade academic credential lifecycle platform ensuring tamper-proof issuance, instant employer verification, and auditable revocations.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider mb-3">Architecture Mapping</h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-2">
                <Database className="w-3.5 h-3.5 text-blue-400" />
                <span>Azure SQL Database (3NF RDBMS)</span>
              </li>
              <li className="flex items-center gap-2">
                <Cloud className="w-3.5 h-3.5 text-blue-400" />
                <span>Azure Blob Storage (Evidence Files)</span>
              </li>
              <li className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-blue-400" />
                <span>Append-Only Security Audit Trail</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider mb-3">Project Roles</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>Student / Credential Holder</li>
              <li>Institution Staff (Issuing Authority)</li>
              <li>Employer / Public Verifier</li>
              <li>Platform Administrator</li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>&copy; {new Date().getFullYear()} CredVerify. Developed for Integrated Full-Stack Project.</p>
          <div className="flex gap-4">
            <span>React 19</span>
            <span>&bull;</span>
            <span>TypeScript</span>
            <span>&bull;</span>
            <span>Tailwind CSS</span>
            <span>&bull;</span>
            <span>Azure Cloud Security</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
