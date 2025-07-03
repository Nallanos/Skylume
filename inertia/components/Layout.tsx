import type { ReactNode } from 'react'
import Sidebar from './Sidebar'
import { Toaster } from 'sonner'

interface LayoutProps {
  user: any
  account?: {
    id: string
    handle: string
    followersCount?: number
  }
  children: ReactNode
}

function Layout({ user, account, children }: LayoutProps) {
  return (
    <div className="flex min-h-screen bg-background relative">
      {/* Sidebar avec largeur fixe */}
      <div className="md:block hidden">
        <Sidebar user={user} account={account} />
      </div>

      <div className="md:hidden block">
        <Sidebar user={user} account={account} />
      </div>

      {/* Contenu principal avec marge à gauche pour éviter la superposition */}
      <main className="flex-1 p-4 md:p-6 lg:p-8 pt-16 md:pt-6 transition-all duration-300 md:ml-64 w-full text-foreground">
        {children}
      </main>

      {/* Toast notifications */}
      <Toaster richColors position="top-right" />
    </div>
  )
}

export default Layout
