import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  ShieldCheck,
  Ban,
  Activity,
  AlertTriangle,
  Database,
  BarChart2,
  Calendar,
} from 'lucide-react';

const MONTHLY_ISSUANCE_DATA = [
  { month: 'May', issued: 45, verifications: 120 },
  { month: 'Jun', issued: 78, verifications: 210 },
  { month: 'Jul', issued: 130, verifications: 410 },
  { month: 'Aug', issued: 210, verifications: 680 },
  { month: 'Sep', issued: 340, verifications: 920 },
  { month: 'Oct', issued: 480, verifications: 1350 },
];

const VERIFICATION_OUTCOME_DATA = [
  { day: 'Mon', valid: 180, revoked: 8, notFound: 14 },
  { day: 'Tue', valid: 220, revoked: 12, notFound: 18 },
  { day: 'Wed', valid: 290, revoked: 15, notFound: 21 },
  { day: 'Thu', valid: 240, revoked: 7, notFound: 12 },
  { day: 'Fri', valid: 310, revoked: 19, notFound: 28 },
  { day: 'Sat', valid: 150, revoked: 5, notFound: 9 },
  { day: 'Sun', valid: 110, revoked: 3, notFound: 6 },
];

const STATUS_DISTRIBUTION_DATA = [
  { name: 'Active & Valid', value: 1240, color: '#10b981' },
  { name: 'Revoked', value: 68, color: '#f43f5e' },
  { name: 'Suspended', value: 24, color: '#f59e0b' },
];

const TOP_INSTITUTIONS = [
  { name: 'Apex Institute of Technology', count: 620, pct: 46 },
  { name: 'National Polytechnic College', count: 390, pct: 29 },
  { name: 'Metro State University', count: 210, pct: 16 },
  { name: 'St. Xavier School of Science', count: 112, pct: 9 },
];

export const AnalyticsDashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'30d' | '6m' | '1y'>('6m');

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Analytics Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <BarChart2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Power BI & Azure SQL Analytics Engine</h3>
            <p className="text-xs text-slate-400">Aggregating from vw_PublicVerification and Verifications table</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setTimeRange('30d')}
              className={`px-3 py-1 rounded-lg font-semibold transition ${
                timeRange === '30d' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Last 30 Days
            </button>
            <button
              onClick={() => setTimeRange('6m')}
              className={`px-3 py-1 rounded-lg font-semibold transition ${
                timeRange === '6m' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Last 6 Months
            </button>
            <button
              onClick={() => setTimeRange('1y')}
              className={`px-3 py-1 rounded-lg font-semibold transition ${
                timeRange === '1y' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              All Time
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Issued Credentials</span>
            <Database className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white">1,332</div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
            <TrendingUp className="w-3.5 h-3.5" /> +24.8% from last month
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Public Verifications</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">3,690</div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
            <TrendingUp className="w-3.5 h-3.5" /> 97.1% Successful Lookups
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Revocation Rate</span>
            <Ban className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400">5.1%</div>
          <div className="text-xs text-slate-400">68 total revocations with audit reason</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Anomaly Threat Index</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">0.02%</div>
          <div className="text-xs text-slate-400">Burst lookups within normal thresholds</div>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Monthly Issuance & Verification Growth */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-white">Issuance & Verification Trajectory</h4>
              <p className="text-xs text-slate-400">Cumulative issuance vs employer verification queries</p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-400 font-semibold border border-blue-500/20">
              Monthly Trend
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MONTHLY_ISSUANCE_DATA}>
                <defs>
                  <linearGradient id="colorVerif" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorIssued" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                  labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="verifications" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorVerif)" name="Verifications" />
                <Area type="monotone" dataKey="issued" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorIssued)" name="Credentials Issued" />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Daily Verification Outcomes (Success vs Revoked vs 404) */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-white">Daily Verification Outcomes</h4>
              <p className="text-xs text-slate-400">Breakdown of Valid, Revoked, and Not Found lookups</p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
              Past 7 Days
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={VERIFICATION_OUTCOME_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="day" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                  labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                />
                <Bar dataKey="valid" fill="#10b981" name="Valid" radius={[4, 4, 0, 0]} />
                <Bar dataKey="revoked" fill="#f43f5e" name="Revoked" radius={[4, 4, 0, 0]} />
                <Bar dataKey="notFound" fill="#64748b" name="Not Found" radius={[4, 4, 0, 0]} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Credential Status Distribution (Donut Chart) */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div>
            <h4 className="text-sm font-bold text-white">Credential Status Distribution</h4>
            <p className="text-xs text-slate-400">Registry breakdown across all onboarded institutions</p>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={STATUS_DISTRIBUTION_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {STATUS_DISTRIBUTION_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                  labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Table 4: Most Active Issuing Institutions */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div>
            <h4 className="text-sm font-bold text-white">Most Active Issuing Universities</h4>
            <p className="text-xs text-slate-400">Onboarded institutions by total volume of issued credentials</p>
          </div>

          <div className="space-y-4 pt-2">
            {TOP_INSTITUTIONS.map((inst) => (
              <div key={inst.name} className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-white truncate max-w-[280px]">{inst.name}</span>
                  <span className="text-slate-400">{inst.count} credentials ({inst.pct}%)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                    style={{ width: `${inst.pct * 2}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Anomaly Detection Banner */}
          <div className="mt-4 p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-white">Intelligent Anomaly Detection Extension:</span>
              <p className="text-slate-300 mt-0.5">
                Monitors high-frequency burst failures on single IP hashes. Current query behavior is rated normal.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
