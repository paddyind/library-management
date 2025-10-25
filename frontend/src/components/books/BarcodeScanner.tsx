import { useState, useRef, useEffect } from 'react';

// Add type declaration for BarcodeDetector
declare global {
  interface Window {
    BarcodeDetector: any;
  }
}

interface ScannerProps {
  onDetected: (isbn: string) => void;
}

export function BarcodeScanner({ onDetected }: ScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (!window.BarcodeDetector) {
      setError('Barcode detection is not supported in this browser');
      return;
    }

    let stream: MediaStream | null = null;

    const startScanning = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setScanning(true);
          detectBarcodes();
        }
      } catch (err) {
        setError('Failed to access camera');
      }
    };

    const detectBarcodes = async () => {
      if (!videoRef.current || !scanning) return;

      const detector = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'isbn'] });

      const detectFrame = async () => {
        if (!videoRef.current || !scanning) return;

        try {
          const barcodes = await detector.detect(videoRef.current);
          for (const barcode of barcodes) {
            if (barcode.rawValue) {
              onDetected(barcode.rawValue);
              stopScanning();
              return;
            }
          }
          requestAnimationFrame(detectFrame);
        } catch (err) {
          console.error('Barcode detection error:', err);
        }
      };

      requestAnimationFrame(detectFrame);
    };

    const stopScanning = () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
      }
      setScanning(false);
    };

    startScanning();

    return () => {
      stopScanning();
    };
  }, [onDetected, scanning]);

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-500 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className="relative">
      <video
        ref={videoRef}
        className="w-full max-w-md mx-auto rounded-lg shadow-lg"
        playsInline
      />
      {scanning && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-64 h-1 bg-indigo-500 animate-scan" />
        </div>
      )}
      <style jsx>{`
        @keyframes scan {
          0% { transform: translateY(0); }
          100% { transform: translateY(100%); }
        }
        .animate-scan {
          animation: scan 2s linear infinite;
        }
      `}</style>
    </div>
  );
}
