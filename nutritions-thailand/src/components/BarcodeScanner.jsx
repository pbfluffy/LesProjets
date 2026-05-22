import { useEffect, useRef, useState } from 'react';
import { useLang } from '../LangContext.jsx';
import styles from './BarcodeScanner.module.css';

// Feature #16 — uses the native BarcodeDetector API (Chrome/Edge/Samsung
// Internet on Android; Safari 17+ on iOS). Falls back to a manual text
// input on desktop and older browsers.
//
// Supported formats: EAN-8, EAN-13, UPC-A, UPC-E, Code128, Code39 — covers
// every grocery-product barcode in practice.

const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'];

const isSupported = () => typeof window !== 'undefined' && 'BarcodeDetector' in window;

export default function BarcodeScanner({ onDetected, onClose }) {
  const { t } = useLang();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const stopRef = useRef(false);
  const [scanning, setScanning] = useState(false);
  const [manualValue, setManualValue] = useState('');
  const [error, setError] = useState(null);

  const supported = isSupported();

  // Start the camera + detection loop.
  useEffect(() => {
    if (!supported) return;
    let cancelled = false;
    stopRef.current = false;

    (async () => {
      try {
        // Prefer the back camera on mobile.
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((tr) => tr.stop());
          return;
        }
        streamRef.current = stream;
        const v = videoRef.current;
        if (!v) return;
        v.srcObject = stream;
        await v.play();
        setScanning(true);

        // Detection loop — sample ~4×/sec.
        const detector = new window.BarcodeDetector({ formats: FORMATS });
        const tick = async () => {
          if (stopRef.current) return;
          try {
            const codes = await detector.detect(v);
            if (codes && codes[0] && codes[0].rawValue) {
              stopRef.current = true;
              onDetected(codes[0].rawValue);
              return;
            }
          } catch {
            /* per-frame errors are noisy; ignore and keep trying */
          }
          setTimeout(tick, 250);
        };
        tick();
      } catch (e) {
        if (!cancelled) {
          setError(e?.name === 'NotAllowedError' ? 'permission' : 'camera');
        }
      }
    })();

    return () => {
      cancelled = true;
      stopRef.current = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((tr) => tr.stop());
        streamRef.current = null;
      }
    };
  }, [supported, onDetected]);

  const submitManual = () => {
    const clean = manualValue.replace(/\D/g, '');
    if (clean.length >= 6) onDetected(clean);
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.head}>
          <div className={styles.title}>{t('barcode.title')}</div>
          <button
            className={styles.close}
            onClick={onClose}
            aria-label={t('barcode.close')}
          >
            ✕
          </button>
        </div>

        {supported && !error && (
          <div className={styles.scanArea}>
            <video ref={videoRef} className={styles.video} playsInline muted />
            <div className={styles.reticle} />
            <div className={styles.hint}>
              {scanning ? t('barcode.aim') : t('barcode.starting')}
            </div>
          </div>
        )}

        {error === 'permission' && (
          <div className={styles.errorBox}>{t('barcode.permDenied')}</div>
        )}
        {error === 'camera' && (
          <div className={styles.errorBox}>{t('barcode.cameraFail')}</div>
        )}
        {!supported && (
          <div className={styles.errorBox}>{t('barcode.unsupported')}</div>
        )}

        <div className={styles.divider}>{t('barcode.or')}</div>

        <div className={styles.manualRow}>
          <input
            className={styles.manualInput}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder={t('barcode.manualPlaceholder')}
            value={manualValue}
            onChange={(e) => setManualValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitManual();
            }}
          />
          <button
            className={styles.manualBtn}
            onClick={submitManual}
            disabled={manualValue.replace(/\D/g, '').length < 6}
          >
            {t('barcode.lookUp')}
          </button>
        </div>
      </div>
    </div>
  );
}
