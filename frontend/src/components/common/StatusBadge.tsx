import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Clock } from 'lucide-react';
import type { CredentialStatus } from '../../types';

interface StatusBadgeProps {
  status: CredentialStatus | 'VALID' | 'NOT_FOUND';
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-3 py-1 text-xs gap-1.5 font-medium',
    lg: 'px-4 py-1.5 text-sm gap-2 font-semibold',
  }[size];

  switch (status) {
    case 'ACTIVE':
    case 'VALID':
      return (
        <span className={`inline-flex items-center rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 ${sizeClasses}`}>
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Active & Valid</span>
        </span>
      );
    case 'REVOKED':
      return (
        <span className={`inline-flex items-center rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 ${sizeClasses}`}>
          <XCircle className="w-3.5 h-3.5" />
          <span>Revoked</span>
        </span>
      );
    case 'SUSPENDED':
      return (
        <span className={`inline-flex items-center rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 ${sizeClasses}`}>
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Suspended</span>
        </span>
      );
    case 'NOT_FOUND':
      return (
        <span className={`inline-flex items-center rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/30 ${sizeClasses}`}>
          <Clock className="w-3.5 h-3.5" />
          <span>Not Found</span>
        </span>
      );
  }
};
