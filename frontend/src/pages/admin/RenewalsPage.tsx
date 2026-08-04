import { useEffect, useState } from 'react'
import { listRenewals, processRenewal } from '../../api/renewals'
import { AddRenewalModal } from './renewals/AddRenewalModal'
import { StatusBadge } from '../../components/StatusBadge'
import { canApprove, useAuth } from '../../auth/AuthContext'
import type { Renewal } from '../../types'

export function RenewalsPage() {
  const { user } = useAuth()
  const [renewals, setRenewals] = useState<Renewal[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  async function refresh() {
    setLoading(true)
    setRenewals(await listRenewals())
    setLoading(false)
  }

  useEffect(() => {
    refresh()
  }, [])

  async function handleProcess(id: number) {
    await processRenewal(id, { approved_by: user?.name })
    refresh()
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Renewals</h2>
          <p className="page-subtitle">Process membership renewals and extensions.</p>
        </div>
        <button className="primary" onClick={() => setShowAdd(true)}>
          Add Renewal
        </button>
      </div>
      {loading ? (
        <div className="loading-state">
          <span className="spinner" />
          Loading renewals...
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Member Code</th>
                <th>Plan</th>
                <th>Requested</th>
                <th>Status</th>
                <th>New Expiry</th>
                <th>Branch</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {renewals.map((r) => (
                <tr key={r.id}>
                  <td>{r.member_code}</td>
                  <td>{r.membership_type}</td>
                  <td>{r.request_date}</td>
                  <td>
                    <StatusBadge status={r.status} />
                  </td>
                  <td>{r.new_end_date ?? '—'}</td>
                  <td>{r.branch}</td>
                  <td className="actions-cell">
                    {r.status !== 'Approved' && canApprove(user) && (
                      <button onClick={() => handleProcess(r.id)}>Process</button>
                    )}
                  </td>
                </tr>
              ))}
              {renewals.length === 0 && (
                <tr>
                  <td colSpan={7} className="empty-row">
                    No renewals yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {showAdd && <AddRenewalModal onClose={() => setShowAdd(false)} onSaved={refresh} />}
    </div>
  )
}
