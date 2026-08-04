import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getLatestScan, tvStreamUrl } from '../../api/tv'
import { useSSE } from '../../hooks/useSSE'
import type { TvPayload } from '../../types'

export function TvKioskPage() {
  const { branch = 'Front Desk' } = useParams<{ branch: string }>()
  const [payload, setPayload] = useState<TvPayload>({ scan: null, member: null })

  async function refresh() {
    setPayload(await getLatestScan(branch))
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch])

  useSSE(tvStreamUrl(branch), (data) => setPayload(data as TvPayload), refresh)

  const { scan, member } = payload
  const resultClass = scan ? `tv-result-${scan.result}` : ''

  return (
    <div className="tv-kiosk">
      <h1>{branch}</h1>
      {!scan && (
        <>
          <p className="tv-waiting">Waiting for {branch} scan...</p>
          <div className="tv-scan-status">
            <span className="tv-pulse" />
            Live · listening for scanner
          </div>
        </>
      )}
      {scan && (
        <div className={`tv-banner ${resultClass}`}>
          {scan.result === 'allowed' && 'ACCESS ALLOWED'}
          {scan.result === 'expired' && 'ACCESS DENIED - EXPIRED'}
          {scan.result === 'blocked' && 'ACCESS DENIED'}
          {scan.result === 'not_found' && `NOT FOUND: ${scan.member_code}`}
        </div>
      )}
      {member && (
        <div className="tv-card">
          {member.photo_url && <img src={member.photo_url} alt={member.name} />}
          <h2>{member.name}</h2>
          <p>{member.membership_type}</p>
          <p>Expires {member.expiry_date}</p>
          <p>{member.days_left} days left</p>
        </div>
      )}
      {scan && <p className="tv-timestamp">Scanned at {new Date(scan.scanned_at).toLocaleTimeString()}</p>}
    </div>
  )
}
