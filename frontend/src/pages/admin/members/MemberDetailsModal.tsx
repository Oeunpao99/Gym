import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { getMemberPromotions, getMemberRenewals } from '../../../api/members'
import { StatusBadge } from '../../../components/StatusBadge'
import type { Member, Renewal } from '../../../types'

interface MemberDetailsModalProps {
  member: Member
  onClose: () => void
}

export function MemberDetailsModal({ member, onClose }: MemberDetailsModalProps) {
  const [renewals, setRenewals] = useState<Renewal[]>([])
  const [promotions, setPromotions] = useState<Renewal[]>([])

  useEffect(() => {
    getMemberRenewals(member.id).then(setRenewals)
    getMemberPromotions(member.id).then(setPromotions)
  }, [member.id])

  function openCard(mode: 'view' | 'print' | 'png') {
    const params = new URLSearchParams({ code: member.member_code })
    if (mode === 'print') params.set('print', 'true')
    if (mode === 'png') params.set('download', 'png')
    window.open(`/card?${params.toString()}`, '_blank')
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <h3>{member.name}</h3>
        <div className="member-details-grid">
          <div>
            {member.photo_url && <img src={member.photo_url} alt={member.name} className="photo-preview" />}
            <div className="qr-box">
              <QRCodeSVG value={member.member_code} size={110} />
              <span className="muted" style={{ fontSize: 12 }}>
                Scan to check in
              </span>
            </div>
          </div>
          <div>
            <p>
              <strong>Code:</strong> {member.member_code}
            </p>
            <p>
              <strong>Email:</strong> {member.email || '—'}
            </p>
            <p>
              <strong>Phone:</strong> {member.phone || '—'}
            </p>
            <p>
              <strong>Plan:</strong> {member.membership_type}
            </p>
            <p>
              <strong>Branch:</strong> {member.branch}
            </p>
            <p>
              <strong>Join Date:</strong> {member.join_date}
            </p>
            <p>
              <strong>Expiry:</strong> {member.expiry_date} ({member.days_left} days left)
            </p>
            <p>
              <strong>Status:</strong> <StatusBadge status={member.status} />
            </p>
            {member.remarks && (
              <p>
                <strong>Remarks:</strong> {member.remarks}
              </p>
            )}
          </div>
        </div>

        <div className="card-actions">
          <button onClick={() => openCard('view')}>Open Card</button>
          <button onClick={() => openCard('print')}>Print Card</button>
          <button onClick={() => openCard('png')}>Download PNG</button>
        </div>

        <h4>Renewal History</h4>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Requested</th>
                <th>Processed</th>
                <th>Status</th>
                <th>New Expiry</th>
                <th>Promotion</th>
              </tr>
            </thead>
            <tbody>
              {renewals.map((r) => (
                <tr key={r.id}>
                  <td>{r.request_date}</td>
                  <td>{r.processed_date ?? '—'}</td>
                  <td>{r.status}</td>
                  <td>{r.new_end_date ?? '—'}</td>
                  <td>{r.promotion_applied || '—'}</td>
                </tr>
              ))}
              {renewals.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty-row">
                    No renewals yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {promotions.length > 0 && (
          <>
            <h4>Promotions Applied</h4>
            <ul>
              {promotions.map((p) => (
                <li key={p.id}>{p.promotion_applied}</li>
              ))}
            </ul>
          </>
        )}

        <div className="modal-actions">
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
