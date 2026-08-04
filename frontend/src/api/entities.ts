import { apiClient } from './client'

/** Generic CRUD client for the schema-driven entity pages (membership-types, branches,
 * walkins, promotions) and the semi-bespoke ones (approvals, renewals, reports). */
export function listEntities<T>(path: string, params?: Record<string, unknown>) {
  return apiClient.get<T[]>(path, { params }).then((r) => r.data)
}

export function getEntity<T>(path: string, id: number) {
  return apiClient.get<T>(`${path}/${id}`).then((r) => r.data)
}

export function createEntity<T>(path: string, payload: Partial<T>) {
  return apiClient.post<T>(path, payload).then((r) => r.data)
}

export function updateEntity<T>(path: string, id: number, payload: Partial<T>) {
  return apiClient.put<T>(`${path}/${id}`, payload).then((r) => r.data)
}

export function deleteEntity(path: string, id: number) {
  return apiClient.delete(`${path}/${id}`).then((r) => r.data)
}
