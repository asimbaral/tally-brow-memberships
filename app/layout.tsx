import type { Metadata, Viewport } from 'next'
import { Dancing_Script, Fredoka } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/sonner'
import { THEME, THEME_COLOR } from '@/lib/theme'
import './globals.css'

// Same type as the Tally Brow website: Fredoka for headings (rounded, sticker-book
// voice), the system font for body text, and a script accent for short asides.
const fredoka = Fredoka({
  variable: '--font-fredoka',
  subsets: ['latin'],
  display: 'swap',
})

const dancing = Dancing_Script({
  variable: '--font-dancing',
  subsets: ['latin'],
  weight: ['600'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Memberships | Tally Brow Studio',
  description: 'Track salon memberships and client visits',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: THEME_COLOR,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${THEME} ${fredoka.variable} ${dancing.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        {children}
        <Toaster theme={THEME} position="top-center" richColors />
        <Analytics />
      </body>
    </html>
  )
}
