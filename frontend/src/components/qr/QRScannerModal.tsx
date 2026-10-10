import React, { useState } from 'react';
import { X, QrCode, Sparkles, CheckCircle } from 'lucide-react';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanResult: (credentialId: string) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onScanResult,
}) => {
  const [scanning, setScanning] = useState(false);

  if (!isOpen) return null;

  const handleSimulateScan = (id: string) => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      onScanResult(id);
      onClose();
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">QR Code Scanner</h3>
            <p className="text-xs text-slate-400">Position the QR code inside the viewfinder</p>
          </div>
        </div>

        {/* Viewfinder simulation container */}
        <div className="relative h-64 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden my-4">
          {/* Laser scan line */}
          <div className="absolute inset-x-8 top-0 h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent shadow-[0_0_12px_#3b82f6] animate-pulse" />

          {/* Viewfinder Target Box */}
          <div className="relative w-44 h-44 rounded-2xl border-2 border-dashed border-blue-500/60 flex flex-col items-center justify-center text-slate-500 p-4">
            <QrCode className={`w-16 h-16 ${scanning ? 'text-blue-400 animate-spin' : 'text-slate-600'}`} />
            <span className="text-xs mt-2 font-mono">
              {scanning ? 'Decoding QR Payload...' : 'Awaiting QR Target'}
            </span>
          </div>
        </div>

        {/* Quick Demo Simulator Buttons */}
        <div className="mt-4 pt-4 border-t border-slate-800">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1 mb-2.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Simulate Scanning Live Test Credentials:
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleSimulateScan('CRED-2026-CS101')}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-medium transition"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Valid Credential
            </button>
            <button
              onClick={() => handleSimulateScan('CRED-2025-ME402')}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-medium transition"
            >
              <X className="w-3.5 h-3.5" />
              Revoked Credential
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
