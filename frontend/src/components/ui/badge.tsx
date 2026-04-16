import { type HTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
  {
    variants: {
      variant: {
        default: 'bg-[--border] text-[--text-secondary]',
        accent: 'bg-[--accent-subtle] text-[--accent]',
        success: 'bg-[--success-subtle] text-[--success]',
        warning: 'bg-[--warning-subtle] text-[--warning]',
        destructive: 'bg-[--destructive-subtle] text-[--destructive]',
        outline: 'border border-[--border] text-[--text-muted]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
