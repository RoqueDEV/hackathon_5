import { type HTMLAttributes, type ReactNode, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Button } from './button'
import { X } from 'lucide-react'

interface DialogProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  className?: string
}

function Dialog({ open, onClose, title, children, className }: DialogProps) {
  const backdropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (open) {
      document.addEventListener('keydown', handleKey)
    }
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose()
      }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className={cn(
          'relative z-10 w-full max-w-2xl rounded border border-[--border] bg-[--surface] shadow-xl max-h-[90vh] overflow-auto',
          className,
        )}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-[--border] px-4 py-3">
            <span className="text-sm font-medium text-[--text]">{title}</span>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X size={16} />
            </Button>
          </div>
        )}
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}

function DialogSection({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mb-4', className)} {...props} />
}

export { Dialog, DialogSection }
