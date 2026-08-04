import { apiClient } from './client'
import type { Checkin } from '../types'

export function listCheckins() {
  return apiClient.get<Checkin[]>('/api/checkins').then((r) => r.data)
}
