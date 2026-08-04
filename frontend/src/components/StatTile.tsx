export interface StatTileProps {
  label: string
  value: number | string
  icon?: React.ReactNode
  color?: string
  subtitle?: string
}

export function StatTile({ label, value, icon, color = '#106ebe', subtitle }: StatTileProps) {
  return (
    <div className="stat-tile">
      {icon && (
        <span className="stat-tile-icon" style={{ background: color }}>
          {icon}
        </span>
      )}
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {subtitle && <div className="stat-label">{subtitle}</div>}
    </div>
  )
}
