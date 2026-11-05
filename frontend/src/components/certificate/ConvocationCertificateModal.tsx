import { toast } from 'sonner';
import React, { useRef } from 'react';
import { X, Printer, ShieldCheck, Download, Award, CheckCircle2, AlertOctagon, ExternalLink, GraduationCap } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export interface CertificateData {
  credentialId: string;
  studentName: string;
  programName: string;
  degreeType?: string;
  institutionName: string;
  issueDate: string;
  status: 'ACTIVE' | 'VALID' | 'REVOKED' | 'SUSPENDED' | 'NOT_FOUND';
  fileHash?: string;
  keyFingerprint?: string;
  algorithm?: string;
}

interface ConvocationCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: CertificateData | null;
}

export const ConvocationCertificateModal: React.FC<ConvocationCertificateModalProps> = ({
  isOpen,
  onClose,
  data,
}) => {
  const certificateRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !data) return null;

  const verifyUrl = `${window.location.origin}/verify?id=${data.credentialId}`;
  const isRevoked = data.status === 'REVOKED';
  const displayHash = data.fileHash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadQr = () => {
    const svg = document.getElementById(`cert-qr-${data.credentialId}`);
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.credentialId}-diploma-qr.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Diploma QR seal downloaded as SVG!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-in fade-in">
      <div className="relative w-full max-w-5xl my-auto">
        {/* Modal Controls Bar */}
        <div className="mb-3 flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-2xl px-5 py-3 text-slate-200 shadow-xl print:hidden">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <Award className="w-4 h-4 text-amber-400" />
            <span className="text-white">Official Convocation Diploma</span>
            <span className="text-slate-500">•</span>
            <span className="font-mono text-blue-400">{data.credentialId}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / Save PDF
            </button>
            <button
              onClick={handleDownloadQr}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
            >
              <Download className="w-3.5 h-3.5" />
              Save QR Seal
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Certificate Canvas (A4 landscape proportions) */}
        <div
          ref={certificateRef}
          id="official-convocation-diploma"
          className="relative bg-[#FCFBF7] text-slate-900 rounded-3xl p-6 sm:p-12 shadow-2xl border-8 border-[#C9A24D] overflow-hidden select-none font-serif"
          style={{
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
          }}
        >
          {/* Inner Inset Guilloche Border */}
          <div className="absolute inset-3 border-2 border-[#1E3A8A] rounded-2xl pointer-events-none" />
          <div className="absolute inset-4 border border-[#C9A24D]/60 rounded-xl pointer-events-none" />

          {/* Corner Ornamental Flourishes */}
          <div className="absolute top-6 left-6 text-[#C9A24D] text-xl font-bold select-none pointer-events-none">✦</div>
          <div className="absolute top-6 right-6 text-[#C9A24D] text-xl font-bold select-none pointer-events-none">✦</div>
          <div className="absolute bottom-6 left-6 text-[#C9A24D] text-xl font-bold select-none pointer-events-none">✦</div>
          <div className="absolute bottom-6 right-6 text-[#C9A24D] text-xl font-bold select-none pointer-events-none">✦</div>

          {/* Background Watermark Crest */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.035] pointer-events-none">
            <Award className="w-[420px] h-[420px] text-slate-900" />
          </div>

          {/* Revocation Diagonal Watermark Stamp if Revoked */}
          {isRevoked && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
              <div className="transform -rotate-12 border-8 border-rose-600/80 px-12 py-4 rounded-3xl bg-rose-50/90 text-rose-700 text-3xl sm:text-5xl font-black uppercase tracking-widest shadow-2xl flex items-center gap-3">
                <AlertOctagon className="w-10 h-10 text-rose-600" />
                REVOKED / VOID
              </div>
            </div>
          )}

          <div className="relative z-10 text-center space-y-6">
            {/* Institution Crest & Header */}
            <div className="space-y-2">
              <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full bg-gradient-to-br from-[#1E3A8A] to-[#0F172A] border-4 border-[#C9A24D] flex items-center justify-center text-[#F5E6BE] shadow-md">
                <GraduationCap className="w-8 h-8 sm:w-10 sm:h-10" />
              </div>
              <h3 className="text-[10px] sm:text-xs font-sans tracking-[0.25em] uppercase text-slate-600 font-bold">
                The Board of Regents and Faculty of
              </h3>
              <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-[#1E3A8A] tracking-tight font-serif uppercase">
                {data.institutionName}
              </h1>
              <div className="flex items-center justify-center gap-3 text-xs text-[#C9A24D] font-sans font-semibold uppercase tracking-widest">
                <span>Accredited Academic Authority</span>
                <span>•</span>
                <span>Established Convocation</span>
              </div>
            </div>

            {/* Degree Conferral Declaration */}
            <div className="max-w-2xl mx-auto space-y-3 pt-2">
              <p className="text-xs sm:text-sm text-slate-600 italic">
                Be it known to all that upon the recommendation of the Academic Council and by virtue of the authority vested in them, there is hereby conferred upon
              </p>

              <div className="py-2 border-b-2 border-slate-300 max-w-lg mx-auto">
                <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-wide font-serif">
                  {data.studentName}
                </h2>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 italic">
                the degree of
              </p>

              <div className="space-y-1">
                <h3 className="text-xl sm:text-3xl font-bold text-[#1E3A8A] font-serif">
                  {data.programName}
                </h3>
                {data.degreeType && (
                  <span className="inline-block text-[11px] font-sans font-semibold uppercase px-3 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                    {data.degreeType} Honors
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-500 max-w-xl mx-auto leading-relaxed pt-1">
                with all the honors, rights, privileges and responsibilities pertaining thereto, in witness whereof the seal of the institution and the signatures of its authorized officers are hereunto affixed.
              </p>
            </div>

            {/* Bottom Row: Official Signatures & Golden Foil Seal */}
            <div className="pt-6 grid grid-cols-3 gap-4 items-end max-w-3xl mx-auto text-center border-t border-slate-200">
              {/* Officer Signature 1 */}
              <div className="space-y-1">
                <div className="font-serif italic text-lg sm:text-xl text-slate-800 tracking-wider">
                  Dr. Eleanor Wright
                </div>
                <div className="w-32 sm:w-44 h-0.5 bg-slate-400 mx-auto" />
                <span className="text-[10px] sm:text-xs font-sans text-slate-600 uppercase tracking-wider block font-semibold">
                  Dean of Academic Affairs
                </span>
              </div>

              {/* Center Golden Seal */}
              <div className="flex flex-col items-center justify-center space-y-1">
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-[#DFBA62] via-[#C9A24D] to-[#997328] p-1 shadow-lg flex items-center justify-center">
                  <div className="w-full h-full rounded-full border-2 border-dashed border-[#FFF3D1] flex flex-col items-center justify-center text-[#2A1E07] text-center p-1">
                    <ShieldCheck className="w-6 h-6 sm:w-7 sm:h-7 text-[#2A1E07]" />
                    <span className="text-[7px] sm:text-[8px] font-sans font-black uppercase tracking-tighter leading-tight mt-0.5">
                      Accredited Seal
                    </span>
                    <span className="text-[6px] font-mono tracking-widest text-[#2A1E07]/80">
                      OFFICIAL
                    </span>
                  </div>
                </div>
                <span className="text-[9px] font-sans text-slate-500 font-semibold uppercase tracking-wider">
                  Convocation: {data.issueDate}
                </span>
              </div>

              {/* Officer Signature 2 */}
              <div className="space-y-1">
                <div className="font-serif italic text-lg sm:text-xl text-slate-800 tracking-wider">
                  Prof. Robert Sterling
                </div>
                <div className="w-32 sm:w-44 h-0.5 bg-slate-400 mx-auto" />
                <span className="text-[10px] sm:text-xs font-sans text-slate-600 uppercase tracking-wider block font-semibold">
                  Vice-Chancellor & President
                </span>
              </div>
            </div>

            {/* Cryptographic Security Footer Bar */}
            <div className="pt-4 mt-4 border-t-2 border-dashed border-[#C9A24D]/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-left bg-slate-50/80 rounded-2xl p-4 border border-slate-200">
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span className="text-xs font-sans font-bold text-slate-900 uppercase tracking-wider">
                    Cryptographically Verifiable Academic Credential
                  </span>
                </div>
                <div className="font-mono text-[10px] sm:text-[11px] text-slate-600 space-y-0.5">
                  <p>
                    <span className="text-slate-500">Credential ID:</span>{' '}
                    <strong className="text-blue-700">{data.credentialId}</strong>
                  </p>
                  <p className="truncate">
                    <span className="text-slate-500">SHA-256 Fingerprint:</span>{' '}
                    <span className="text-slate-800">{displayHash}</span>
                  </p>
                  {data.keyFingerprint && (
                    <p className="truncate">
                      <span className="text-slate-500">ECDSA SECP256R1 Key:</span>{' '}
                      <span className="text-purple-700">{data.keyFingerprint}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Embedded QR Code */}
              <div className="flex items-center gap-3 flex-shrink-0 bg-white p-2.5 rounded-xl border border-slate-300 shadow-sm">
                <div className="text-right hidden sm:block">
                  <span className="text-[10px] font-sans font-bold uppercase text-slate-900 block">
                    Scan to Verify
                  </span>
                  <span className="text-[9px] font-sans text-slate-500 block">
                    Real-Time Status
                  </span>
                </div>
                <QRCodeSVG
                  id={`cert-qr-${data.credentialId}`}
                  value={verifyUrl}
                  size={64}
                  level="M"
                  includeMargin={false}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Link Footer */}
        <div className="mt-3 text-center text-xs text-slate-400 print:hidden">
          Official digital parchment replica with cryptographic validation •{' '}
          <a
            href={verifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline inline-flex items-center gap-1"
          >
            Open Live Verification Screen
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};
