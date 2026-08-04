import { useEffect, useState } from 'react'
import { approveApproval, listApprovals, rejectApproval } from '../../api/approvals'
import { StatusBadge } from '../../components/StatusBadge'
import type { Approval } from '../../types'

export function ApprovalsPage() {
  const [approvals, setApprovals] = useState<Approval[]>([])
  const [showAll, setShowAll] = useState(false)
  const [loading, setLoading] = useState(true)

  async function refresh() {
    setLoading(true)
    setApprovals(await listApprovals(showAll))
    setLoading(false)
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAll])

  async function handleApprove(id: number) {
    const result = await approveApproval(id)
    if (result.stale) alert(result.message)
    refresh()
  }

  async function handleReject(id: number) {
    if (!confirm('Reject this request?')) return
    const result = await rejectApproval(id)
    if (result.stale) alert(result.message)
    refresh()
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Approvals</h2>
          <p className="page-subtitle">Review and approve new membership requests.</p>
        </div>
        <label className="checkbox-field" style={{ fontWeight: 500 }}>
          <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} /> Show all
        </label>
      </div>
      {loading ? (
        <div className="loading-state">
          <span className="spinner" />
          Loading approvals...
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Plan</th>
                <th>Branch</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {approvals.map((a) => (
                <tr key={a.id}>
                  <td>{a.name}</td>
                  <td>{a.request_type}</td>
                  <td>{a.membership_type}</td>
                  <td>{a.branch}</td>
                  <td>{a.date}</td>
                  <td>
                    <StatusBadge status={a.status} />
                  </td>
                  <td className="actions-cell">
                    {a.status === 'Pending for Approval' && (
                      <>
                        <button onClick={() => handleApprove(a.id)}>Approve</button>
                        <button className="danger" onClick={() => handleReject(a.id)}>
                          Reject
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {approvals.length === 0 && (
                <tr>
                  <td colSpan={7} className="empty-row">
                    No approvals to show.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
