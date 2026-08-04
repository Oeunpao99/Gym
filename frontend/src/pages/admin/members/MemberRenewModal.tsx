import { useEffect, useMemo, useState } from 'react'
import { createRenewal, processRenewal } from '../../../api/renewals'
import { listEntities } from '../../../api/entities'
import { canApprove, useAuth } from '../../../auth/AuthContext'
import type { Member, Promotion } from '../../../types'

interface MemberRenewModalProps {
  member: Member
  onClose: () => void
  onSaved: () => void
}

function previewExpiry(member: Member, promo: Promotion | null): string {
  // Client-side preview only - the backend recalculates authoritatively on process.
  const base = member.expiry_date && member.expiry_date >= new Date().toISOString().slice(0, 10)
    ? new Date(member.expiry_date)
    : new Date()
  const monthsMatch = /^(\d+)M$/i.exec(member.membership_type)
  const yearsMatch = /^(\d+)Y$/i.exec(member.membership_type)
  const result = new Date(base)
  if (monthsMatch) result.setMonth(result.getMonth() + Number(monthsMatch[1]))
  else if (yearsMatch) result.setFullYear(result.getFullYear() + Number(yearsMatch[1]))
  else result.setDate(result.getDate() + 30)

  if (promo) {
    const unit = promo.extra_duration_unit
    const value = promo.extra_duration_value
    if (unit.startsWith('month')) result.setMonth(result.getMonth() + value)
    else if (unit.startsWith('year')) result.setFullYear(result.getFullYear() + value)
    else result.setDate(result.getDate() + value)
  }
  return result.toISOString().slice(0, 10)
}

export function MemberRenewModal({ member, onClose, onSaved }: MemberRenewModalProps) {
  const { user } = useAuth()
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [promotionId, setPromotionId] = useState<number | ''>('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listEntities<Promotion>('/api/promotions', { eligible: 1, membership_type: member.membership_type }).then(
      setPromotions,
    )
  }, [member.membership_type])

  const selectedPromo = useMemo(
    () => promotions.find((p) => p.id === promotionId) ?? null,
    [promotions, promotionId],
  )
  const preview = useMemo(() => previewExpiry(member, selectedPromo), [member, selectedPromo])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const renewal = await createRenewal({
        member_id: member.id,
        member_code: member.member_code,
        membership_type: member.membership_type,
        promotion_id: promotionId === '' ? null : Number(promotionId),
        branch: member.branch ?? undefined,
      })
      if (canApprove(user)) {
        await processRenewal(renewal.id, {
          promotion_id: promotionId === '' ? null : Number(promotionId),
          approved_by: user?.name,
        })
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create renewal')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Renew Membership - {member.name}</h3>
        <form onSubmit={handleSubmit}>
          <p>
            <strong>Current plan:</strong> {member.membership_type} · expires {member.expiry_date}
          </p>
          <label className="form-field">
            <span>Promotion</span>
            <select value={promotionId} onChange={(e) => setPromotionId(e.target.value ? Number(e.target.value) : '')}>
              <option value="">None</option>
              {promotions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.promotion_name}
                </option>
              ))}
            </select>
          </label>
          <p className="preview-line">
            Estimated new expiry: <strong>{preview}</strong>
          </p>
          {error && <p className="error-text">{error}</p>}
          <div className="modal-actions">
            <button type="button" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="primary" disabled={saving}>
              {saving ? 'Saving...' : canApprove(user) ? 'Renew & Approve' : 'Request Renewal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
