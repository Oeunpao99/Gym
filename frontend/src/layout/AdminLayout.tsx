import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { allowedPages, canApprove, useAuth } from '../auth/AuthContext'
import {
  IconBuilding,
  IconChart,
  IconChecklist,
  IconDashboard,
  IconDumbbell,
  IconGift,
  IconLogout,
  IconPeople,
  IconRefresh,
  IconScanner,
  IconTag,
  IconUser,
  IconUserPlus,
} from '../components/icons'

const NAV_ITEMS: { key: string; label: string; to: string; icon: React.ReactNode }[] = [
  { key: 'dashboard', label: 'Dashboard', to: '/dashboard', icon: <IconDashboard /> },
  { key: 'scanner', label: 'Scanner', to: '/scanner', icon: <IconScanner /> },
  { key: 'members', label: 'Members', to: '/members', icon: <IconPeople /> },
  { key: 'approvals', label: 'Approvals', to: '/approvals', icon: <IconChecklist /> },
  { key: 'renewals', label: 'Renewals', to: '/renewals', icon: <IconRefresh /> },
  { key: 'membership-types', label: 'Membership Types', to: '/membership-types', icon: <IconTag /> },
  { key: 'branches', label: 'Branches', to: '/branches', icon: <IconBuilding /> },
  { key: 'walkins', label: 'Walk-ins', to: '/walkins', icon: <IconUserPlus /> },
  { key: 'promotions', label: 'Promotions', to: '/promotions', icon: <IconGift /> },
  { key: 'reports', label: 'Reports', to: '/reports', icon: <IconChart /> },
]

function roleLabel(role: string | undefined): string {
  if (!role) return ''
  if (role === 'Branch Manager') return 'Branch Manager'
  return role
}

export function AdminLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const allowed = allowedPages(user)
  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.key === 'approvals' && !canApprove(user)) return false
    return !allowed || allowed.includes(item.key)
  })

  const currentItem = visibleItems.find((item) => item.to === location.pathname) ?? NAV_ITEMS[0]

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">
            <IconDumbbell size={17} />
          </span>
          Gym Membership
        </div>
        <nav>
          <div className="sidebar-label">Workspace</div>
          {visibleItems.map((item) => (
            <NavLink
              key={item.key}
              to={item.to}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <span className="sidebar-user-avatar">
              <IconUser size={17} />
            </span>
            <span className="sidebar-user-info">
              <strong>{user?.name}</strong>
              <span>
                {roleLabel(user?.role)}
                {user?.branch ? ` · ${user.branch}` : ''}
              </span>
            </span>
          </div>
          <button className="logout-btn" onClick={logout}>
            <IconLogout size={16} />
            Sign out
          </button>
        </div>
      </aside>
      <div className="main-area">
        <header className="topbar">
          <div className="topbar-title">{currentItem.label}</div>
          <div className="topbar-user">
            <IconDumbbell size={15} color="#106ebe" />
            <span>
              Signed in as <strong>{user?.name}</strong> ({user?.role})
            </span>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
