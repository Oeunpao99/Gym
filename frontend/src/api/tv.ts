import { apiClient, API_BASE_URL } from './client'
import type { TvPayload } from '../types'

export function getLatestScan(branch: string) {
  return apiClient.get<TvPayload>(`/api/tv/${encodeURIComponent(branch)}/latest`).then((r) => r.data)
}

export function tvStreamUrl(branch: string) {
  return `${API_BASE_URL}/api/tv/${encodeURIComponent(branch)}/stream`
}
