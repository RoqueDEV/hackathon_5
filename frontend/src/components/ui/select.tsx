import { type SelectHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          'flex h-8 w-full rounded border border-[--border] bg-[--surface] px-3 py-1 text-sm text-[--text]',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[--accent]',
          'disabled:cursor-not-allowed disabled:opacity-40',
          'appearance-none transition-colors cursor-pointer',
          className,
        )}
        {...props}
      >
        {children}
      </select>
    )
  },
)
Select.displayName = 'Select'

export { Select }
