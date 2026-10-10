import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  Activity,
  Database,
  BarChart3,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import { fetchAuditLogs } from '../../services/api';
import type { AuditLogItem } from '../../types';

export const AdminAuditPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAuditLogs().then((res) => {
      setLogs(res);
      setLoading(false);
    });
  }, []);

  const filtered = logs.filter(
    (l) =>
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.actor.toLowerCase().includes(search.toLowerCase()) ||
      l.entityId.toLowerCase().includes(search.toLowerCase()) ||
      l.details.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-purple-400 uppercase tracking-wider">
              <ShieldAlert className="w-4 h-4" /> Platform Administrator Console
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
              Append-Only Security Audit Trail
            </h1>
            <p className="text-slate-400 text-xs mt-1">
              Immutably records credential issuances, revocations, and verification attempts per DP-900 compliance.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold">
              <Database className="w-3.5 h-3.5" />
              Azure SQL Audit Log Active
            </span>
          </div>
        </div>

        {/* Analytics Summary Cards (Previewing Power BI Plan) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Verification Success Rate</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-white">99.4%</div>
            <p className="text-[11px] text-slate-500">Real-time status queries vs failed lookups</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Active Issuing Universities</span>
              <Activity className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-white">14 Institutions</div>
            <p className="text-[11px] text-slate-500">Verified academic partners onboarded</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Anomaly Detection</span>
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400">Normal</div>
            <p className="text-[11px] text-slate-500">No abnormal verification spikes detected</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter audit logs by action, actor, or ID..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
          />
        </div>

        {/* Audit Log Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Timestamp (UTC)</th>
                  <th className="px-6 py-4">Action</th>
                  <th className="px-6 py-4">Actor</th>
                  <th className="px-6 py-4">Target Entity</th>
                  <th className="px-6 py-4">Details</th>
                  <th className="px-6 py-4">Origin IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono text-[11px]">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-500">
                      Loading audit entries...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-500">
                      No matching audit logs found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((log) => (
                    <tr key={log.auditId} className="hover:bg-slate-800/40 transition">
                      <td className="px-6 py-4 text-slate-400">{log.timestamp}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.action === 'CREDENTIAL_ISSUED'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : log.action === 'CREDENTIAL_REVOKED'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-white font-sans">{log.actor}</td>
                      <td className="px-6 py-4 text-purple-400">{log.entityId}</td>
                      <td className="px-6 py-4 text-slate-300 max-w-xs truncate font-sans">{log.details}</td>
                      <td className="px-6 py-4 text-slate-500">{log.ipAddress}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Power BI Analytics Reference Notice */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-amber-400" />
            <span>Power BI integration endpoint: reads from Azure SQL <code>vw_PublicVerification</code> view.</span>
          </div>
          <span className="text-[11px] text-slate-500">DP-900 Analytics Specification</span>
        </div>
      </div>
    </div>
  );
};
