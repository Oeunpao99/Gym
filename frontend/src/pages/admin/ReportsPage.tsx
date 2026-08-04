import { useEffect, useState } from 'react'
import { getReportsSummary } from '../../api/reports'
import { createEntity, deleteEntity, listEntities, updateEntity } from '../../api/entities'
import { entitySchemas } from '../../config/entitySchemas'
import { EntityTable } from '../../components/EntityTable'
import { EntityModal } from '../../components/EntityModal'
import { StatTile } from '../../components/StatTile'
import { IconAlert, IconChecklist, IconRefresh } from '../../components/icons'
import type { ReportsSummary } from '../../types'

const reportsSchema = entitySchemas.reports

export function ReportsPage() {
  const [summary, setSummary] = useState<ReportsSummary | null>(null)
  const [savedReports, setSavedReports] = useState<Record<string, unknown>[]>([])
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null)
  const [showModal, setShowModal] = useState(false)

  async function refreshSummary() {
    setSummary(await getReportsSummary())
  }

  async function refreshSaved() {
    setSavedReports(await listEntities<Record<string, unknown>>(reportsSchema.apiPath))
  }

  useEffect(() => {
    refreshSummary()
    refreshSaved()
  }, [])

  async function handleSave(values: Record<string, unknown>) {
    if (editing?.id) await updateEntity(reportsSchema.apiPath, Number(editing.id), values)
    else await createEntity(reportsSchema.apiPath, values)
    await refreshSaved()
  }

  async function handleDelete(row: Record<string, unknown>) {
    if (!confirm('Delete this report?')) return
    await deleteEntity(reportsSchema.apiPath, Number(row.id))
    await refreshSaved()
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Reports</h2>
          <p className="page-subtitle">Daily statistics and saved report archive.</p>
        </div>
        <button onClick={refreshSummary}>Refresh</button>
      </div>

      {summary && (
        <>
          <h3>Daily Report ({summary.daily_report.date})</h3>
          <div className="stat-grid">
            <StatTile
              label="Active Members"
              value={summary.daily_report.total_active}
              icon={<IconChecklist size={20} />}
              color="#107c10"
            />
            <StatTile
              label="Renewals"
              value={summary.daily_report.total_renewal}
              icon={<IconRefresh size={20} />}
              color="#106ebe"
            />
            <StatTile
              label="Expired"
              value={summary.daily_report.total_expire}
              icon={<IconAlert size={20} />}
              color="#d13438"
            />
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Membership Type</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {summary.daily_report.by_membership_type.map((row) => (
                  <tr key={row.label}>
                    <td>{row.label}</td>
                    <td>{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="page-header">
        <h3>Saved Reports</h3>
        <button
          className="primary"
          onClick={() => {
            setEditing({})
            setShowModal(true)
          }}
        >
          Add Report
        </button>
      </div>
      <EntityTable
        schema={reportsSchema}
        rows={savedReports}
        onEdit={(row) => {
          setEditing(row)
          setShowModal(true)
        }}
        onDelete={handleDelete}
      />
      {showModal && editing && (
        <EntityModal schema={reportsSchema} initial={editing} onSave={handleSave} onClose={() => setShowModal(false)} />
      )}
    </div>
  )
}
