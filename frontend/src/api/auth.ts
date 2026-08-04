import { apiClient } from './client'
import type { User } from '../types'

export interface LoginResult {
  access_token: string
  token_type: string
  user: User
}

export function login(username: string, password: string) {
  return apiClient.post<LoginResult>('/api/auth/login', { username, password }).then((r) => r.data)
}
