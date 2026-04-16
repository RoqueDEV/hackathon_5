import { type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { FileText, Users, BookOpen } from 'lucide-react'

const navItems = [
  { to: '/', label: 'Intake', icon: FileText },
  { to: '/review', label: 'Beoordeling', icon: Users },
  { to: '/audit', label: 'Auditlog', icon: BookOpen },
]

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="flex h-full min-h-screen bg-[--background]">
      {/* Sidebar */}
      <aside className="w-52 flex-shrink-0 border-r border-[--border] flex flex-col">
        {/* Logo area */}
        <div className="h-12 flex items-center px-4 border-b border-[--border]">
          <span className="text-sm font-semibold text-[--text] tracking-tight">
            WMO Zorgagent
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 rounded px-2.5 py-1.5 text-sm transition-colors',
                  isActive
                    ? 'bg-[--accent-subtle] text-[--accent]'
                    : 'text-[--text-muted] hover:bg-[--surface-hover] hover:text-[--text]',
                )
              }
            >
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-[--border]">
          <p className="text-xs text-[--text-muted]">Gemeente prototype</p>
          <p className="text-xs text-[--text-muted] opacity-60">Privacy-by-design</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {children}
      </main>
    </div>
  )
}

interface PageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="h-12 flex items-center justify-between px-6 border-b border-[--border] flex-shrink-0">
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-semibold text-[--text]">{title}</h1>
        {description && (
          <span className="text-sm text-[--text-muted]">{description}</span>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
