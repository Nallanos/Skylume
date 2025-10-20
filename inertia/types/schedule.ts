export interface Scheduling {
  id: number
  account_id: number
  message: string
  scheduleTime: string
  status: string
  images?: string[]
  altTexts?: string[]
  contentWarnings?: string[]
  twitterAccountId?: number
  account?: {
    handle: string
    displayName: string
    avatar?: string
    did?: string
  }
}

export interface User {
  id: number
  email: string
  plan?: string
  isScheduledLimitReached?: boolean
  currentStreak?: number
  longestStreak?: number
  isStreakActive?: boolean
  streakStatus?: 'active' | 'at-risk' | 'broken'
  lastPostDate?: string | null
  account?: Account[]
}

export interface Account {
  id: string | number
  handle: string
  displayName: string
  platform: 'bluesky' | 'twitter'
  username?: string
  profileImageUrl?: string
  avatar?: string
}

export interface ScheduleProps {
  schedulings: Scheduling[]
}

export interface ScheduleFormData {
  message: string
  scheduleTime: string
  selectedAccountIds: string[]
  images: File[]
  videos: File[]
  imageAltTexts: string[]
  videoAltTexts: string[]
  contentWarnings: string[]
  explicitLinks: Array<{ text: string; url: string }>
}

export interface TimeSlotConfig {
  [timeSlot: string]: {
    [day: string]: boolean
  }
}

export interface UpcomingDay {
  date: string
  displayName: string
  scheduledPosts: Scheduling[]
}

export interface WeeklyStats {
  total: number
  visible: number
  remaining: Scheduling[]
}

export interface OversizedImage {
  file: File
  index: number
}
