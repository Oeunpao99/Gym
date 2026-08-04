const STATUS_CLASS: Record<string, string> = {
  Active: 'badge-active',
  allowed: 'badge-allowed',
  Approved: 'badge-approved',
  Renewing: 'badge-renewing',
  'Pending for Approval': 'badge-pending',
  Pending: 'badge-pending',
  Expire: 'badge-expire',
  Expired: 'badge-expired',
  blocked: 'badge-blocked',
  Rejected: 'badge-rejected',
  not_found: 'badge-not_found',
  Inactive: 'badge-inactive',
  Converted: 'badge-converted',
}

function statusClass(status: string | null | undefined): string {
  const normalized = (status ?? '').trim().toLowerCase()
  if (!normalized) return 'badge-neutral'
  for (const [key, cls] of Object.entries(STATUS_CLASS)) {
    if (key.toLowerCase() === normalized) return cls
  }
  return 'badge-neutral'
}

export function StatusBadge({ status }: { status: string | null | undefined }) {
  return <span className={`badge ${statusClass(status)}`}>{status ?? '—'}</span>
}
