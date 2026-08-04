import { apiClient } from './client'
import type { ScanResponse } from '../types'

export async function scanCode(code: string, branch?: string): Promise<ScanResponse> {
  try {
    const response = await apiClient.post<ScanResponse>('/api/scan', { code, branch })
    return response.data
  } catch (error: unknown) {
    const axiosError = error as { response?: { data?: ScanResponse } }
    if (axiosError.response?.data) {
      return axiosError.response.data
    }
    throw error
  }
}
