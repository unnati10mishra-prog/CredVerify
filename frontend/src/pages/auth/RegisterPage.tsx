import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  GraduationCap,
  Building2,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Send,
  Lock,
} from 'lucide-react';
import {
  registerStudent,
  applyInstitution,
  fetchInvitationDetails,
  acceptStaffInvite,
} from '../../services/api';

export const RegisterPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite');
  const navigate = useNavigate();

  const [mode, setMode] = useState<'student' | 'institution' | 'invite'>(
    inviteToken ? 'invite' : 'student'
  );

  // Student Form State
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentPassword, setStudentPassword] = useState('');

  // Institution Form State
  const [instName, setInstName] = useState('');
  const [instCode, setInstCode] = useState('');
  const [instDomain, setInstDomain] = useState('');
  const [instContactEmail, setInstContactEmail] = useState('');
  const [adminFullName, setAdminFullName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [instPassword, setInstPassword] = useState('');

  // Invite Form State
  const [inviteDetails, setInviteDetails] = useState<{
    valid: boolean;
    email: string;
    full_name: string;
    role: string;
    institution_name: string;
  } | null>(null);
  const [invitePassword, setInvitePassword] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);

  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (inviteToken) {
      setMode('invite');
      setInviteLoading(true);
      fetchInvitationDetails(inviteToken)
        .then((details) => {
          setInviteDetails(details);
        })
        .catch((err) => {
          setError(err.message || 'Invalid or expired invitation link.');
        })
        .finally(() => {
          setInviteLoading(false);
        });
    }
  }, [inviteToken]);

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const user = await registerStudent({
        fullName: studentName,
        email: studentEmail,
        password: studentPassword,
      });
      localStorage.setItem('credverify_user', JSON.stringify(user));
      navigate('/student');
    } catch (err: any) {
      setError(err.message || 'Failed to create student account.');
    } finally {
      setLoading(false);
    }
  };

  const handleInstitutionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await applyInstitution({
        institutionName: instName,
        code: instCode,
        domain: instDomain,
        contactEmail: instContactEmail,
        adminFullName: adminFullName,
        adminEmail: adminEmail,
        password: instPassword,
      });
      setSuccessMessage(res.message);
    } catch (err: any) {
      setError(err.message || 'Failed to submit institution application.');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteToken) return;
    setLoading(true);
    setError(null);
    try {
      const user = await acceptStaffInvite({
        token: inviteToken,
        password: invitePassword,
      });
      localStorage.setItem('credverify_user', JSON.stringify(user));
      navigate('/institution');
    } catch (err: any) {
      setError(err.message || 'Failed to activate staff account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 bg-slate-50 dark:bg-slate-950 transition-colors">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-10 shadow-2xl space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/10 dark:bg-blue-600/20 border border-blue-500/20 dark:border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400 mx-auto">
            {mode === 'student' && <GraduationCap className="w-6 h-6" />}
            {mode === 'institution' && <Building2 className="w-6 h-6" />}
            {mode === 'invite' && <UserPlus className="w-6 h-6" />}
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            {mode === 'student' && 'Create Graduate Wallet'}
            {mode === 'institution' && 'Apply as Academic Issuer'}
            {mode === 'invite' && 'Accept Staff Invitation'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {mode === 'student' &&
              'Access, manage, and share your cryptographically verified academic credentials.'}
            {mode === 'institution' &&
              'Onboard your university or college to issue tamper-evident digital certificates.'}
            {mode === 'invite' &&
              'Join your institution’s official registrar team on CredVerify.'}
          </p>
        </div>

        {/* Tab Switcher (Only when not accepting a specific invite) */}
        {!inviteToken && (
          <div className="grid grid-cols-2 gap-2 p-1.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setMode('student');
                setError(null);
                setSuccessMessage(null);
              }}
              className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition ${
                mode === 'student'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Graduate Student</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('institution');
                setError(null);
                setSuccessMessage(null);
              }}
              className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition ${
                mode === 'institution'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>University / College</span>
            </button>
          </div>
        )}

        {/* Alerts */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center gap-3 text-xs text-rose-700 dark:text-rose-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 space-y-2 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto" />
            <h4 className="font-bold text-emerald-900 dark:text-emerald-200 text-sm">Application Submitted</h4>
            <p className="text-xs text-emerald-700 dark:text-emerald-400">{successMessage}</p>
            <div className="pt-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold shadow hover:bg-emerald-500 transition"
              >
                Go to Sign In
              </Link>
            </div>
          </div>
        )}

        {/* 1. Student Registration Form */}
        {mode === 'student' && !successMessage && (
          <form onSubmit={handleStudentSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Full Name</label>
              <input
                type="text"
                placeholder="e.g. Aditi Sharma"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                required
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Student Email Address</label>
              <input
                type="email"
                placeholder="e.g. aditi.sharma@apex.edu"
                value={studentEmail}
                onChange={(e) => setStudentEmail(e.target.value)}
                required
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition"
              />
              <span className="text-[11px] text-slate-500">
                Credentials issued to this email will link automatically to your wallet.
              </span>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Account Password</label>
              <input
                type="password"
                placeholder="••••••••••••"
                value={studentPassword}
                onChange={(e) => setStudentPassword(e.target.value)}
                required
                minLength={6}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition shadow-lg disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4" />
              {loading ? 'Creating Wallet...' : 'Register Graduate Profile'}
            </button>
          </form>
        )}

        {/* 2. Institution Onboarding Application Form */}
        {mode === 'institution' && !successMessage && (
          <form onSubmit={handleInstitutionSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Institution Name</label>
                <input
                  type="text"
                  placeholder="e.g. Stanford University"
                  value={instName}
                  onChange={(e) => setInstName(e.target.value)}
                  required
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Institution Code</label>
                <input
                  type="text"
                  placeholder="e.g. STAN"
                  value={instCode}
                  onChange={(e) => setInstCode(e.target.value)}
                  required
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white uppercase font-mono focus:outline-none focus:border-blue-500 transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Official Domain</label>
                <input
                  type="text"
                  placeholder="e.g. stanford.edu"
                  value={instDomain}
                  onChange={(e) => setInstDomain(e.target.value)}
                  required
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Contact / Registrar Email</label>
                <input
                  type="email"
                  placeholder="e.g. registrar@stanford.edu"
                  value={instContactEmail}
                  onChange={(e) => setInstContactEmail(e.target.value)}
                  required
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition"
                />
              </div>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-800 pt-3 space-y-3">
              <p className="text-[11px] font-semibold uppercase text-slate-400">Primary Administrator Credentials</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Admin Full Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Dr. Jane Doe"
                    value={adminFullName}
                    onChange={(e) => setAdminFullName(e.target.value)}
                    required
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Admin Login Email</label>
                  <input
                    type="email"
                    placeholder="e.g. j.doe@stanford.edu"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    required
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Set Initial Password</label>
                <input
                  type="password"
                  placeholder="••••••••••••"
                  value={instPassword}
                  onChange={(e) => setInstPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shadow-lg disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {loading ? 'Submitting Application...' : 'Submit Accreditation Application'}
            </button>
          </form>
        )}

        {/* 3. Accept Staff Invite Form */}
        {mode === 'invite' && (
          <div>
            {inviteLoading ? (
              <div className="py-12 text-center text-xs text-slate-500">Validating invitation token...</div>
            ) : inviteDetails ? (
              <form onSubmit={handleInviteSubmit} className="space-y-4">
                <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 space-y-1 text-xs">
                  <div className="font-semibold text-blue-900 dark:text-blue-200">
                    Official Invitation from {inviteDetails.institution_name}
                  </div>
                  <div className="text-blue-700 dark:text-blue-300">
                    Invited as: <strong>{inviteDetails.role}</strong> ({inviteDetails.email})
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Set Staff Account Password</label>
                  <input
                    type="password"
                    placeholder="••••••••••••"
                    value={invitePassword}
                    onChange={(e) => setInvitePassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition shadow-lg disabled:opacity-50"
                >
                  <Lock className="w-4 h-4" />
                  {loading ? 'Activating Account...' : 'Activate Staff Account'}
                </button>
              </form>
            ) : (
              <div className="text-center py-6">
                <p className="text-xs text-slate-500">Unable to load invitation details.</p>
              </div>
            )}
          </div>
        )}

        {/* Footer Navigation */}
        <div className="border-t border-slate-200 dark:border-slate-800 pt-4 flex items-center justify-between text-xs text-slate-500">
          <span>Already registered?</span>
          <Link
            to="/login"
            className="text-blue-600 dark:text-blue-400 font-semibold hover:underline inline-flex items-center gap-1"
          >
            Sign in to existing account <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

      </div>
    </div>
  );
};
