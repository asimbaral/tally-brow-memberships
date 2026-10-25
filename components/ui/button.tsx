import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "pressable inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold tracking-[-0.003em] select-none disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-brand aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        // Puffy candy button: a glossy top, a solid lip underneath. On press it
        // sinks 3px onto the lip, so it reads as one object being pushed down.
        default:
          'text-on-brand [--press-y:3px] [--press-scale:0.98] bg-[linear-gradient(to_bottom,color-mix(in_srgb,var(--brand)_82%,white),var(--brand)_55%)] shadow-[0_2px_0_rgb(255_255_255/0.3)_inset,0_4px_0_var(--lip),var(--glow)] hover:bg-[linear-gradient(to_bottom,color-mix(in_srgb,var(--brand)_88%,white),color-mix(in_srgb,var(--brand)_92%,black)_55%)] active:bg-brand-press active:bg-none active:shadow-[0_1px_0_rgb(255_255_255/0.2)_inset,0_1px_0_var(--lip)]',
        destructive:
          'bg-danger text-white [--press-y:3px] [--press-scale:0.98] shadow-[0_4px_0_color-mix(in_srgb,var(--danger)_70%,black)] hover:bg-[color-mix(in_srgb,var(--danger)_90%,black)] active:shadow-[0_1px_0_color-mix(in_srgb,var(--danger)_70%,black)]',
        outline:
          'bg-surface text-ink [--press-y:3px] [--press-scale:0.98] shadow-[0_0_0_2px_var(--lip-soft)_inset,0_4px_0_var(--lip-soft)] hover:bg-surface-2 active:bg-brand-tint active:shadow-[0_0_0_2px_var(--lip-soft)_inset,0_1px_0_var(--lip-soft)]',
        secondary:
          'bg-brand-tint text-brand-ink hover:bg-[color-mix(in_srgb,var(--brand-tint)_85%,var(--brand))]',
        ghost:
          'text-brand-ink hover:bg-brand-tint',
        link: 'text-brand-ink underline-offset-4 hover:underline',
      },
      size: {
        default: 'min-h-11 px-5 text-[0.9375rem] has-[>svg]:px-4',
        sm: 'min-h-9 gap-1.5 px-3.5 text-sm has-[>svg]:px-3',
        lg: 'min-h-12 px-6 text-base has-[>svg]:px-5',
        icon: 'size-11',
        'icon-sm': 'size-9',
        'icon-lg': 'size-12',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
