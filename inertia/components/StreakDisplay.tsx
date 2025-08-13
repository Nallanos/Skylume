import React from 'react'
import { Badge } from './ui/badge'
import { Flame, AlertTriangle, Heart } from 'lucide-react'
import { toast } from 'sonner'

interface StreakDisplayProps {
  currentStreak: number
  longestStreak: number
  streakStatus: 'active' | 'at-risk' | 'broken'
  className?: string
}

const StreakDisplay: React.FC<StreakDisplayProps> = ({
  currentStreak,
  longestStreak,
  streakStatus,
  className = ''
}) => {
  // Messages spécifiques pour chaque jour de streak (30 messages en anglais)
const streakMessages = [
    "🎯 Day 1 — Nice, you started… let’s see how long before you ghost this streak like your gym membership.",
    "🚀 Day 2 — Two days?? Careful, you’re developing something dangerous: discipline.",
    "⭐ Day 3 — 3 days in a row… your ex would be impressed. Too bad they’ll never know.",
    "🔥 Day 4 — Congrats, you’ve outlasted 90% of New Year’s resolutions. The bar is low.",
    "💪 Day 5 — 5 days! That’s more commitment than you’ve ever given to a Netflix series.",
    "🎉 Day 6 — Day six. People have abandoned marriages faster than this.",
    "🏆 Day 7 — One week! Somewhere, a therapist is confused about your sudden consistency.",
    "⚡ Day 8 — You’re now at the level where strangers on Reddit might start noticing you. Maybe.",
    "🌟 Day 9 — 9 days in… statistically, you’ve already annoyed at least 3 people with your productivity.",
    "🎯 Day 10 — DOUBLE DIGITS! Don’t let it go to your head, you still haven’t done your laundry.",
    "🚀 Day 11 — If your streak was a Tamagotchi, it would still probably be dead.",
    "💫 Day 12 — You’ve gone longer than most diets. Impressive… and tragic.",
    "🔥 Day 13 — Day thirteen. The streak whispers: *one of us, one of us…*",
    "🏅 Day 14 — Two weeks. You’re now the kind of person who says ‘I don’t have TikTok’ unironically.",
    "⭐ Day 15 — Your keyboard asked me to tell you to chill. It’s tired.",
    "🎊 Day 16 — Achievement unlocked: ‘Social Life? Never Heard of It.’",
    "💪 Day 17 — Even your procrastination is starting to feel neglected.",
    "🌟 Day 18 — You’re dangerously close to becoming… *a LinkedIn person*.",
    "🎯 Day 19 — NASA confirmed your streak. Also, they’re investigating you for suspicious activity.",
    "🚀 Day 20 — A lunar month. The moon is proud. The sun is still disappointed.",
    "⚡ Day 21 — You’re one week away from being ‘that guy’ who talks about streaks at parties.",
    "🔥 Day 22 — If you stop now, 14 feral raccoons will appear at your door. And one of them owes you money.",
    "🏆 Day 23 — At this point, you either finish the month or change your name and move to another country.",
    "💫 Day 24 — This isn’t a streak anymore. This is a cry for help.",
    "🎉 Day 25 — People have formed cults for less.",
    "⭐ Day 26 — Your streak could now legally run for president in some countries.",
    "🌟 Day 27 — This is the prequel to your Netflix documentary.",
    "🎯 Day 28 — Boss fight unlocked. The streak attacks first and it’s immune to therapy.",
    "🏅 Day 29 — Miss tomorrow and all of this becomes a side quest you abandoned.",
    "🎊 DAY 30 — You did it. You’re a legend… in the same way Florida Man is a legend. 🎬🔥"]
  const handleStreakClick = () => {
    const messageIndex = Math.min(currentStreak - 1, streakMessages.length - 1)
    const message = currentStreak === 0 
      ? "🌱 Start your streak now! Schedule your first post to begin the adventure!"
      : currentStreak > 30
        ? `🚀 INCREDIBLE! ${currentStreak} days! You've surpassed all our messages! You're an absolute legend! 🏆🔥⭐`
        : streakMessages[messageIndex]
    
    toast.success(message, {
      duration: 4000,
      position: 'top-center'
    })
  }

  // Always show streak, even if it's 0 to encourage users to start

  const getStreakIcon = () => {
    switch (streakStatus) {
      case 'active':
        return <Flame className="h-4 w-4 text-orange-500" />
      case 'at-risk':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'broken':
        return <Heart className="h-4 w-4 text-gray-400" />
      default:
        return <Flame className="h-4 w-4 text-gray-400" />
    }
  }

  const getStreakText = () => {
    if (currentStreak === 0) {
      return '0 day streak'
    }
    return `${currentStreak} day${currentStreak !== 1 ? 's' : ''}`
  }

  const getStreakColor = () => {
    switch (streakStatus) {
      case 'active':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300'
      case 'at-risk':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
      case 'broken':
        return 'bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400'
      default:
        return 'bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400'
    }
  }

  const getTooltipMessage = () => {
    const longestText = longestStreak > 0 ? `Longest streak: ${longestStreak} days. ` : ''
    
    switch (streakStatus) {
      case 'active':
        return `🔥 Streak is active! ${longestText}Keep posting daily to maintain your streak!`
      case 'at-risk':
        return `⚠️ Post today to keep your streak alive! ${longestText}`
      case 'broken':
        if (currentStreak === 0 && longestStreak === 0) {
          return `🚀 Start your first posting streak! Schedule a post to begin your journey.`
        }
        return `💔 Streak broken. ${longestText}Schedule a post to start a new streak!`
      default:
        return longestText || 'Start your posting streak!'
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Badge 
        variant="secondary" 
        className={`flex items-center gap-2 px-3 py-1 cursor-pointer hover:opacity-80 transition-opacity ${getStreakColor()} ${className}`}
        title={getTooltipMessage()}
        onClick={handleStreakClick}
      >
        {getStreakIcon()}
        <span className="text-sm font-medium">
          {getStreakText()}
        </span>
      </Badge>
      <span className="text-xs text-muted-foreground ml-1 select-none cursor-pointer" onClick={handleStreakClick}>
        Click here
      </span>
    </div>
  )
}

export default StreakDisplay
