import { useState, useEffect } from 'react'
import { Moon, Sun } from 'lucide-react'
import { Button } from './ui/button'

function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('dark')

  useEffect(() => {
    setMounted(true)
    const storedTheme = localStorage.getItem('theme') || 'dark'
    setCurrentTheme(storedTheme as 'light' | 'dark')
    document.documentElement.className = storedTheme
  }, [])

  function toggleTheme() {
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark'
    setCurrentTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    document.documentElement.className = newTheme
  }

  if (!mounted) {
    return null
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="w-16 h-6 px-1 rounded-full border-border/50 hover:border-border transition-all duration-200"
      onClick={toggleTheme}
      aria-label={`Switch to ${currentTheme === 'dark' ? 'light' : 'dark'} theme`}
    >
      <div className="flex items-center justify-between w-full">
        <Sun
          className={`h-3 w-3 transition-all duration-300 ${
            currentTheme === 'dark' ? 'scale-75 opacity-40' : 'scale-100 opacity-100 text-amber-500'
          }`}
        />
        <Moon
          className={`h-3 w-3 transition-all duration-300 ${
            currentTheme === 'dark' ? 'scale-100 opacity-100 text-blue-400' : 'scale-75 opacity-40'
          }`}
        />
      </div>
    </Button>
  )
}

export default ThemeToggle
