import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  QrCode,
  Camera,
  Upload,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  Sparkles,
  SwitchCamera,
  FileImage,
} from 'lucide-react';
import { Html5Qrcode, type CameraDevice } from 'html5-qrcode';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanResult: (credentialId: string) => void;
}

/**
 * Extracts the Credential ID from various QR code formats:
 * - Direct ID: "CRED-2026-CS101"
 * - URL Query: "https://credverify.app/verify?id=CRED-2026-CS101"
 * - URL Path: "https://credverify.app/verify/CRED-2026-CS101"
 * - JSON string: '{"credentialId":"CRED-2026-CS101"}'
 */
export function extractCredentialId(raw: string): string {
  const text = raw.trim();

  // 1. Try parsing JSON
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed.credentialId === 'string') {
      return parsed.credentialId.trim();
    }
  } catch {
    // Not JSON, continue
  }

  // 2. Try URL query param ?id=
  try {
    if (text.startsWith('http://') || text.startsWith('https://')) {
      const url = new URL(text);
      const paramId = url.searchParams.get('id');
      if (paramId) return paramId.trim();

      const segments = url.pathname.split('/').filter(Boolean);
      const last = segments[segments.length - 1];
      if (last && (last.startsWith('CRED-') || segments.includes('verify'))) {
        return last.trim();
      }
    }
  } catch {
    // Not standard URL, continue
  }

  // 3. Regex match for CRED-... pattern
  const match = text.match(/CRED-[A-Za-z0-9_-]+/i);
  if (match) {
    return match[0].trim();
  }

  return text;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onScanResult,
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'upload'>('camera');
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(false);
  const [isDecodingFile, setIsDecodingFile] = useState<boolean>(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [scannedSuccessId, setScannedSuccessId] = useState<string | null>(null);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const readerElementId = 'credverify-camera-reader';

  // Handle successful scan
  const handleSuccess = (rawText: string) => {
    const credId = extractCredentialId(rawText);
    setScannedSuccessId(credId);

    // Haptic feedback if available on mobile
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(100);
      } catch {
        // ignore
      }
    }

    // Stop camera and deliver result
    stopCamera().finally(() => {
      setTimeout(() => {
        onScanResult(credId);
        onClose();
        setScannedSuccessId(null);
      }, 500);
    });
  };

  // Safely stop the camera scanner
  const stopCamera = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn('Error stopping scanner:', err);
      } finally {
        html5QrCodeRef.current = null;
      }
    }
  };

  // Start live camera
  const startCamera = async (cameraId?: string) => {
    setCameraError(null);
    setIsInitializing(true);

    try {
      await stopCamera();

      // Check for available cameras
      const devices = await Html5Qrcode.getCameras();
      setCameras(devices || []);

      const targetCamera = cameraId || (devices && devices.length > 0 ? devices[0].id : undefined);
      if (targetCamera) {
        setSelectedCameraId(targetCamera);
      }

      const qrScanner = new Html5Qrcode(readerElementId);
      html5QrCodeRef.current = qrScanner;

      const cameraConfig = targetCamera
        ? { deviceId: { exact: targetCamera } }
        : { facingMode: 'environment' };

      await qrScanner.start(
        cameraConfig,
        {
          fps: 10,
          qrbox: { width: 240, height: 240 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          handleSuccess(decodedText);
        },
        () => {
          // Frame decode error (normal while scanning)
        }
      );
    } catch (err: any) {
      console.warn('Failed to start camera:', err);
      setCameraError(
        err?.message ||
          'Camera access was denied or not supported on this browser. Try uploading an image or test with the demo credentials below.'
      );
    } finally {
      setIsInitializing(false);
    }
  };

  // Switch camera when selected from dropdown
  const handleCameraChange = async (newCameraId: string) => {
    setSelectedCameraId(newCameraId);
    if (activeTab === 'camera') {
      await startCamera(newCameraId);
    }
  };

  // Handle uploaded image file
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError(null);
    setIsDecodingFile(true);

    try {
      await stopCamera();

      // Create a transient scanner instance for image scanning
      const tempScanner = new Html5Qrcode(readerElementId);
      html5QrCodeRef.current = tempScanner;

      const decodedText = await tempScanner.scanFile(file, false);
      handleSuccess(decodedText);
    } catch (err: any) {
      console.warn('File QR decode error:', err);
      setFileError('Could not detect a valid QR code in the uploaded image. Please try a clearer image or screenshot.');
    } finally {
      setIsDecodingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Quick simulate test buttons
  const handleSimulateScan = (id: string) => {
    setScannedSuccessId(id);
    stopCamera().finally(() => {
      setTimeout(() => {
        onScanResult(id);
        onClose();
        setScannedSuccessId(null);
      }, 400);
    });
  };

  // Lifecycle when modal opens/closes or tab changes
  useEffect(() => {
    if (isOpen) {
      setScannedSuccessId(null);
      setCameraError(null);
      setFileError(null);

      if (activeTab === 'camera') {
        // Small delay to ensure modal DOM container is mounted
        const timer = setTimeout(() => {
          startCamera(selectedCameraId || undefined);
        }, 150);
        return () => clearTimeout(timer);
      } else {
        stopCamera();
      }
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl transition-all">
        {/* Close Button */}
        <button
          onClick={() => {
            stopCamera();
            onClose();
          }}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          aria-label="Close Scanner"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Verify via QR Code
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Scan a physical diploma, point your camera, or upload a QR image
            </p>
          </div>
        </div>

        {/* Mode Tabs: Camera vs Image File */}
        <div className="flex p-1 bg-slate-100 dark:bg-slate-950 rounded-xl mb-4 border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('camera')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition ${
              activeTab === 'camera'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            Live Camera
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition ${
              activeTab === 'upload'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            Upload QR Image
          </button>
        </div>

        {/* CAMERA SCANNER TAB */}
        {activeTab === 'camera' && (
          <div className="space-y-3">
            {/* Camera Selector Dropdown (if multiple cameras detected) */}
            {cameras.length > 1 && (
              <div className="flex items-center gap-2 text-xs">
                <SwitchCamera className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-500">Camera:</span>
                <select
                  value={selectedCameraId}
                  onChange={(e) => handleCameraChange(e.target.value)}
                  className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  {cameras.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label || `Camera ${c.id.substring(0, 5)}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Video Viewport Container */}
            <div className="relative min-h-[260px] rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden">
              {/* HTML5 QR Code Mount Element */}
              <div
                id={readerElementId}
                className="w-full h-full [&_video]:w-full [&_video]:h-full [&_video]:object-cover"
              />

              {/* Laser Scan Overlay when scanning */}
              {!cameraError && !scannedSuccessId && (
                <div className="pointer-events-none absolute inset-x-8 top-1/4 h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent shadow-[0_0_12px_#3b82f6] animate-pulse" />
              )}

              {/* Initializing Spinner */}
              {isInitializing && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center text-slate-300 gap-2">
                  <RefreshCw className="w-6 h-6 text-blue-400 animate-spin" />
                  <span className="text-xs font-mono">Initializing camera feed...</span>
                </div>
              )}

              {/* Camera Error State */}
              {cameraError && (
                <div className="absolute inset-0 bg-slate-950 p-6 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="p-3 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <p className="text-xs text-slate-300 max-w-xs">{cameraError}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startCamera(selectedCameraId || undefined)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Retry Camera
                    </button>
                    <button
                      onClick={() => setActiveTab('upload')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Upload QR Image
                    </button>
                  </div>
                </div>
              )}

              {/* Scan Success Overlay */}
              {scannedSuccessId && (
                <div className="absolute inset-0 bg-emerald-950/90 backdrop-blur-sm flex flex-col items-center justify-center text-center p-4 space-y-2 animate-in zoom-in-95">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 animate-bounce" />
                  <h4 className="text-sm font-bold text-white">QR Code Recognized!</h4>
                  <p className="text-xs font-mono text-emerald-300 bg-emerald-900/60 px-3 py-1 rounded-full border border-emerald-500/30">
                    {scannedSuccessId}
                  </p>
                </div>
              )}
            </div>

            <p className="text-[11px] text-center text-slate-400">
              Point your camera at the QR code on the convocation diploma or credential badge.
            </p>
          </div>
        )}

        {/* UPLOAD QR IMAGE TAB */}
        {activeTab === 'upload' && (
          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.svg"
              onChange={handleFileUpload}
              className="hidden"
              id="qr-file-upload-input"
            />

            <label
              htmlFor="qr-file-upload-input"
              className="min-h-[220px] rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 bg-slate-50 dark:bg-slate-950/50 flex flex-col items-center justify-center p-6 text-center cursor-pointer transition group"
            >
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 group-hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3 transition">
                <FileImage className="w-7 h-7" />
              </div>

              {isDecodingFile ? (
                <div className="flex items-center gap-2 text-xs font-medium text-blue-600 dark:text-blue-400">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Analyzing image for QR payload...
                </div>
              ) : (
                <>
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Click to choose a QR image or screenshot
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Supports PNG, JPG, WEBP, and SVG certificate QR badges
                  </span>
                </>
              )}
            </label>

            {fileError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{fileError}</span>
              </div>
            )}
          </div>
        )}

        {/* QUICK TEST DEMO PRESETS */}
        <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-2.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Quick Demo Credentials (One-Click Viva Test):
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleSimulateScan('CRED-2026-CS101')}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Valid CS Degree
            </button>
            <button
              type="button"
              onClick={() => handleSimulateScan('CRED-2025-ME402')}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30 text-xs font-semibold transition"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              Revoked ME Degree
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
