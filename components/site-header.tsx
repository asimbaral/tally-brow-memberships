import Image from "next/image"
import Link from "next/link"
import type { ReactNode } from "react"

// A translucent layer like the website's header: content scrolls beneath it, and a
// soft edge fades in only once something is actually underneath.
export function SiteHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="site-header material sticky top-0 z-40">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="pressable -ml-1 flex shrink-0 items-center gap-3 rounded-lg p-1" aria-label="Memberships home">
          <Image src="/images/logo.webp" alt="Tally Brow Studio" width={560} height={161} priority className="h-9 w-auto sm:h-10" />
          <span className="hidden border-l-2 border-lip-soft pl-3 font-display text-lg font-semibold text-brand-ink sm:inline">
            Memberships
          </span>
        </Link>
        {children && <div className="flex items-center gap-2">{children}</div>}
      </div>
    </header>
  )
}

// The soft pastel hero band the website puts at the top of every page.
export function PageHero({ children }: { children: ReactNode }) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-surface-2 to-transparent">
      <div aria-hidden className="pointer-events-none absolute -left-32 -top-40 size-96 rounded-full bg-brand-tint blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-28 size-[26rem] rounded-full bg-lilac opacity-80 blur-3xl" />
      <div className="relative mx-auto max-w-6xl px-4 pb-8 pt-8 sm:px-6 sm:pb-10 sm:pt-10">{children}</div>
    </div>
  )
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="chip type-eyebrow w-fit">
      <SparkleIcon />
      {children}
    </p>
  )
}

function SparkleIcon() {
  return (
    <svg aria-hidden width={14} height={14} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2c.6 4.6 2.4 6.9 7 8-4.6 1.1-6.4 3.4-7 8-.6-4.6-2.4-6.9-7-8 4.6-1.1 6.4-3.4 7-8z" />
      <path d="M19 15.5c.25 1.7.9 2.45 2.5 2.75-1.6.3-2.25 1.05-2.5 2.75-.25-1.7-.9-2.45-2.5-2.75 1.6-.3 2.25-1.05 2.5-2.75z" />
    </svg>
  )
}
