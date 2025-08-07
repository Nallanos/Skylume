import { User } from 'lucide-react'
import { useBlueskyAvatar } from '../hooks/useBlueskyAvatar'

interface BlueskyAvatarProps {
  handle: string
  displayName?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
  isNext?: boolean
}

export default function BlueskyAvatar({ 
  handle, 
  displayName, 
  className = '', 
  size = 'md',
  isNext = false 
}: BlueskyAvatarProps) {
  const { avatar, loading, error } = useBlueskyAvatar(handle)

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  }

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  }

  return (
    <div className={`${sizeClasses[size]} rounded-full flex items-center justify-center text-white overflow-hidden border-2 ${
      isNext ? 'border-blue-500' : 'border-gray-300'
    } ${className}`}>
      {loading ? (
        // Loading state
        <div className={`w-full h-full flex items-center justify-center ${
          isNext ? 'bg-gradient-to-r from-blue-500 to-purple-500' : 'bg-gray-400'
        } animate-pulse`}>
          <User className={`${iconSizes[size]} opacity-60`} />
        </div>
      ) : avatar && !error ? (
        // Avatar loaded successfully
        <img
          src={avatar}
          alt={`${displayName || handle} avatar`}
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fallback to icon if image fails to load
            const target = e.target as HTMLImageElement
            target.style.display = 'none'
            const fallback = target.nextElementSibling as HTMLElement
            if (fallback) {
              fallback.classList.remove('hidden')
            }
          }}
        />
      ) : null}
      
      {/* Fallback icon */}
      <div className={`w-full h-full flex items-center justify-center ${
        avatar && !error && !loading ? 'hidden' : ''
      } ${
        isNext ? 'bg-gradient-to-r from-blue-500 to-purple-500' : 'bg-gray-500'
      }`}>
        <User className={iconSizes[size]} />
      </div>
    </div>
  )
}
