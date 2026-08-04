import { useState } from 'react'
import { getMemberByCode } from '../../../api/members'
import { createRenewal, processRenewal } from '../../../api/renewals'
import { canApprove, useAuth } from '../../../auth/AuthContext'
import type { Member } from '../../../types'

export function AddRenewalModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { user } = useAuth()
  const [code, setCode] = useState('')
  const [member, setMember] = useState<Member | null>(null)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLookup() {
    setLookupError(null)
    setMember(null)
    try {
      setMember(await getMemberByCode(code.trim()))
    } catch {
      setLookupError('Member not found')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!member) return
    setSaving(true)
    setError(null)
    try {
      const renewal = await createRenewal({
        member_id: member.id,
        member_code: member.member_code,
        membership_type: member.membership_type,
        branch: member.branch ?? undefined,
      })
      if (canApprove(user)) {
        await processRenewal(renewal.id, { approved_by: user?.name })
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
        <h3>Add Renewal</h3>
        <label className="form-field">
          <span>Member Code</span>
          <div className="inline-input">
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="PS-0001" />
            <button type="button" onClick={handleLookup}>
              Lookup
            </button>
          </div>
        </label>
        {lookupError && <p className="error-text">{lookupError}</p>}
        {member && (
          <form onSubmit={handleSubmit}>
            <p>
              <strong>{member.name}</strong> · {member.membership_type} · expires {member.expiry_date}
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
        )}
      </div>
    </div>
  )
}
