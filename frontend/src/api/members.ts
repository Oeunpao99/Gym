import { apiClient } from './client'
import type { Member, Renewal } from '../types'

export interface MemberFilters {
  branch?: string
  status?: string
  membership_type?: string
  search?: string
}

export function listMembers(filters: MemberFilters = {}) {
  return apiClient.get<Member[]>('/api/members', { params: filters }).then((r) => r.data)
}

export function getMember(id: number) {
  return apiClient.get<Member>(`/api/members/${id}`).then((r) => r.data)
}

export function getMemberByCode(code: string) {
  return apiClient.get<Member>(`/api/members/code/${encodeURIComponent(code)}`).then((r) => r.data)
}

export function getMemberRenewals(id: number) {
  return apiClient.get<Renewal[]>(`/api/members/${id}/renewals`).then((r) => r.data)
}

export function getMemberPromotions(id: number) {
  return apiClient.get<Renewal[]>(`/api/members/${id}/promotions`).then((r) => r.data)
}

export interface MemberCreatePayload {
  name: string
  email?: string
  phone?: string
  membership_type: string
  join_date?: string | null
  remarks?: string
  photo_url?: string
  member_code?: string
  branch?: string
  promotion_id?: number | null
  status?: string
  allow_direct_approval?: boolean
}

export function createMember(payload: MemberCreatePayload) {
  return apiClient.post<Member>('/api/members', payload).then((r) => r.data)
}

export function updateMember(id: number, payload: Partial<Member>) {
  return apiClient.put<Member>(`/api/members/${id}`, payload).then((r) => r.data)
}

export function deleteMember(id: number) {
  return apiClient.delete(`/api/members/${id}`).then((r) => r.data)
}
