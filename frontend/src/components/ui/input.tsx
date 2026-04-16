import { type InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-8 w-full rounded border border-[--border] bg-[--surface] px-3 py-1 text-sm text-[--text] placeholder:text-[--text-muted]',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[--accent]',
          'disabled:cursor-not-allowed disabled:opacity-40',
          'transition-colors',
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'

export { Input }
