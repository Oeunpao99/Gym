export type UserRole = 'Branch Manager' | 'Head Office' | 'CEO'

export interface User {
  username: string
  name: string
  role: UserRole
  branch: string | null
}

export interface Member {
  id: number
  member_code: string
  name: string
  email: string | null
  phone: string | null
  membership_type: string
  join_date: string | null
  expiry_date: string | null
  days_left: number
  status: string
  remarks: string | null
  photo_url: string | null
  branch: string | null
  promotion_id: number | null
  promotion_applied: string | null
}

export interface Approval {
  id: number
  member_id: number | null
  name: string
  email: string | null
  phone: string | null
  request_type: string | null
  membership_type: string | null
  date: string | null
  branch: string | null
  status: string
  photo_url: string | null
  promotion_id: number | null
  promotion_applied: string | null
}

export interface Renewal {
  id: number
  member_id: number | null
  member_code: string | null
  photo_url: string | null
  request_date: string | null
  processed_date: string | null
  status: string
  bonus_days: number | null
  remarks: string | null
  previous_end_date: string | null
  new_end_date: string | null
  membership_type: string | null
  promotion_id: number | null
  promotion_applied: string | null
  approved_by: string | null
  branch: string | null
}

export interface MembershipType {
  id: number
  name: string
  duration_days: number
  price: number
  description: string | null
}

export interface Branch {
  id: number
  code: string | null
  name: string
  address: string | null
  phone: string | null
}

export interface Promotion {
  id: number
  promotion_code: string | null
  promotion_name: string
  base_duration_value: number
  base_duration_unit: string
  extra_duration_value: number
  extra_duration_unit: string
  package_price: number | null
  applicable_membership_type: string | null
  usage_limit: number
  used_count: number
  status: string
  start_date: string | null
  end_date: string | null
}

export interface Walkin {
  id: number
  name: string
  phone: string | null
  time: string | null
  purpose: string | null
  status: string | null
  converted: boolean
}

export interface ReportRecord {
  id: number
  type: string | null
  period_start: string | null
  period_end: string | null
  generated_at: string | null
  data: string | null
}

export interface Checkin {
  id: number
  member_id: number | null
  member_code: string | null
  scanned_at: string
  branch: string | null
  result: string | null
  notes: string | null
  member_name: string | null
  membership_type: string | null
  status: string | null
  photo_url: string | null
}

export interface ReportsSummary {
  total_records: number
  active_members: number
  pending_approvals: number
  renewing_members: number
  expired_members: number
  expiring_soon: number
  scans_today: number
  renewals_today: number
  renewals_this_month: number
  by_membership_type: { label: string; count: number }[]
  by_branch: { label: string; count: number }[]
  daily_report: {
    date: string
    by_membership_type: { label: string; count: number }[]
    total_active: number
    total_renewal: number
    total_expire: number
  }
  recent_checkins: Checkin[]
}

export interface ScanResponse {
  can_scan: boolean
  result: string
  message: string
  scanned_at: string
  scan: Checkin
  member: Member | null
}

export interface TvPayload {
  scan: Checkin | null
  member: Member | null
}
