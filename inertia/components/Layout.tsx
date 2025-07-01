import type { ReactNode } from 'react'
import Sidebar from './Sidebar'

interface LayoutProps {
  user: any
  children: ReactNode
}

function Layout({ user, children }: LayoutProps) {
  return (
    <div className="flex min-h-screen bg-background relative">
      {/* Sidebar avec largeur fixe */}
      <div className="md:block hidden">
        <Sidebar user={user} />
      </div>

      <div className="md:hidden block">
        <Sidebar user={user} />
      </div>

      {/* Contenu principal avec marge à gauche pour éviter la superposition */}
      <main className="flex-1 p-4 md:p-6 lg:p-8 pt-16 md:pt-6 transition-all duration-300 md:ml-64 w-full text-foreground">
        {children}
      </main>
    </div>
  )
}

export default Layout
