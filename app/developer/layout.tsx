import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { default: 'MydShop Developers', template: '%s | MydShop Developers' },
  description: 'Portal de desenvolvedores MydShop — API, webhooks e integrações.',
  robots: 'noindex',
}

// O root layout já detecta x-page-type: developer e serve HTML limpo (sem Navbar/Footer).
// Este layout só adiciona metadata específica do portal.
export default function DeveloperLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
