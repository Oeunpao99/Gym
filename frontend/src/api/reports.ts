import { apiClient } from './client'
import type { ReportsSummary } from '../types'

export function getReportsSummary() {
  return apiClient.get<ReportsSummary>('/api/reports/summary').then((r) => r.data)
}

/** A plain <a href> navigation can't carry the Authorization header, so the CSV is
 * fetched as a blob and downloaded via a synthetic link instead. */
export async function downloadMembersCsv() {
  const response = await apiClient.get('/api/export/members.csv', { responseType: 'blob' })
  const url = URL.createObjectURL(response.data as Blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'gym-members-backup.csv'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
