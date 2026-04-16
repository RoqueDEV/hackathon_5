import { type TextareaHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex w-full rounded border border-[--border] bg-[--surface] px-3 py-2 text-sm text-[--text] placeholder:text-[--text-muted]',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[--accent]',
          'disabled:cursor-not-allowed disabled:opacity-40',
          'resize-none transition-colors',
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Textarea.displayName = 'Textarea'

export { Textarea }
