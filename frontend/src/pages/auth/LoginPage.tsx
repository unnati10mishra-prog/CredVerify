import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, UserCheck, Building2, User, KeyRound, AlertCircle, UserPlus } from 'lucide-react';
import { mockLogin, loginWithCredentials } from '../../services/api';

export const LoginPage: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<'ISSUER' | 'STUDENT' | 'ADMIN' | 'CUSTOM'>('ISSUER');
  const [email, setEmail] = useState('issuer@apex.edu');
  const [password, setPassword] = useState('Issuer@123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleRoleSelect = (role: 'ISSUER' | 'STUDENT' | 'ADMIN') => {
    setSelectedRole(role);
    setError(null);
    if (role === 'ISSUER') {
      setEmail('issuer@apex.edu');
      setPassword('Issuer@123');
    } else if (role === 'STUDENT') {
      setEmail('aditi.sharma@apex.edu');
      setPassword('Student@123');
    } else {
      setEmail('admin@credverify.gov');
      setPassword('Admin@123');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      let user;
      if (selectedRole !== 'CUSTOM') {
        user = await mockLogin(selectedRole);
      } else {
        user = await loginWithCredentials(email, password);
      }
      localStorage.setItem('credverify_user', JSON.stringify(user));
      if (user.role === 'ISSUER') navigate('/institution');
      else if (user.role === 'STUDENT') navigate('/student');
      else navigate('/admin');
    } catch (err: any) {
      setError(err.message || 'Invalid credentials or connection error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 transition-colors">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/10 dark:bg-blue-600/20 border border-blue-500/20 dark:border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400 mx-auto">
            <KeyRound className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">Portal Sign In</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Select your active role to simulate authenticated access</p>
        </div>

        {/* 1-Click Role Switcher */}
        <div className="grid grid-cols-3 gap-2 p-1.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => handleRoleSelect('ISSUER')}
            className={`py-2 px-3 rounded-lg text-xs font-semibold flex flex-col items-center gap-1 transition ${
              selectedRole === 'ISSUER'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Issuer Staff</span>
          </button>
          <button
            type="button"
            onClick={() => handleRoleSelect('STUDENT')}
            className={`py-2 px-3 rounded-lg text-xs font-semibold flex flex-col items-center gap-1 transition ${
              selectedRole === 'STUDENT'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Graduate</span>
          </button>
          <button
            type="button"
            onClick={() => handleRoleSelect('ADMIN')}
            className={`py-2 px-3 rounded-lg text-xs font-semibold flex flex-col items-center gap-1 transition ${
              selectedRole === 'ADMIN'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>SysAdmin</span>
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center gap-2.5 text-xs text-rose-700 dark:text-rose-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Account Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setSelectedRole('CUSTOM');
              }}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setSelectedRole('CUSTOM');
              }}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition shadow-lg disabled:opacity-50"
          >
            <UserCheck className="w-4 h-4" />
            {loading
              ? 'Authenticating...'
              : selectedRole === 'CUSTOM'
              ? 'Sign In'
              : `Enter as ${selectedRole}`}
          </button>
        </form>

        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-center space-y-2">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            New to CredVerify?
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Create Student Wallet or Apply as Institution
          </Link>
        </div>
      </div>
    </div>
  );
};
