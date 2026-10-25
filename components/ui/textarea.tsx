import * as React from 'react'

import { cn } from '@/lib/utils'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'placeholder:text-muted-foreground aria-invalid:ring-destructive/20 aria-invalid:border-destructive flex field-sizing-content min-h-16 w-full border-input bg-surface rounded-[var(--radius-control)] border-2 shadow-none transition-[color,box-shadow,border-color] focus-visible:border-brand focus-visible:ring-brand/20 focus-visible:ring-4 px-3.5 py-2.5 text-base outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
