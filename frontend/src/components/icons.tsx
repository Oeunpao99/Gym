interface IconProps {
  size?: number
  color?: string
}

function Base({ size = 18, color = 'currentColor', children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export function IconDashboard(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" />
    </Base>
  )
}

export function IconScanner(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M3 8V5.5A1.5 1.5 0 0 1 4.5 4H7" />
      <path d="M17 4h2.5A1.5 1.5 0 0 1 21 5.5V8" />
      <path d="M21 16v2.5a1.5 1.5 0 0 1-1.5 1.5H17" />
      <path d="M7 20H4.5A1.5 1.5 0 0 1 3 18.5V16" />
      <path d="M3 12h18" />
    </Base>
  )
}

export function IconPeople(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.8 19.5a6.2 6.2 0 0 1 12.4 0" />
      <path d="M16 5a3.5 3.5 0 0 1 0 6.6" />
      <path d="M17.8 14.1a6.2 6.2 0 0 1 3.4 5.4" />
    </Base>
  )
}

export function IconChecklist(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M9 6h12" />
      <path d="M9 12h12" />
      <path d="M9 18h12" />
      <path d="M4.5 5.5 6 7l2.5-2.5" />
      <path d="M4.5 11.5 6 13l2.5-2.5" />
      <path d="M4.5 17.5 6 19l2.5-2.5" />
    </Base>
  )
}

export function IconRefresh(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M20 11.5A8 8 0 1 1 18.4 6.8" />
      <path d="M21 3v4.5h-4.5" />
    </Base>
  )
}

export function IconTag(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12.6 3 5 5.1 2.9 12.6a1.5 1.5 0 0 0 .4 1.4l6.7 6.7a1.5 1.5 0 0 0 2.1 0l6.7-6.7a1.5 1.5 0 0 0 0-2.1l-6.7-6.7a1.5 1.5 0 0 0-1.1-.4Z" />
      <circle cx="8" cy="8" r="1.5" />
    </Base>
  )
}

export function IconBuilding(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="4" y="3.5" width="16" height="17" rx="1.5" />
      <path d="M8 8h2m4 0h2M8 12h2m4 0h2M8 16h2m4 0h2" />
    </Base>
  )
}

export function IconUserPlus(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 19.5a6.5 6.5 0 0 1 13 0" />
      <path d="M18 8v6m3-3h-6" />
    </Base>
  )
}

export function IconGift(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="3.5" y="8" width="17" height="4" rx="1" />
      <path d="M5 8v10.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V8" />
      <path d="M12 8v12" />
      <path d="M12 8s-4.5-4.6-2.2-6.4C11.7 0 12 4.5 12 8Z" />
      <path d="M12 8s4.5-4.6 2.2-6.4C12.3 0 12 4.5 12 8Z" />
    </Base>
  )
}

export function IconChart(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M3.5 3.5v17h17" />
      <path d="M8 16v-4m4.5 4v-7m4.5 7V8" />
    </Base>
  )
}

export function IconAlert(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 3 2.5 19.5a1 1 0 0 0 .9 1.5h17.2a1 1 0 0 0 .9-1.5Z" />
      <path d="M12 9.5v4.5" />
      <circle cx="12" cy="17" r="0.8" fill="currentColor" />
    </Base>
  )
}

export function IconLogout(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M9.5 21h9a1.5 1.5 0 0 0 1.5-1.5v-15A1.5 1.5 0 0 0 18.5 3h-9" />
      <path d="m15 12-4.5-4.5M10.5 12 15 7.5" />
    </Base>
  )
}

export function IconUser(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
    </Base>
  )
}

export function IconDumbbell(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M6.5 7.5v9M17.5 7.5v9" />
      <path d="M3 10v4M21 10v4" />
      <rect x="6.5" y="5" width="11" height="14" rx="2" />
      <path d="M8.5 5H6.5v2M15.5 5h2v2M8.5 19h-2v-2M15.5 19h2v-2" />
    </Base>
  )
}

export function IconExternal(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M14 4h6v6" />
      <path d="M20 4l-9 9" />
      <path d="M20 14v4.5A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5v-13A1.5 1.5 0 0 1 5.5 4H10" />
    </Base>
  )
}