import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  Database,
  BarChart3,
  ListFilter,
  FileSpreadsheet,
} from 'lucide-react';
import { fetchAuditLogs } from '../../services/api';
import type { AuditLogItem } from '../../types';
import { AnalyticsDashboard } from '../../components/analytics/AnalyticsDashboard';

export const AdminAuditPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'analytics' | 'logs'>('analytics');
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
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 dark:bg-slate-950 py-10 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
              <ShieldAlert className="w-4 h-4" /> Platform Administrator Console
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
              Institutional Intelligence & Audit Center
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-xs mt-1">
              Immutably records credential issuances, revocations, and verification attempts per DP-900 compliance.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 text-xs font-semibold">
              <Database className="w-3.5 h-3.5" />
              Azure SQL Audit Log Active
            </span>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
                activeTab === 'analytics'
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Interactive Analytics & Power BI View
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
                activeTab === 'logs'
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
              }`}
            >
              <ListFilter className="w-4 h-4" />
              Forensic Audit Trail Logs ({logs.length})
            </button>
          </div>

          <button
            onClick={() => alert('Exporting audit report as CSV...')}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
            Export CSV
          </button>
        </div>

        {/* Tab Content 1: Interactive Analytics */}
        {activeTab === 'analytics' && <AnalyticsDashboard />}

        {/* Tab Content 2: Forensic Audit Trail Logs */}
        {activeTab === 'logs' && (
          <div className="space-y-4 animate-in fade-in">
            {/* Search Bar */}
            <div className="relative max-w-md">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter audit logs by action, actor, or ID..."
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
              />
            </div>

            {/* Audit Log Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950/80 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-6 py-4">Timestamp (UTC)</th>
                      <th className="px-6 py-4">Action</th>
                      <th className="px-6 py-4">Actor</th>
                      <th className="px-6 py-4">Target Entity</th>
                      <th className="px-6 py-4">Details</th>
                      <th className="px-6 py-4">Origin IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300 font-mono text-[11px]">
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
                        <tr key={log.auditId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                          <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{log.timestamp}</td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                log.action === 'CREDENTIAL_ISSUED'
                                  ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                                  : log.action === 'CREDENTIAL_REVOKED'
                                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              }`}
                            >
                              {log.action}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-900 dark:text-white font-sans">{log.actor}</td>
                          <td className="px-6 py-4 text-purple-600 dark:text-purple-400">{log.entityId}</td>
                          <td className="px-6 py-4 text-slate-600 dark:text-slate-300 max-w-xs truncate font-sans">{log.details}</td>
                          <td className="px-6 py-4 text-slate-400 dark:text-slate-500">{log.ipAddress}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
