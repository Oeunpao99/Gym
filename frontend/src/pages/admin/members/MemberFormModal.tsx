import { useEffect, useState } from 'react'
import { createMember, updateMember } from '../../../api/members'
import { listEntities } from '../../../api/entities'
import { canApprove, isBranchManager, useAuth } from '../../../auth/AuthContext'
import type { Branch, Member, MembershipType, Promotion } from '../../../types'

interface MemberFormModalProps {
  member: Member | null
  onClose: () => void
  onSaved: () => void
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function MemberFormModal({ member, onClose, onSaved }: MemberFormModalProps) {
  const { user } = useAuth()
  const isEdit = Boolean(member)

  const [name, setName] = useState(member?.name ?? '')
  const [email, setEmail] = useState(member?.email ?? '')
  const [phone, setPhone] = useState(member?.phone ?? '')
  const [membershipType, setMembershipType] = useState(member?.membership_type ?? '')
  const [joinDate, setJoinDate] = useState(member?.join_date ?? '')
  const [remarks, setRemarks] = useState(member?.remarks ?? '')
  const [branch, setBranch] = useState(member?.branch ?? user?.branch ?? '')
  const [promotionId, setPromotionId] = useState<number | ''>(member?.promotion_id ?? '')
  const [photoUrl, setPhotoUrl] = useState(member?.photo_url ?? '')
  const [allowDirectApproval, setAllowDirectApproval] = useState(false)
  const [membershipTypes, setMembershipTypes] = useState<MembershipType[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listEntities<MembershipType>('/api/membership-types').then(setMembershipTypes)
    listEntities<Branch>('/api/branches').then(setBranches)
    listEntities<Promotion>('/api/promotions', { eligible: 1, membership_type: membershipType }).then(setPromotions)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [membershipType])

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoUrl(await readAsDataUrl(file))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      if (isEdit && member) {
        await updateMember(member.id, {
          name,
          email,
          phone,
          membership_type: membershipType,
          join_date: joinDate || null,
          expiry_date: member.expiry_date,
          days_left: member.days_left,
          status: member.status,
          remarks,
          photo_url: photoUrl,
          branch,
          promotion_id: promotionId === '' ? null : Number(promotionId),
          promotion_applied: member.promotion_applied,
        })
      } else {
        await createMember({
          name,
          email,
          phone,
          membership_type: membershipType,
          join_date: joinDate || undefined,
          remarks,
          photo_url: photoUrl,
          branch,
          promotion_id: promotionId === '' ? null : Number(promotionId),
          allow_direct_approval: allowDirectApproval,
        })
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save member')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{isEdit ? 'Edit Member' : 'New Member'}</h3>
        <form onSubmit={handleSubmit}>
          <label className="form-field">
            <span>Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label className="form-field">
            <span>Email</span>
            <input value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="form-field">
            <span>Phone</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
          <label className="form-field">
            <span>Membership Type</span>
            <select value={membershipType} onChange={(e) => setMembershipType(e.target.value)} required>
              <option value="" disabled>
                Select...
              </option>
              {membershipTypes.map((mt) => (
                <option key={mt.id} value={mt.name}>
                  {mt.name}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Join Date</span>
            <input type="date" value={joinDate ?? ''} onChange={(e) => setJoinDate(e.target.value)} />
          </label>
          <label className="form-field">
            <span>Branch</span>
            <select value={branch ?? ''} onChange={(e) => setBranch(e.target.value)} disabled={isBranchManager(user)}>
              <option value="" disabled>
                Select...
              </option>
              {branches.map((b) => (
                <option key={b.id} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
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
          <label className="form-field">
            <span>Remarks</span>
            <textarea value={remarks ?? ''} onChange={(e) => setRemarks(e.target.value)} />
          </label>
          <label className="form-field">
            <span>Photo</span>
            <input type="file" accept="image/*" onChange={handlePhotoChange} />
          </label>
          {photoUrl && <img src={photoUrl} alt="preview" className="photo-preview" />}
          {!isEdit && canApprove(user) && (
            <label className="form-field checkbox-field">
              <input
                type="checkbox"
                checked={allowDirectApproval}
                onChange={(e) => setAllowDirectApproval(e.target.checked)}
              />
              <span>Approve immediately (skip pending approval)</span>
            </label>
          )}
          {error && <p className="error-text">{error}</p>}
          <div className="modal-actions">
            <button type="button" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
