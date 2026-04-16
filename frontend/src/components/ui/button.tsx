import { type ButtonHTMLAttributes, forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--accent] disabled:pointer-events-none disabled:opacity-40 select-none',
  {
    variants: {
      variant: {
        primary:
          'bg-[--accent] text-white hover:bg-[--accent-hover]',
        secondary:
          'border border-[--border] text-[--text] hover:bg-[--surface-hover] bg-transparent',
        ghost:
          'text-[--text-muted] hover:bg-[--surface-hover] hover:text-[--text] bg-transparent',
        destructive:
          'bg-[--destructive] text-white hover:opacity-90',
        success:
          'bg-[--success] text-white hover:opacity-90',
      },
      size: {
        sm: 'h-7 px-3 text-xs',
        default: 'h-8 px-4',
        lg: 'h-10 px-6',
        icon: 'h-8 w-8',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
