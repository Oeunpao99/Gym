import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getReportsSummary } from '../../api/reports'
import { StatTile } from '../../components/StatTile'
import { StatusBadge } from '../../components/StatusBadge'
import { IconAlert, IconChart, IconChecklist, IconExternal, IconPeople, IconRefresh } from '../../components/icons'
import type { ReportsSummary } from '../../types'

const TILE_COLORS = {
  blue: '#106ebe',
  green: '#107c10',
  amber: '#c24100',
  purple: '#5c2d91',
  red: '#d13438',
}

export function DashboardPage() {
  const navigate = useNavigate()
  const [summary, setSummary] = useState<ReportsSummary | null>(null)
  const [search, setSearch] = useState('')
  const [branchFilter, setBranchFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    getReportsSummary().then(setSummary)
  }, [])

  const filteredCheckins = useMemo(() => {
    if (!summary) return []
    return summary.recent_checkins.filter((c) => {
      if (branchFilter && c.branch !== branchFilter) return false
      if (statusFilter && c.result !== statusFilter) return false
      if (search) {
        const haystack = `${c.member_name ?? ''} ${c.member_code ?? ''}`.toLowerCase()
        if (!haystack.includes(search.toLowerCase())) return false
      }
      return true
    })
  }, [summary, branchFilter, statusFilter, search])

  const branches = useMemo(
    () => Array.from(new Set(summary?.recent_checkins.map((c) => c.branch).filter(Boolean) as string[])),
    [summary],
  )

  if (!summary) {
    return (
      <div className="page">
        <div className="loading-state">
          <span className="spinner" />
          Loading dashboard...
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Dashboard</h2>
          <p className="page-subtitle">Overview of membership activity across all branches.</p>
        </div>
        <div className="header-actions">
          <button className="primary" onClick={() => navigate('/scanner')}>
            <span style={{ display: 'inline-flex', verticalAlign: 'middle', marginRight: 6 }}>
              <IconExternal size={14} color="#fff" />
            </span>
            Go to Scanner
          </button>
        </div>
      </div>

      <div className="stat-grid">
        <StatTile
          label="Active Members"
          value={summary.active_members}
          icon={<IconPeople size={20} />}
          color={TILE_COLORS.green}
          subtitle={`${summary.expiring_soon} expiring soon`}
        />
        <StatTile
          label="Pending Approval"
          value={summary.pending_approvals}
          icon={<IconChecklist size={20} />}
          color={TILE_COLORS.amber}
        />
        <StatTile
          label="Renewals Today"
          value={summary.renewals_today}
          icon={<IconRefresh size={20} />}
          color={TILE_COLORS.blue}
          subtitle={`${summary.renewals_this_month} this month`}
        />
        <StatTile
          label="Scans Today"
          value={summary.scans_today}
          icon={<IconChart size={20} />}
          color={TILE_COLORS.purple}
        />
        <StatTile
          label="Expired Members"
          value={summary.expired_members}
          icon={<IconAlert size={20} />}
          color={TILE_COLORS.red}
        />
      </div>

      <div className="page-header">
        <div>
          <h3>Recent Check-ins</h3>
          <p className="page-subtitle">Latest scanner results, updated in real time.</p>
        </div>
      </div>
      <div className="filter-bar">
        <input placeholder="Search name/code..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
          <option value="">All branches</option>
          {branches.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="allowed">Allowed</option>
          <option value="renewing">Renewing</option>
          <option value="expired">Expired</option>
          <option value="blocked">Blocked</option>
          <option value="not_found">Not Found</option>
        </select>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Member</th>
              <th>Code</th>
              <th>Branch</th>
              <th>Result</th>
              <th>Scanned At</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredCheckins.map((c) => (
              <tr key={c.id}>
                <td>{c.member_name ?? '—'}</td>
                <td>{c.member_code}</td>
                <td>{c.branch}</td>
                <td>
                  <StatusBadge status={c.result} />
                </td>
                <td>{new Date(c.scanned_at).toLocaleString()}</td>
                <td>
                  {c.branch && (
                    <button onClick={() => window.open(`/kiosk/${encodeURIComponent(c.branch!)}`, '_blank')}>
                      Open TV
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filteredCheckins.length === 0 && (
              <tr>
                <td colSpan={6} className="empty-row">
                  No check-ins yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
