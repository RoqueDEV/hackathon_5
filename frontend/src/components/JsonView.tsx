import { cn } from '@/lib/utils'

interface JsonViewProps {
  data: unknown
  className?: string
}

export function JsonView({ data, className }: JsonViewProps) {
  const formatted = JSON.stringify(data, null, 2)
  return (
    <pre
      className={cn(
        'rounded border border-[--border] bg-[--background] p-3 text-xs text-[--text-secondary] overflow-auto font-mono leading-relaxed',
        className,
      )}
    >
      {formatted}
    </pre>
  )
}
