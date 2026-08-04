import { apiClient } from './client'
import type { Approval, Member } from '../types'

export function listApprovals(all = false) {
  return apiClient.get<Approval[]>('/api/approvals', { params: all ? { all: 1 } : {} }).then((r) => r.data)
}

export function approveApproval(id: number) {
  return apiClient
    .post<{ approval: number; member: Member | null; stale?: boolean; message?: string }>(
      `/api/approvals/${id}/approve`,
    )
    .then((r) => r.data)
}

export function rejectApproval(id: number) {
  return apiClient
    .post<{ approval: number; status: string; stale?: boolean; message?: string }>(`/api/approvals/${id}/reject`)
    .then((r) => r.data)
}

export function bulkApprove(ids: number[]) {
  return apiClient.post<{ approved: unknown[] }>('/api/approvals/bulk-approve', { ids }).then((r) => r.data)
}
