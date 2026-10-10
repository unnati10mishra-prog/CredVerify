import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  Database,
  BarChart3,
  ListFilter,
  FileSpreadsheet,
  Mail,
  RefreshCw,
  Eye,
  Trash2,
  CheckCircle2,
  Building2,
  Check,
  X,
} from 'lucide-react';
import {
  fetchAuditLogs,
  fetchDispatchedEmails,
  clearDispatchedEmails,
  fetchInstitutionApplications,
  approveInstitutionApplication,
  rejectInstitutionApplication,
} from '../../services/api';
import type { AuditLogItem, EmailNotification, InstitutionApplicationItem } from '../../types';
import { AnalyticsDashboard } from '../../components/analytics/AnalyticsDashboard';

export const AdminAuditPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'analytics' | 'logs' | 'emails' | 'applications'>('analytics');
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [emails, setEmails] = useState<EmailNotification[]>([]);
  const [applications, setApplications] = useState<InstitutionApplicationItem[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailNotification | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [loadingApps, setLoadingApps] = useState(false);

  useEffect(() => {
    fetchAuditLogs().then((res) => {
      setLogs(res);
      setLoading(false);
    });
    loadApplications();
  }, []);

  const loadEmails = async () => {
    setLoadingEmails(true);
    try {
      const res = await fetchDispatchedEmails(30);
      setEmails(res.emails);
    } catch (e) {
      console.error('Failed to load email audit:', e);
    } finally {
      setLoadingEmails(false);
    }
  };

  const loadApplications = async () => {
    setLoadingApps(true);
    try {
      const apps = await fetchInstitutionApplications();
      setApplications(apps);
    } catch (e) {
      console.error('Failed to load applications:', e);
    } finally {
      setLoadingApps(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'emails') {
      loadEmails();
    } else if (activeTab === 'applications') {
      loadApplications();
    }
  }, [activeTab]);

  const handleClearEmails = async () => {
    if (confirm('Clear the in-memory email outbox history?')) {
      await clearDispatchedEmails();
      setEmails([]);
      setSelectedEmail(null);
    }
  };

  const handleApproveApp = async (id: number) => {
    if (confirm('Approve this institution and activate issuing authority?')) {
      try {
        await approveInstitutionApplication(id);
        await loadApplications();
      } catch (err: any) {
        alert(err.message || 'Failed to approve');
      }
    }
  };

  const handleRejectApp = async (id: number) => {
    const notes = prompt('Enter rejection notes/feedback:');
    if (notes !== null) {
      try {
        await rejectInstitutionApplication(id, notes);
        await loadApplications();
      } catch (err: any) {
        alert(err.message || 'Failed to reject');
      }
    }
  };

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
              Immutably records credential issuances, revocations, and automated email dispatches per DP-900 compliance.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 text-xs font-semibold">
              <Database className="w-3.5 h-3.5" />
              Audit & Notifications Active
            </span>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex flex-wrap items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2 gap-3">
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
            <button
              onClick={() => setActiveTab('emails')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
                activeTab === 'emails'
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
              }`}
            >
              <Mail className="w-4 h-4" />
              Email Outbox & Alerts ({emails.length})
            </button>
            <button
              onClick={() => setActiveTab('applications')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
                activeTab === 'applications'
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
              }`}
            >
              <Building2 className="w-4 h-4" />
              Institution Vetting ({applications.filter((a) => a.status === 'PENDING').length} Pending)
            </button>
          </div>

          {activeTab === 'logs' && (
            <button
              onClick={() => alert('Exporting audit report as CSV...')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
              Export CSV
            </button>
          )}

          {activeTab === 'emails' && (
            <div className="flex items-center gap-2">
              <button
                onClick={loadEmails}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingEmails ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              {emails.length > 0 && (
                <button
                  onClick={handleClearEmails}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-medium transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear Outbox
                </button>
              )}
            </div>
          )}
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

        {/* Tab Content 3: Real-Time Email Notifications Outbox */}
        {activeTab === 'emails' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 text-blue-900 dark:text-blue-200">
                <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>
                  Emails are dispatched asynchronously via <strong>FastAPI BackgroundTasks</strong>. When SMTP credentials are unconfigured, emails land safely in this live dev outbox with full rendered HTML previews.
                </span>
              </div>
            </div>

            {loadingEmails ? (
              <div className="p-12 text-center text-xs text-slate-500">Loading email dispatches...</div>
            ) : emails.length === 0 ? (
              <div className="p-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3">
                <Mail className="w-10 h-10 text-slate-400 mx-auto opacity-40" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Emails Dispatched Yet</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Issue or revoke a credential from the Institution Dashboard to trigger automated student notifications.
                </p>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-950/80 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="px-6 py-4">Dispatched At (UTC)</th>
                        <th className="px-6 py-4">Recipient</th>
                        <th className="px-6 py-4">Subject</th>
                        <th className="px-6 py-4">Transport</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                      {emails.map((m) => (
                        <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                          <td className="px-6 py-4 text-slate-500 font-mono text-[11px]">{m.sent_at}</td>
                          <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">{m.recipient}</td>
                          <td className="px-6 py-4 max-w-xs truncate">{m.subject}</td>
                          <td className="px-6 py-4">
                            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              {m.transport}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                m.status.includes('DELIVERED')
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                              }`}
                            >
                              {m.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => setSelectedEmail(m)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 text-xs font-semibold transition"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Inspect
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab Content 4: Institution Onboarding Applications & Vetting */}
        {activeTab === 'applications' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 text-purple-900 dark:text-purple-200">
                <Building2 className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                <span>
                  Colleges and universities apply for accreditation on CredVerify. Review domain authority and approve to issue cryptographic issuing privileges.
                </span>
              </div>
              <button
                onClick={loadApplications}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 text-xs font-semibold shadow-sm transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingApps ? 'animate-spin' : ''}`} />
                Refresh Applications
              </button>
            </div>

            {loadingApps ? (
              <div className="p-12 text-center text-xs text-slate-500">Loading applications...</div>
            ) : applications.length === 0 ? (
              <div className="p-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3">
                <Building2 className="w-10 h-10 text-slate-400 mx-auto opacity-40" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Applications Received Yet</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  New universities applying through the onboarding portal (/register) will appear here for security vetting.
                </p>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-950/80 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="px-6 py-4">Submitted At</th>
                        <th className="px-6 py-4">Institution</th>
                        <th className="px-6 py-4">Code / Domain</th>
                        <th className="px-6 py-4">Admin Contact</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Vetting Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                      {applications.map((app) => (
                        <tr key={app.application_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                          <td className="px-6 py-4 text-slate-500 font-mono text-[11px]">{app.created_at}</td>
                          <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">
                            {app.institution_name}
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold">
                              {app.code}
                            </span>
                            <span className="ml-2 text-slate-400">{app.domain}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium text-slate-900 dark:text-white">{app.admin_full_name}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{app.admin_email}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                app.status === 'APPROVED'
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                  : app.status === 'REJECTED'
                                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                              }`}
                            >
                              {app.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {app.status === 'PENDING' ? (
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  onClick={() => handleApproveApp(app.application_id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow-sm transition"
                                >
                                  <Check className="w-3.5 h-3.5" /> Approve
                                </button>
                                <button
                                  onClick={() => handleRejectApp(app.application_id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-600/10 hover:bg-rose-600/20 text-rose-600 dark:text-rose-400 border border-rose-600/20 text-[11px] font-semibold transition"
                                >
                                  <X className="w-3.5 h-3.5" /> Reject
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11px]">Reviewed</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Email Preview Modal */}
        {selectedEmail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Dispatched Notification Preview</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Recipient: {selectedEmail.recipient}</p>
                </div>
                <button
                  onClick={() => setSelectedEmail(null)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold transition"
                >
                  Close
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4">
                <div className="grid grid-cols-2 gap-3 text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 font-mono">
                  <div><span className="text-slate-400">Subject:</span> {selectedEmail.subject}</div>
                  <div><span className="text-slate-400">Timestamp:</span> {selectedEmail.sent_at}</div>
                  <div><span className="text-slate-400">Transport:</span> {selectedEmail.transport}</div>
                  <div><span className="text-slate-400">Status:</span> {selectedEmail.status}</div>
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                  <div className="p-2 bg-slate-100 dark:bg-slate-800/80 text-[11px] font-semibold text-slate-600 dark:text-slate-300 px-4">
                    Rendered HTML Email
                  </div>
                  <iframe
                    title="Email Preview"
                    srcDoc={selectedEmail.html_body}
                    className="w-full h-96 bg-white"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
