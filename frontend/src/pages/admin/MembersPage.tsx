import { useEffect, useState } from 'react'
import { deleteMember, listMembers } from '../../api/members'
import { downloadMembersCsv } from '../../api/reports'
import { listEntities } from '../../api/entities'
import { MemberFormModal } from './members/MemberFormModal'
import { MemberDetailsModal } from './members/MemberDetailsModal'
import { MemberRenewModal } from './members/MemberRenewModal'
import { StatusBadge } from '../../components/StatusBadge'
import { isBranchManager, useAuth } from '../../auth/AuthContext'
import type { Branch, Member, MembershipType } from '../../types'

export function MembersPage() {
  const { user } = useAuth()
  const [members, setMembers] = useState<Member[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [membershipTypes, setMembershipTypes] = useState<MembershipType[]>([])
  const [branch, setBranch] = useState('')
  const [status, setStatus] = useState('')
  const [membershipType, setMembershipType] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const [showChooser, setShowChooser] = useState(false)
  const [formMember, setFormMember] = useState<Member | null | undefined>(undefined)
  const [detailsMember, setDetailsMember] = useState<Member | null>(null)
  const [renewMember, setRenewMember] = useState<Member | null>(null)

  async function refresh() {
    setLoading(true)
    const data = await listMembers({
      branch: branch || undefined,
      status: status || undefined,
      membership_type: membershipType || undefined,
      search: search || undefined,
    })
    setMembers(data)
    setLoading(false)
  }

  useEffect(() => {
    listEntities<Branch>('/api/branches').then(setBranches)
    listEntities<MembershipType>('/api/membership-types').then(setMembershipTypes)
  }, [])

  useEffect(() => {
    const timer = setTimeout(refresh, 250)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch, status, membershipType, search])

  async function handleDelete(member: Member) {
    if (!confirm(`Delete member ${member.name}?`)) return
    await deleteMember(member.id)
    refresh()
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Members</h2>
          <p className="page-subtitle">Register, manage and renew gym memberships.</p>
        </div>
        <div className="header-actions">
          <button onClick={downloadMembersCsv}>Export CSV</button>
          <button className="primary" onClick={() => setShowChooser(true)}>
            Member Action
          </button>
        </div>
      </div>

      <div className="filter-bar">
        <input placeholder="Search name/email/phone/code..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={branch} onChange={(e) => setBranch(e.target.value)} disabled={isBranchManager(user)}>
          <option value="">All branches</option>
          {branches.map((b) => (
            <option key={b.id} value={b.name}>
              {b.name}
            </option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="Active">Active</option>
          <option value="Pending for Approval">Pending for Approval</option>
          <option value="Renewing">Renewing</option>
          <option value="Expire">Expire</option>
        </select>
        <select value={membershipType} onChange={(e) => setMembershipType(e.target.value)}>
          <option value="">All plans</option>
          {membershipTypes.map((mt) => (
            <option key={mt.id} value={mt.name}>
              {mt.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="loading-state">
          <span className="spinner" />
          Loading members...
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Plan</th>
                <th>Branch</th>
                <th>Expiry</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <td>{m.member_code}</td>
                  <td>{m.name}</td>
                  <td>{m.membership_type}</td>
                  <td>{m.branch}</td>
                  <td>
                    {m.expiry_date} ({m.days_left}d)
                  </td>
                  <td>
                    <StatusBadge status={m.status} />
                  </td>
                  <td className="actions-cell">
                    <button onClick={() => setDetailsMember(m)}>Details</button>
                    <button onClick={() => setFormMember(m)}>Edit</button>
                    <button onClick={() => setRenewMember(m)}>Renew</button>
                    <button className="danger" onClick={() => handleDelete(m)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td colSpan={7} className="empty-row">
                    No members found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showChooser && (
        <div className="modal-overlay" onClick={() => setShowChooser(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Member Action</h3>
            <div className="chooser-actions">
              <button
                className="primary"
                onClick={() => {
                  setShowChooser(false)
                  setFormMember(null)
                }}
              >
                New Member
              </button>
              <p className="muted">To renew an existing member, use the Renew action on their row.</p>
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowChooser(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {formMember !== undefined && (
        <MemberFormModal member={formMember} onClose={() => setFormMember(undefined)} onSaved={refresh} />
      )}
      {detailsMember && <MemberDetailsModal member={detailsMember} onClose={() => setDetailsMember(null)} />}
      {renewMember && (
        <MemberRenewModal member={renewMember} onClose={() => setRenewMember(null)} onSaved={refresh} />
      )}
    </div>
  )
}
