import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { scanCode } from '../../api/scan'
import { useAuth } from '../../auth/AuthContext'
import type { ScanResponse } from '../../types'

const QR_REGION_ID = 'qr-reader'

export function ScannerPage() {
  const { user } = useAuth()
  const [code, setCode] = useState('')
  const [branch, setBranch] = useState(user?.branch ?? '')
  const [result, setResult] = useState<ScanResponse | null>(null)
  const [cameraOn, setCameraOn] = useState(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)

  useEffect(() => {
    return () => {
      scannerRef.current?.stop().catch(() => {})
    }
  }, [])

  async function runScan(value: string) {
    if (!value.trim()) return
    const response = await scanCode(value.trim(), branch)
    setResult(response)
  }

  async function startCamera() {
    if (cameraOn) return
    const scanner = new Html5Qrcode(QR_REGION_ID)
    scannerRef.current = scanner
    setCameraOn(true)
    try {
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 250 },
        (decodedText) => {
          runScan(decodedText)
        },
        undefined,
      )
    } catch {
      setCameraOn(false)
    }
  }

  async function stopCamera() {
    try {
      await scannerRef.current?.stop()
    } catch {
      // ignore
    }
    setCameraOn(false)
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Scanner</h2>
          <p className="page-subtitle">Verify member QR codes or search a member code manually.</p>
        </div>
      </div>
      <div className="scanner-grid">
        <div className="scanner-panel">
          <h3>Camera Scan</h3>
          <div id={QR_REGION_ID} className="qr-reader-box" />
          <div className="scanner-controls">
            {!cameraOn ? (
              <button className="primary" onClick={startCamera}>
                Start Camera
              </button>
            ) : (
              <button onClick={stopCamera}>Stop Camera</button>
            )}
          </div>
        </div>
        <div className="scanner-manual">
          <h3>Manual Check</h3>
          <label>
            Branch
            <input
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              disabled={!!user?.branch && user.role === 'Branch Manager'}
            />
          </label>
          <label>
            Member code
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="PS-0001" />
          </label>
          <button className="primary" onClick={() => runScan(code)}>
            Verify Member
          </button>
          <button
            onClick={() => branch && window.open(`/kiosk/${encodeURIComponent(branch)}`, '_blank')}
            disabled={!branch}
          >
            Open Branch TV
          </button>
        </div>
      </div>

      {result && (
        <div className={`scan-result scan-result-${result.can_scan ? 'ok' : 'blocked'}`}>
          <h3>{result.can_scan ? 'ACCESS ALLOWED' : result.result.toUpperCase()}</h3>
          <p>{result.message}</p>
          {result.member && (
            <div className="member-card-preview">
              <strong>{result.member.name}</strong> ({result.member.member_code})
              <div>{result.member.membership_type} · {result.member.status}</div>
              <div>Expires: {result.member.expiry_date} · {result.member.days_left} days left</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
