import { useState } from 'react'
import { Link, router } from '@inertiajs/react'
import {
  Calendar,
  LayoutDashboard,
  Menu,
  EllipsisVertical,
  X as CloseIcon,
  Hash,
  MessageSquare,
  Settings,
  Moon,
  Sun,
  Users,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from './ui/dropdown-menu'
import { Button } from './ui/button'
import ThemeToggle from './ThemeToggle'

interface SidebarProps {
  user: any
  account?: {
    id: string
    handle: string
    followersCount?: number
  }
}

function Sidebar({ user, account }: SidebarProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // Get current path
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : ''

  async function handleLogout() {
    await router.put('/logout')
  }

  async function handleDeleteAccount() {
    if (confirm('Are you sure you want to delete your account? This action is irreversible.')) {
      await router.delete('/delete')
    }
  }

  function isActive(href: string): boolean {
    if (href === '/') {
      return currentPath === '/' || currentPath === ''
    }
    return currentPath.startsWith(href)
  }

  return (
    <>
      {!isSidebarOpen && (
        <button
          className="md:hidden fixed top-4 left-4 z-50 p-2 bg-background/80 backdrop-blur border border-border rounded-md shadow-sm"
          onClick={() => setIsSidebarOpen(true)}
        >
          <Menu className="h-5 w-5 text-foreground/80" />
        </button>
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-card/80 backdrop-blur-md border-r border-border/50 shadow-sm transform transition-transform duration-300 ease-in-out md:translate-x-0 flex flex-col overflow-hidden ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Bouton de fermeture (visible sur mobile) */}
        <button
          className="absolute top-4 right-4 md:hidden p-2 rounded-full hover:bg-background/80 transition-colors"
          onClick={() => setIsSidebarOpen(false)}
        >
          <CloseIcon className="h-5 w-5 text-foreground/70" />
        </button>

        <div className="p-4 flex items-center gap-3 flex-shrink-0 border-b border-border/30">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center text-white font-bold text-lg shadow-sm">
              B
            </div>
            <span className="text-xl font-bold text-blue-600 dark:text-blue-400">BluePilot</span>
          </Link>
        </div>

        <nav className="px-3 py-4 flex-1 overflow-y-auto">
          <div className="space-y-1.5">
            <Link
              href="/dashboard"
              className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-all duration-150 ${
                isActive('/dashboard')
                  ? 'bg-blue-500/10 text-blue-950 dark:text-blue-500 font-semibold shadow-sm'
                  : 'text-blue-950 dark:text-blue-400 hover:bg-accent/50 hover:text-blue-900 dark:hover:text-blue-500 font-medium'
              }`}
            >
              <LayoutDashboard className="h-[18px] w-[18px] flex-shrink-0" />
              Dashboard
            </Link>

            <Link
              href="/schedule"
              className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-all duration-150 ${
                isActive('/schedule')
                  ? 'bg-blue-500/10 text-blue-950 dark:text-blue-500 font-semibold shadow-sm'
                  : 'text-blue-950 dark:text-blue-400 hover:bg-accent/50 hover:text-blue-900 dark:hover:text-blue-500 font-medium'
              }`}
            >
              <Calendar className="h-[18px] w-[18px] flex-shrink-0 text-current" />
              Scheduling
            </Link>

            <Link
              href="/feeds"
              className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-all duration-150 ${
                isActive('/feeds')
                  ? 'bg-blue-500/10 text-blue-950 dark:text-blue-500 font-semibold shadow-sm'
                  : 'text-blue-950 dark:text-blue-400 hover:bg-accent/50 hover:text-blue-900 dark:hover:text-blue-500 font-medium'
              }`}
            >
              <Hash className="h-[18px] w-[18px] flex-shrink-0" />
              Feeds
            </Link>

            <Link
              href="/campaign"
              className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-all duration-150 ${
                isActive('/campaign')
                  ? 'bg-blue-500/10 text-blue-950 dark:text-blue-500 font-semibold shadow-sm'
                  : 'text-blue-950 dark:text-blue-400 hover:bg-accent/50 hover:text-blue-900 dark:hover:text-blue-500 font-medium'
              }`}
            >
              <MessageSquare className="h-[18px] w-[18px] flex-shrink-0" />
              DM Campaigns
            </Link>

            <Link
              href="/follower-tracker"
              className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-all duration-150 ${
                isActive('/follower-tracker')
                  ? 'bg-blue-500/10 text-blue-950 dark:text-blue-500 font-semibold shadow-sm'
                  : 'text-blue-950 dark:text-blue-400 hover:bg-accent/50 hover:text-blue-900 dark:hover:text-blue-500 font-medium'
              }`}
            >
              <Users className="h-[18px] w-[18px] flex-shrink-0" />
              Follower Tracker
            </Link>

            <Link
              href="/hashtag-groups"
              className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-all duration-150 ${
                isActive('/hashtag-groups')
                  ? 'bg-blue-500/10 text-blue-950 dark:text-blue-500 font-semibold shadow-sm'
                  : 'text-blue-950 dark:text-blue-400 hover:bg-accent/50 hover:text-blue-900 dark:hover:text-blue-500 font-medium'
              }`}
            >
              <Hash className="h-[18px] w-[18px] flex-shrink-0" />
              Hashtag Groups
            </Link>
          </div>

          {/* Current Account Info */}
          {account && (
            <div className="mt-6 px-3">
              <div className="border-t border-border/30 pt-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Current Account
                </p>
                <div className="flex items-center gap-3 p-2 rounded-md bg-accent/30">
                  <div className="w-8 h-8 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center text-white font-semibold text-sm">
                    {account.handle[0]?.toUpperCase() || 'A'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground truncate">
                      @{account.handle}
                    </p>
                    {account.followersCount !== undefined && (
                      <p className="text-xs text-muted-foreground">
                        {account.followersCount.toLocaleString()} followers
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </nav>

        {/* Footer with user info */}
        <div className="p-3 border-t border-border/30 flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Avatar with better contrast */}
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center text-white font-semibold text-sm shadow-lg ring-2 ring-white/20 dark:ring-white/10">
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background"></div>
            </div>

            {/* User info */}
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-foreground truncate">
                {user?.email?.split('@')[0] || 'User'}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {user?.subscription?.plan || 'Free'} Plan
              </div>
            </div>

            {/* Dropdown menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-8 h-8 p-0 hover:bg-accent/80 transition-colors"
                >
                  <EllipsisVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  {user?.email || 'user@example.com'}
                </div>
                <DropdownMenuSeparator />

                {/* Theme toggle integrated in menu */}
                <DropdownMenuItem onClick={(e) => e.preventDefault()}>
                  <div className="flex items-center justify-between w-full">
                    <span className="flex items-center">
                      {typeof window !== 'undefined' &&
                      document.documentElement.className === 'dark' ? (
                        <Moon className="h-4 w-4 mr-2" />
                      ) : (
                        <Sun className="h-4 w-4 mr-2" />
                      )}
                      Theme
                    </span>
                    <ThemeToggle />
                  </div>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex items-center">
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link href="/plan/change" className="flex items-center text-foreground hover:text-blue-600 dark:hover:text-blue-400">
                    <span className="mr-2">✨</span>
                    {user?.plan === 'pro' ? 'Manage Plan' : 'Upgrade to Pro'}
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={handleLogout}>
                  <div className="flex items-center text-amber-600 dark:text-amber-500">
                    <svg
                      className="h-4 w-4 mr-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
                      />
                    </svg>
                    Logout
                  </div>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={handleDeleteAccount}
                  className="text-destructive focus:text-destructive"
                >
                  <svg
                    className="h-4 w-4 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                    />
                  </svg>
                  Delete Account
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      {/* Overlay pour mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </>
  )
}

export default Sidebar
