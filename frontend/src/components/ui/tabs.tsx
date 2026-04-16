import { type ReactNode, createContext, useContext, useState } from 'react'
import { cn } from '@/lib/utils'

interface TabsContextValue {
  active: string
  setActive: (id: string) => void
}

const TabsContext = createContext<TabsContextValue>({
  active: '',
  setActive: () => undefined,
})

interface TabsProps {
  defaultValue: string
  children: ReactNode
  className?: string
}

function Tabs({ defaultValue, children, className }: TabsProps) {
  const [active, setActive] = useState(defaultValue)
  return (
    <TabsContext.Provider value={{ active, setActive }}>
      <div className={cn('w-full', className)}>{children}</div>
    </TabsContext.Provider>
  )
}

function TabsList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'flex gap-1 border-b border-[--border] pb-0 mb-4',
        className,
      )}
    >
      {children}
    </div>
  )
}

function TabsTrigger({
  value,
  children,
  className,
}: {
  value: string
  children: ReactNode
  className?: string
}) {
  const { active, setActive } = useContext(TabsContext)
  const isActive = active === value
  return (
    <button
      onClick={() => setActive(value)}
      className={cn(
        'px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
        isActive
          ? 'border-[--accent] text-[--text]'
          : 'border-transparent text-[--text-muted] hover:text-[--text]',
        className,
      )}
    >
      {children}
    </button>
  )
}

function TabsContent({
  value,
  children,
  className,
}: {
  value: string
  children: ReactNode
  className?: string
}) {
  const { active } = useContext(TabsContext)
  if (active !== value) return null
  return <div className={cn('', className)}>{children}</div>
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
