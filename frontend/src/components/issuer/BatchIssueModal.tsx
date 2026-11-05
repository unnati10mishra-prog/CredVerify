import React, { useState, useRef } from 'react';
import {
  X,
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Trash2,
  ShieldCheck,
  Sparkles,
  Check,
} from 'lucide-react';
import { issueCredential } from '../../services/api';

export interface BatchRow {
  id: string;
  studentName: string;
  studentEmail: string;
  programName: string;
  degreeType: string;
  issueDate: string;
  isValid: boolean;
  errors: string[];
  status: 'PENDING' | 'ISSUING' | 'SUCCESS' | 'FAILED';
  credentialId?: string;
  errorMessage?: string;
}

interface BatchIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const BatchIssueModal: React.FC<BatchIssueModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [rows, setRows] = useState<BatchRow[]>([]);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'VALID' | 'ERRORS'>('ALL');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [completedCount, setCompletedCount] = useState<number>(0);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [dragOver, setDragOver] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // ─── CSV Parser Helper ─────────────────────────────────────────────────────────
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += char;
      }
    }
    result.push(cur.trim());
    return result;
  };

  const validateRow = (
    name: string,
    email: string,
    program: string,
    degreeType: string,
    date: string
  ): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    if (!name || name.trim().length < 2) {
      errors.push('Student name required');
    }
    if (!email || !email.includes('@') || !email.includes('.')) {
      errors.push('Valid student email required');
    }
    if (!program || program.trim().length < 3) {
      errors.push('Degree program required');
    }
    if (!degreeType) {
      errors.push('Degree type required');
    }
    if (!date || !date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      errors.push('Issue date must be YYYY-MM-DD');
    }
    return {
      isValid: errors.length === 0,
      errors,
    };
  };

  const processCSVContent = (rawText: string) => {
    // Strip BOM and normalize line breaks
    const cleanText = rawText.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = cleanText.split('\n').filter((l) => l.trim().length > 0);

    if (lines.length === 0) return;

    // Check if line 1 contains headers
    const headerLine = lines[0].toLowerCase();
    const hasHeader =
      headerLine.includes('student') ||
      headerLine.includes('name') ||
      headerLine.includes('email') ||
      headerLine.includes('program');

    const dataLines = hasHeader ? lines.slice(1) : lines;
    const today = new Date().toISOString().split('T')[0];

    const parsedRows: BatchRow[] = dataLines.map((line, idx) => {
      const cols = parseCSVLine(line);
      const studentName = cols[0] || '';
      const studentEmail = cols[1] || '';
      const programName = cols[2] || 'Bachelor of Technology in Computer Science';
      const degreeType = cols[3] || (programName.toLowerCase().includes('master') ? 'Postgraduate' : 'Undergraduate');
      const issueDate = cols[4] || today;

      const { isValid, errors } = validateRow(studentName, studentEmail, programName, degreeType, issueDate);

      return {
        id: `row-${idx + 1}-${Date.now()}`,
        studentName,
        studentEmail,
        programName,
        degreeType,
        issueDate,
        isValid,
        errors,
        status: 'PENDING',
      };
    });

    setRows(parsedRows);
    setIsFinished(false);
    setCompletedCount(0);
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        processCSVContent(content);
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadTemplate = () => {
    const headers = 'Student Name,Student Email,Program Name,Degree Type,Issue Date\n';
    const sampleData = [
      'Aarav Patel,aarav.patel@apex.edu,Bachelor of Technology in Computer Science,Undergraduate,2026-05-15',
      'Diya Sengupta,diya.s@apex.edu,Master of Science in Artificial Intelligence,Postgraduate,2026-05-15',
      'Rohan Mehra,rohan.mehra@apex.edu,Bachelor of Technology in Mechanical Engineering,Undergraduate,2026-05-15',
      'Ananya Sharma,ananya.s@apex.edu,Master of Business Administration,Postgraduate,2026-05-15',
    ].join('\n');

    const blob = new Blob([headers + sampleData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'credverify_convocation_batch_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadReport = () => {
    const headers = 'Student Name,Student Email,Program Name,Degree Type,Issue Date,Status,Credential ID,Verification URL\n';
    const dataLines = rows
      .map((r) => {
        const verifyUrl = r.credentialId ? `${window.location.origin}/verify?id=${r.credentialId}` : 'N/A';
        return `"${r.studentName}","${r.studentEmail}","${r.programName}","${r.degreeType}","${r.issueDate}","${r.status}","${r.credentialId || ''}","${verifyUrl}"`;
      })
      .join('\n');

    const blob = new Blob([headers + dataLines], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `credverify_batch_issuance_report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDeleteRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleLoadDemoBatch = () => {
    const today = new Date().toISOString().split('T')[0];
    const demo: BatchRow[] = [
      {
        id: 'demo-1',
        studentName: 'Siddharth Rao',
        studentEmail: 'siddharth.rao@apex.edu',
        programName: 'Bachelor of Technology in Computer Science',
        degreeType: 'Undergraduate',
        issueDate: today,
        isValid: true,
        errors: [],
        status: 'PENDING',
      },
      {
        id: 'demo-2',
        studentName: 'Meera Krishnan',
        studentEmail: 'meera.k@apex.edu',
        programName: 'Master of Science in Artificial Intelligence',
        degreeType: 'Postgraduate',
        issueDate: today,
        isValid: true,
        errors: [],
        status: 'PENDING',
      },
      {
        id: 'demo-3',
        studentName: 'Kabir Verma',
        studentEmail: 'kabir.verma@apex.edu',
        programName: 'Bachelor of Technology in Mechanical Engineering',
        degreeType: 'Undergraduate',
        issueDate: today,
        isValid: true,
        errors: [],
        status: 'PENDING',
      },
      {
        id: 'demo-4',
        studentName: 'Pooja Hegde',
        studentEmail: 'pooja.hegde@apex.edu',
        programName: 'Master of Business Administration',
        degreeType: 'Postgraduate',
        issueDate: today,
        isValid: true,
        errors: [],
        status: 'PENDING',
      },
    ];
    setRows(demo);
    setIsFinished(false);
    setCompletedCount(0);
  };

  // ─── Execute Batch Issuance ──────────────────────────────────────────────────
  const handleExecuteBatch = async () => {
    const validRows = rows.filter((r) => r.isValid && r.status !== 'SUCCESS');
    if (validRows.length === 0) return;

    setIsProcessing(true);
    let done = 0;

    for (const row of validRows) {
      // Mark row as issuing
      setRows((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, status: 'ISSUING' } : r))
      );

      try {
        const created = await issueCredential({
          studentName: row.studentName,
          studentEmail: row.studentEmail,
          programName: row.programName,
          degreeType: row.degreeType,
          issueDate: row.issueDate,
        });

        done++;
        setCompletedCount(done);

        setRows((prev) =>
          prev.map((r) =>
            r.id === row.id
              ? {
                  ...r,
                  status: 'SUCCESS',
                  credentialId: created.credentialId,
                }
              : r
          )
        );
      } catch (err: any) {
        setRows((prev) =>
          prev.map((r) =>
            r.id === row.id
              ? {
                  ...r,
                  status: 'FAILED',
                  errorMessage: err.message || 'Issuance failed',
                }
              : r
          )
        );
      }
    }

    setIsProcessing(false);
    setIsFinished(true);
    onSuccess();
  };

  const totalValid = rows.filter((r) => r.isValid).length;
  const totalErrors = rows.filter((r) => !r.isValid).length;
  const totalSuccess = rows.filter((r) => r.status === 'SUCCESS').length;

  const displayedRows = rows.filter((r) => {
    if (activeFilter === 'VALID') return r.isValid;
    if (activeFilter === 'ERRORS') return !r.isValid;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-2xl space-y-6 my-8 max-h-[90vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isProcessing}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Bulk Convocation Engine
                </span>
                <span className="text-xs text-slate-500">Pillar 2 & 5</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                Batch Credential Issuance
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-slate-700 transition"
              title="Download standard CSV structure"
            >
              <Download className="w-3.5 h-3.5" />
              Download Template (.CSV)
            </button>
            {rows.length === 0 && (
              <button
                onClick={handleLoadDemoBatch}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold border border-emerald-500/30 transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Load 4 Demo Candidates
              </button>
            )}
          </div>
        </div>

        {/* Upload Zone (Visible if no rows loaded) */}
        {rows.length === 0 && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files[0];
              if (file) handleFileUpload(file);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`min-h-[220px] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-8 text-center cursor-pointer transition ${
              dragOver
                ? 'border-emerald-500 bg-emerald-500/5'
                : 'border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-400 bg-slate-50 dark:bg-slate-950/40'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
              className="hidden"
            />
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
              <Upload className="w-7 h-7" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Drop your graduation convocation CSV file here
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
              Columns: <span className="font-mono text-emerald-600 dark:text-emerald-400">Student Name, Student Email, Program Name, Degree Type, Issue Date</span>
            </p>
          </div>
        )}

        {/* Rows Preview & Control Bar */}
        {rows.length > 0 && (
          <div className="flex-1 flex flex-col min-h-0 space-y-4">
            {/* Filter Pills and Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveFilter('ALL')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                    activeFilter === 'ALL'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  All ({rows.length})
                </button>
                <button
                  onClick={() => setActiveFilter('VALID')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                    activeFilter === 'VALID'
                      ? 'bg-emerald-600 text-white'
                      : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
                  }`}
                >
                  Ready ({totalValid})
                </button>
                {totalErrors > 0 && (
                  <button
                    onClick={() => setActiveFilter('ERRORS')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                      activeFilter === 'ERRORS'
                        ? 'bg-rose-600 text-white'
                        : 'text-rose-600 dark:text-rose-400 hover:bg-rose-500/10'
                    }`}
                  >
                    Errors ({totalErrors})
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setRows([]);
                    setIsFinished(false);
                  }}
                  disabled={isProcessing}
                  className="px-2.5 py-1 text-xs text-slate-500 hover:text-rose-600 transition"
                >
                  Clear CSV
                </button>

                {!isFinished ? (
                  <button
                    onClick={handleExecuteBatch}
                    disabled={isProcessing || totalValid === 0}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold shadow-md transition"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Signing & Minting ({completedCount}/{totalValid})...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        Execute Batch Mint ({totalValid})
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handleDownloadReport}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition"
                  >
                    <Download className="w-4 h-4" />
                    Export Issuance Report (.CSV)
                  </button>
                )}
              </div>
            </div>

            {/* Live Progress Bar during batch execution */}
            {isProcessing && (
              <div className="space-y-1.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <div className="flex justify-between text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  <span>ECDSA Cryptographic Signing & Database Insertion in Progress...</span>
                  <span>{Math.round((completedCount / totalValid) * 100)}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-emerald-950/20 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${(completedCount / totalValid) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Completion Success Banner */}
            {isFinished && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 flex-shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      Batch Issuance Successfully Completed!
                    </h4>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                      {totalSuccess} academic credentials have been created, cryptographically signed with the institution's private key, and anchored in the registry.
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition"
                >
                  Done
                </button>
              </div>
            )}

            {/* Interactive Preview Table */}
            <div className="flex-1 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl min-h-[180px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950/80 text-slate-500 border-b border-slate-200 dark:border-slate-800 sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Student Name</th>
                    <th className="py-2.5 px-3 font-semibold">Email</th>
                    <th className="py-2.5 px-3 font-semibold">Program / Degree</th>
                    <th className="py-2.5 px-3 font-semibold">Issue Date</th>
                    <th className="py-2.5 px-3 font-semibold">Status / Credential ID</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {displayedRows.map((row) => (
                    <tr
                      key={row.id}
                      className={
                        !row.isValid
                          ? 'bg-rose-500/5'
                          : row.status === 'SUCCESS'
                          ? 'bg-emerald-500/5'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }
                    >
                      <td className="py-2 px-3 font-medium text-slate-900 dark:text-white">
                        {row.studentName || <span className="text-rose-500 font-italic">Missing Name</span>}
                      </td>
                      <td className="py-2 px-3 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                        {row.studentEmail}
                      </td>
                      <td className="py-2 px-3">
                        <div className="text-slate-900 dark:text-white font-medium truncate max-w-[200px]">
                          {row.programName}
                        </div>
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                          {row.degreeType}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-600 dark:text-slate-400">
                        {row.issueDate}
                      </td>
                      <td className="py-2 px-3">
                        {row.status === 'SUCCESS' && row.credentialId && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            <Check className="w-3 h-3" />
                            {row.credentialId}
                          </span>
                        )}
                        {row.status === 'ISSUING' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            Signing...
                          </span>
                        )}
                        {row.status === 'PENDING' && row.isValid && (
                          <span className="text-[11px] text-slate-400 font-medium">Ready</span>
                        )}
                        {!row.isValid && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                            <AlertCircle className="w-3 h-3 flex-shrink-0" />
                            {row.errors.join(', ')}
                          </span>
                        )}
                        {row.status === 'FAILED' && (
                          <span className="text-[11px] text-rose-500 font-medium">
                            {row.errorMessage || 'Failed'}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <button
                          onClick={() => handleDeleteRow(row.id)}
                          disabled={isProcessing}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition disabled:opacity-50"
                          title="Remove row"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer Guidance */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
            Every issued credential triggers an append-only SQL audit log and institution ECDSA signature.
          </span>
          <span className="text-slate-400">
            Accepts CSV format with UTF-8 encoding
          </span>
        </div>
      </div>
    </div>
  );
};
