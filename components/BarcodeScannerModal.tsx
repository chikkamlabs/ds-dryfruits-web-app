'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, X, RefreshCw, AlertCircle } from 'lucide-react';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (scannedCode: string) => void;
}

export default function BarcodeScannerModal({
  isOpen,
  onClose,
  onScan,
}: BarcodeScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  const stopCamera = useCallback(() => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    let isMounted = true;

    const startCamera = async () => {
      setIsInitializing(true);
      setCameraError(null);
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera access is not supported by your browser or environment.');
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setIsInitializing(false);

        // Native BarcodeDetector API if available
        if ('BarcodeDetector' in window) {
          const barcodeDetector = new (window as any).BarcodeDetector({
            formats: ['code_128', 'code_39', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code'],
          });

          const detectFrame = async () => {
            if (!videoRef.current || videoRef.current.readyState < 2) {
              animFrameIdRef.current = requestAnimationFrame(detectFrame);
              return;
            }

            try {
              const barcodes = await barcodeDetector.detect(videoRef.current);
              if (barcodes && barcodes.length > 0) {
                const detected = barcodes[0].rawValue;
                if (detected) {
                  onScan(detected);
                  onClose();
                  return;
                }
              }
            } catch {
              // Ignore frame detection errors and continue
            }

            animFrameIdRef.current = requestAnimationFrame(detectFrame);
          };

          animFrameIdRef.current = requestAnimationFrame(detectFrame);
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        setIsInitializing(false);
        const errMsg = err instanceof Error ? err.message : 'Unable to access camera';
        setCameraError(errMsg);
      }
    };

    startCamera();

    return () => {
      isMounted = false;
      stopCamera();
    };
  }, [isOpen, onScan, onClose, stopCamera]);

  if (!isOpen) return null;

  return (
    <div id="barcode-scanner-modal" className="modal-backdrop z-50">
      <div id="barcode-scanner-container" className="modal-container max-w-lg w-full">
        <div className="modal-header layout-flex-between">
          <div className="layout-flex-start gap-2">
            <Camera className="w-5 h-5 text-primary" />
            <h3 className="text-card-title font-bold">Scan Barcode with Camera</h3>
          </div>
          <button
            id="close-scanner-btn"
            type="button"
            onClick={onClose}
            className="btn-base btn-ghost btn-icon-sm"
            aria-label="Close camera scanner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="modal-body p-4 flex flex-col items-center">
          {cameraError ? (
            <div className="w-full p-4 rounded-lg bg-danger-bg border border-danger-border text-danger-text flex flex-col items-center text-center gap-2">
              <AlertCircle className="w-8 h-8 text-danger" />
              <p className="text-body font-semibold">Camera Access Notice</p>
              <p className="text-small">{cameraError}</p>
              <p className="text-caption text-muted mt-2">
                Tip: You can manually type the barcode in the Barcode field.
              </p>
            </div>
          ) : (
            <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Scanning crosshair / frame overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-64 h-36 border-2 border-dashed border-amber-400 rounded-lg relative">
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-red-500 opacity-75 animate-pulse" />
                </div>
              </div>

              {isInitializing && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-primary-light" />
                  <span className="text-small">Starting camera...</span>
                </div>
              )}
            </div>
          )}

          <p className="text-caption text-muted text-center mt-3">
            Align the product barcode within the guide box. If scanning is not supported automatically on your browser, you can enter the barcode number manually in the form.
          </p>
        </div>

        <div className="modal-footer layout-flex-between">
          <button
            id="cancel-scanner-btn"
            type="button"
            onClick={onClose}
            className="btn-base btn-secondary"
          >
            Close
          </button>
          <button
            id="done-scanner-btn"
            type="button"
            onClick={onClose}
            className="btn-base btn-primary"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
