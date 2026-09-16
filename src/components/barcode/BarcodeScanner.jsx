import React, { useEffect, useRef, useState } from 'react'
import { Camera, X, ZapOff, ScanLine } from 'lucide-react'

// Uses html5-qrcode — install: npm install html5-qrcode
// Scans EAN-13, EAN-8, QR Code, Code 128, Code 39, UPC-A

const BarcodeScanner = ({ onScan, onClose, isOpen }) => {
  const scannerRef  = useRef(null)
  const divId       = 'barcode-scanner-container'
  const [error,     setError]     = useState('')
  const [scanning,  setScanning]  = useState(false)
  const [lastScan,  setLastScan]  = useState('')

  useEffect(() => {
    if (!isOpen) return
    let html5QrCode = null

    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode')
        html5QrCode = new Html5Qrcode(divId)
        scannerRef.current = html5QrCode

        await html5QrCode.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 180 }, aspectRatio: 1.5 },
          (decodedText) => {
            setLastScan(decodedText)
            setScanning(false)
            onScan(decodedText)
          },
          () => {}  // suppress scan errors (expected when no code in frame)
        )
        setScanning(true)
        setError('')
      } catch (err) {
        setError('Camera access denied or device not supported. ' + err.message)
      }
    }

    startScanner()

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
        scannerRef.current = null
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.85)',
      zIndex: 3000,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <ScanLine size={22} color="#f97316" />
        <span style={{ color: '#fff', fontFamily: 'Outfit, sans-serif', fontSize: 17, fontWeight: 700 }}>
          Scan Barcode / QR Code
        </span>
        <button
          onClick={onClose}
          style={{ marginLeft: 16, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <X size={16} color="#fff" />
        </button>
      </div>

      {/* Scanner viewport */}
      <div style={{ position: 'relative', width: 320, borderRadius: 16, overflow: 'hidden', border: '2px solid #f97316', boxShadow: '0 0 0 4px rgba(249,115,22,0.2)' }}>
        <div id={divId} style={{ width: '100%' }} />

        {/* Scanning line animation */}
        {scanning && (
          <div style={{
            position: 'absolute', left: 0, right: 0, height: 2,
            background: 'linear-gradient(to right, transparent, #f97316, transparent)',
            animation: 'scanLine 2s linear infinite',
            top: '50%',
          }} />
        )}
      </div>

      <style>{`
        @keyframes scanLine {
          0%   { top: 20%; }
          50%  { top: 80%; }
          100% { top: 20%; }
        }
      `}</style>

      {/* Status */}
      <div style={{ marginTop: 20, textAlign: 'center' }}>
        {error ? (
          <div style={{ color: '#f87171', fontSize: 13, maxWidth: 300, textAlign: 'center', lineHeight: 1.6 }}>
            <ZapOff size={20} style={{ display: 'block', margin: '0 auto 8px' }} />
            {error}
          </div>
        ) : lastScan ? (
          <div style={{ color: '#4ade80', fontSize: 13 }}>
            ✓ Scanned: <strong>{lastScan}</strong>
          </div>
        ) : (
          <p style={{ color: '#9ca3af', fontSize: 13 }}>
            Point camera at a product barcode or QR code
          </p>
        )}
      </div>

      {/* Manual entry fallback */}
      <div style={{ marginTop: 20, display: 'flex', gap: 10, alignItems: 'center' }}>
        <input
          placeholder="Or type barcode manually…"
          style={{
            padding: '9px 14px', borderRadius: 9, border: '1.5px solid #374151',
            background: '#1f2937', color: '#fff', fontSize: 13,
            fontFamily: 'monospace', width: 220, outline: 'none',
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.target.value.trim()) {
              onScan(e.target.value.trim())
              e.target.value = ''
            }
          }}
        />
        <button
          onClick={onClose}
          style={{ padding: '9px 16px', borderRadius: 9, border: '1px solid #374151', background: 'transparent', color: '#9ca3af', cursor: 'pointer', fontSize: 13 }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

export default BarcodeScanner
