import { apiClient } from './client'
import type { Member, Renewal } from '../types'

export function listRenewals() {
  return apiClient.get<Renewal[]>('/api/renewals').then((r) => r.data)
}

export interface RenewalCreatePayload {
  member_id: number
  member_code?: string
  membership_type?: string
  promotion_id?: number | null
  branch?: string
}

export function createRenewal(payload: RenewalCreatePayload) {
  return apiClient.post<Renewal>('/api/renewals', payload).then((r) => r.data)
}

export interface RenewalProcessPayload {
  membership_type?: string
  duration_days?: number
  start_date?: string
  promotion_id?: number | null
  approved_by?: string
  branch?: string
}

export function processRenewal(id: number, payload: RenewalProcessPayload = {}) {
  return apiClient
    .post<{ renewal: number; member: Member }>(`/api/renewals/${id}/process`, payload)
    .then((r) => r.data)
}
