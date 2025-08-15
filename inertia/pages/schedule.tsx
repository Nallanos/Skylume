import { useState, useMemo, useCallback, memo, useRef, useEffect } from 'react'
import { Head, usePage, router } from '@inertiajs/react'
import Layout from '../components/Layout'
import StreakDisplay from '../components/StreakDisplay'
import HashtagGroupSelector from '../components/HashtagGroupSelector'
import ContentWarningModal from '../components/ContentWarningModal'
import CustomSelect, { type Option } from '../components/ui/CustomSelect'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Plus, Trash, Lock, Edit, User, Settings, FileText, X, Shield, Video, Twitter } from 'lucide-react'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import BlueskyAvatar from '../components/BlueskyAvatar'

interface Scheduling {
  id: number
  account_id: number
  message: string
  scheduleTime: string
  status: string
  images?: string[]
  altTexts?: string[]
  contentWarnings?: string[]
  // Platform-specific account references
  twitterAccountId?: number
  account?: {
    handle: string
    displayName: string
    avatar?: string
    did?: string
  }
}

interface User {
  id: number
  email: string
  plan?: string
  isScheduledLimitReached?: boolean
  postsPerDay?: number
  currentStreak?: number
  longestStreak?: number
  isStreakActive?: boolean
  streakStatus?: 'active' | 'at-risk' | 'broken'
  lastPostDate?: string | null
  account?: Account[]
}

// Unified account interface for all platforms
interface Account {
  id: string | number
  handle: string
  displayName: string
  platform: 'bluesky' | 'twitter'
  username?: string // For Twitter (different from handle)
  profileImageUrl?: string
  avatar?: string
}

interface ScheduleProps {
  schedulings: Scheduling[]
}

  // Memoized component for existing posts
const ScheduledPostItem = memo(({ 
  post, 
  onEdit, 
  onDelete 
}: { 
  post: Scheduling
  onEdit: (post: Scheduling) => void
  onDelete: (id: number) => void
}) => {
  const postTime = useMemo(() => 
    new Date(post.scheduleTime).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }), [post.scheduleTime]
  )

  const truncatedMessage = useMemo(() => 
    post.message.length > 60
      ? `${post.message.substring(0, 60)}...`
      : post.message
  , [post.message])

  const handleEdit = useCallback(() => onEdit(post), [onEdit, post])
  const handleDelete = useCallback(() => onDelete(post.id), [onDelete, post.id])

  return (
    <div className="flex items-center gap-4 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
      {/* Time */}
      <div className="text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[80px]">
        {postTime}
      </div>

      {/* Existing Post */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <BlueskyAvatar
          handle={post.account?.handle || ''}
          displayName={post.account?.displayName}
          size="sm"
        />

        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-900 dark:text-gray-100 truncate">
            {truncatedMessage}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            @{post.account?.handle || 'unknown'}
          </p>
        </div>
      </div>

      {/* Actions for existing post */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleEdit}
          className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <Edit className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
        >
          <Trash className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
})

  // Memoized component for empty time slots
const EmptyTimeSlot = memo(({ 
  timeSlot, 
  date, 
  isFreeLimitReached, 
  onSlotClick 
}: { 
  timeSlot: string
  date: string
  isFreeLimitReached: boolean
  onSlotClick: (date: string, timeSlot: string) => void
}) => {
  const handleClick = useCallback(() => {
    if (!isFreeLimitReached) {
      onSlotClick(date, timeSlot)
    }
  }, [onSlotClick, date, timeSlot, isFreeLimitReached])

  return (
    <div
      className="flex items-center gap-4 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 hover:border-blue-400 dark:hover:border-blue-500 cursor-pointer transition-colors"
      onClick={handleClick}
    >
      {/* Time */}
      <div className="text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[80px]">
        {timeSlot}
      </div>

      {/* Empty Slot - Entire row is clickable */}
      <div className="flex-1 flex items-center gap-2">
        <Plus className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
          {isFreeLimitReached ? 'Free limit reached' : 'New'}
        </span>
      </div>
    </div>
  )
})

function Schedule({ schedulings }: ScheduleProps) {
  const { props } = usePage()
  const user = props.user as User
  const accounts = user.account || []

  const [editingSchedule, setEditingSchedule] = useState<Scheduling | null>(null)
  const [localDateTime, setLocalDateTime] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)

    // Add modal state
  const [addMessage, setAddMessage] = useState('')
  const [addDateTime, setAddDateTime] = useState('')
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([])
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [tempPostsPerDay, setTempPostsPerDay] = useState<number>(user.postsPerDay || 3)
  const [currentSelectValue, setCurrentSelectValue] = useState<string>('') // ✅ NOUVEAU: Contrôler la valeur du select
  
  // Media state (images and videos)
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [imageAltTexts, setImageAltTexts] = useState<string[]>([])
  const [selectedVideos, setSelectedVideos] = useState<File[]>([])
  const [videoAltTexts, setVideoAltTexts] = useState<string[]>([])
  const [contentWarnings, setContentWarnings] = useState<string[]>([])
  const [showContentWarningModal, setShowContentWarningModal] = useState(false)
  const [videoValidationError, setVideoValidationError] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ✅ NOUVEAU: Détecter si Twitter est sélectionné pour désactiver les médias
  const isTwitterSelected = useMemo(() => {
    return selectedAccountIds.some(accountId => accountId.startsWith('twitter:'))
  }, [selectedAccountIds])

  // ✅ NOUVEAU: Détecter si SEUL Bluesky est sélectionné pour permettre les médias
  const isOnlyBlueskySelected = useMemo(() => {
    return selectedAccountIds.length > 0 && selectedAccountIds.every(accountId => accountId.startsWith('bluesky:'))
  }, [selectedAccountIds])

  // Convert accounts to CustomSelect options with proper platform handling
  const accountOptions = useMemo((): Option[] => {
    return accounts.map((account) => {
      // Create a unique identifier that includes platform info
      const accountKey = `${account.platform}:${account.id}`
      
      // Use appropriate handle/username based on platform
      const displayHandle = account.platform === 'twitter' 
        ? account.username || account.handle 
        : account.handle
      
      return {
        value: accountKey, // Platform-prefixed ID
        label: account.displayName,
        sublabel: `@${displayHandle} (${account.platform})`
      }
    })
  }, [accounts])

  const isFreeLimitReached = user.plan === 'free' && user.isScheduledLimitReached

  // Sort posts by date (closest first)
  const sortedSchedulings = useMemo(() => {
    return [...schedulings]
      .filter((schedule) => schedule.status === 'pending')
      .sort((a, b) => new Date(a.scheduleTime).getTime() - new Date(b.scheduleTime).getTime())
  }, [schedulings])

  // Group posts by day
  const groupedSchedulings = useMemo(() => {
    const groups: { [key: string]: Scheduling[] } = {}

    sortedSchedulings.forEach((schedule) => {
      const date = new Date(schedule.scheduleTime)
      const dateKey = date.toISOString().split('T')[0] // YYYY-MM-DD format

      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(schedule)
    })

    return groups
  }, [sortedSchedulings])

  // ✅ NOUVEAU: Nettoyer automatiquement les médias quand Twitter est sélectionné
  useEffect(() => {
    if (isTwitterSelected && (selectedImages.length > 0 || selectedVideos.length > 0)) {
      console.log('[SCHEDULE] Twitter selected, clearing media files')
      setSelectedImages([])
      setSelectedVideos([])
      setImageAltTexts([])
      setVideoAltTexts([])
      setVideoValidationError('')
    }
  }, [isTwitterSelected, selectedImages.length, selectedVideos.length])

  
  // Generate time slots based on posts per day - memoized
  const timeSlots = useMemo(() => {
    const generateTimeSlots = (postsCount: number) => {
      const baseSlots = ['9:28 AM', '12:30 PM', '3:15 PM', '5:26 PM', '7:45 PM', '9:20 PM', '11:00 AM', '2:10 PM', '6:35 PM', '8:50 PM']
      return baseSlots.slice(0, Math.min(postsCount, baseSlots.length))
    }
    return generateTimeSlots(user.postsPerDay || 3)
  }, [user.postsPerDay])
  
  const maxSlotsPerDay = user.postsPerDay || 3 // Use user preference or default to 3

  const upcomingDays = useMemo(() => {
    const days = []
    const today = new Date()

    for (let i = 0; i <= 7; i++) {
      // Today + Next 7 days (8 days total)
      const date = new Date(today)
      date.setDate(today.getDate() + i)

      const dateKey = date.toISOString().split('T')[0]
      const dayName =
        i === 0
          ? 'Today'
          : i === 1
          ? 'Tomorrow'
          : date.toLocaleDateString('en-US', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })

      days.push({
        date: dateKey,
        displayName: dayName,
        scheduledPosts: groupedSchedulings[dateKey] || [],
      })
    }

    return days
  }, [groupedSchedulings])

  // Optimiser les fonctions avec useCallback pour éviter les re-renders
  const deleteSchedule = useCallback(async (schedule_id: number) => {
    if (!confirm('Are you sure you want to delete this scheduled post?')) return
    await router.put('/schedule/delete', { scheduleId: schedule_id })
  }, [])

  const saveEdit = useCallback(async () => {
    if (!editingSchedule) return

    const localDate = new Date(localDateTime)

    const payload = {
      scheduleId: editingSchedule.id,
      message: editingSchedule.message,
      schedule_time: localDate.toISOString(),
    }

    await router.put('/schedule/edit', payload)
    setEditingSchedule(null)
  }, [editingSchedule, localDateTime])

  // Function to insert hashtags into the message
  const insertHashtags = useCallback((hashtags: string[]) => {
    const hashtagText = hashtags.map((tag) => `#${tag}`).join(' ')
    setAddMessage((prev) => {
      const trimmed = prev.trim()
      return trimmed ? `${trimmed} ${hashtagText}` : hashtagText
    })
  }, [])

  // Validation function for videos
  const validateVideoFile = useCallback(async (file: File): Promise<string | null> => {
    return new Promise((resolve) => {
      const video = document.createElement('video')
      video.preload = 'metadata'
      
      video.onloadedmetadata = () => {
        const duration = video.duration
        const { videoWidth, videoHeight } = video
        
        // Check duration (max 60 seconds)
        if (duration > 60) {
          resolve('Video duration must be 60 seconds or less')
          return
        }
        
        // Check resolution (max 1920x1080)
        if (videoWidth > 1920 || videoHeight > 1080) {
          resolve('Video resolution must be 1920x1080 or lower')
          return
        }
        
        resolve(null) // No error
      }
      
      video.onerror = () => {
        resolve('Invalid video file')
      }
      
      video.src = URL.createObjectURL(file)
    })
  }, [])

  const saveAdd = useCallback(async () => {
    if (!addMessage.trim() || (!addDateTime && !selectedTimeSlot) || selectedAccountIds.length === 0) return

    // Determine the final schedule time
    let finalDateTime: string
    if (selectedDate && selectedTimeSlot) {
      // Parse the time slot (e.g., "9:28 AM")
      const [time, period] = selectedTimeSlot.split(' ')
      const [hours, minutes] = time.split(':').map(Number)
      let adjustedHours = hours
      
      if (period === 'PM' && hours !== 12) {
        adjustedHours += 12
      } else if (period === 'AM' && hours === 12) {
        adjustedHours = 0
      }

      const scheduleDate = new Date(selectedDate)
      scheduleDate.setHours(adjustedHours, minutes, 0, 0)
      finalDateTime = scheduleDate.toISOString()
    } else {
      finalDateTime = new Date(addDateTime).toISOString()
    }

    // ✅ NOUVEAU: Envoyer tous les comptes sélectionnés en une seule requête
    const formData = new FormData()
    formData.append('message', addMessage)
    formData.append('schedule_time', finalDateTime)
    
    // ✅ Envoyer les IDs de comptes sélectionnés au format JSON
    formData.append('selected_accounts', JSON.stringify(selectedAccountIds))

    // Add images with proper array format
    selectedImages.forEach((image) => {
      formData.append('images[]', image)
    })

    // Add image alt texts as JSON string
    if (imageAltTexts.length > 0) {
      formData.append('image_alt_texts', JSON.stringify(imageAltTexts))
    }

    // Add videos with proper array format
    selectedVideos.forEach((video) => {
      formData.append('videos[]', video)
    })

    // Add video alt texts as JSON string
    if (videoAltTexts.length > 0) {
      formData.append('video_alt_texts', JSON.stringify(videoAltTexts))
    }

    // Add content warnings as JSON string
    if (contentWarnings.length > 0) {
      formData.append('content_warnings', JSON.stringify(contentWarnings))
    }

    // ✅ Une seule requête pour tous les comptes sélectionnés
    try {
      await router.post('/schedule/create', formData)
      console.log(`Successfully scheduled crosspost for ${selectedAccountIds.length} accounts`)
    } catch (error) {
      console.error('Failed to schedule crosspost:', error)
      // The error will be handled by the backend and shown via flash messages
    }

    // Reset form
    setAddMessage('')
    setSelectedAccountIds([])
    setAddDateTime('')
    setSelectedTimeSlot('')
    setSelectedDate('')
    setSelectedImages([])
    setSelectedVideos([])
    setImagePreviews([])
    setImageAltTexts([])
    setVideoAltTexts([])
    setContentWarnings([])
    setShowAddModal(false)
  }, [addMessage, selectedAccountIds, addDateTime, selectedDate, selectedTimeSlot, selectedImages, selectedVideos, imageAltTexts, videoAltTexts, contentWarnings, accounts])

  const startEdit = useCallback((schedule: Scheduling) => {
    setEditingSchedule({ ...schedule })
    const date = new Date(schedule.scheduleTime)
    const localISOString = date.toISOString().slice(0, 16)
    setLocalDateTime(localISOString)
  }, [])

  const savePostsPerDay = useCallback(async () => {
    try {
      await router.put('/schedule/editPostPerDay', { postsPerDay: tempPostsPerDay })
      setShowSettingsModal(false)
      // Backend redirect handles reload
    } catch (error) {
      console.error('Error saving posts per day:', error)
    }
  }, [tempPostsPerDay])

  const handleSlotClick = useCallback((date: string, timeSlot: string) => {
    setSelectedDate(date)
    setSelectedTimeSlot(timeSlot)
    setShowAddModal(true)
  }, [])

  // Optimized functions for media handling (images and videos)
  const handleMediaSelect = useCallback(async (files: FileList | null) => {
    if (!files) return

    const imageFiles: File[] = []
    const videoFiles: File[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (file.type.startsWith('image/')) {
        imageFiles.push(file)
      } else if (file.type.startsWith('video/')) {
        videoFiles.push(file)
      }
    }

    // Validate constraints
    if (selectedImages.length + imageFiles.length > 4) {
      alert('You can only upload up to 4 images total')
      return
    }

    if (selectedVideos.length + videoFiles.length > 1) {
      alert('You can only upload 1 video')
      return
    }

    if ((selectedImages.length > 0 || imageFiles.length > 0) && (selectedVideos.length > 0 || videoFiles.length > 0)) {
      alert('You cannot mix images and videos in the same post')
      return
    }

    // Validate video files
    for (const videoFile of videoFiles) {
      const error = await validateVideoFile(videoFile)
      if (error) {
        setVideoValidationError(error)
        return
      }
    }

    // Clear any previous validation errors
    setVideoValidationError('')

    // Process image files
    if (imageFiles.length > 0) {
      const newPreviews: string[] = []
      const newAltTexts: string[] = []

      imageFiles.forEach((file) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          newPreviews.push(e.target?.result as string)
          if (newPreviews.length === imageFiles.length) {
            setImagePreviews((prev) => [...prev, ...newPreviews])
          }
        }
        reader.readAsDataURL(file)
        newAltTexts.push('')
      })

      setSelectedImages((prev) => [...prev, ...imageFiles])
      setImageAltTexts((prev) => [...prev, ...newAltTexts])
    }

    // Process video files
    if (videoFiles.length > 0) {
      const newVideoAltTexts: string[] = videoFiles.map(() => '')
      setSelectedVideos((prev) => [...prev, ...videoFiles])
      setVideoAltTexts((prev) => [...prev, ...newVideoAltTexts])
    }
  }, [selectedImages.length, selectedVideos.length, validateVideoFile])

  const removeImage = useCallback((index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index))
    setImagePreviews((prev) => prev.filter((_, i) => i !== index))
    setImageAltTexts((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const removeVideo = useCallback((index: number) => {
    setSelectedVideos((prev) => prev.filter((_, i) => i !== index))
    setVideoAltTexts((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const clearImages = useCallback(() => {
    setSelectedImages([])
    setImagePreviews([])
    setImageAltTexts([])
  }, [])

  const clearVideos = useCallback(() => {
    setSelectedVideos([])
    setVideoAltTexts([])
  }, [])

  const clearAllMedia = useCallback(() => {
    clearImages()
    clearVideos()
  }, [clearImages, clearVideos])

  const updateAltText = useCallback((index: number, altText: string) => {
    setImageAltTexts((prev) => {
      const newAltTexts = [...prev]
      newAltTexts[index] = altText
      return newAltTexts
    })
  }, [])

  const updateVideoAltText = useCallback((index: number, altText: string) => {
    setVideoAltTexts((prev) => {
      const newAltTexts = [...prev]
      newAltTexts[index] = altText
      return newAltTexts
    })
  }, [])

  // Auto-clear l'erreur de validation après 5 secondes
  useEffect(() => {
    if (videoValidationError) {
      const timer = setTimeout(() => {
        setVideoValidationError('')
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [videoValidationError])

  // Handle paste event for images
  useEffect(() => {
    if (!showAddModal) return

    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      const imageFiles: File[] = []
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile()
          if (file) imageFiles.push(file)
        }
      }

      if (imageFiles.length > 0 && selectedImages.length < 4) {
        const fileList = new DataTransfer()
        imageFiles.forEach((file) => fileList.items.add(file))
        await handleMediaSelect(fileList.files)
      }
    }

    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [showAddModal, selectedImages.length, handleMediaSelect])

  // ✅ NOUVEAU: Reset select value when all accounts are cleared
  useEffect(() => {
    if (selectedAccountIds.length === 0) {
      setCurrentSelectValue('')
    }
  }, [selectedAccountIds])

  return (
    <>
      <Head title="Schedule Queue" />
      <Layout user={user}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Schedule Queue</h1>
              <div className="flex items-center gap-4 mt-1">
                <p className="text-muted-foreground">
                  {sortedSchedulings.length > 0
                    ? `${sortedSchedulings.length} post${sortedSchedulings.length > 1 ? 's' : ''} in queue`
                    : 'No posts scheduled'} 
                  {user.postsPerDay && (
                    <span className="text-xs ml-2 px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded">
                      {user.postsPerDay} posts/day max
                    </span>
                  )}
                </p>
                
                {/* Streak Display */}
                {user.currentStreak !== undefined && user.longestStreak !== undefined && user.streakStatus && (
                  <StreakDisplay
                    currentStreak={user.currentStreak}
                    longestStreak={user.longestStreak}
                    streakStatus={user.streakStatus}
                    className="ml-2"
                  />
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isFreeLimitReached && (
                <div className="flex items-center gap-2 text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-lg text-sm font-medium">
                  <Lock className="h-4 w-4" />
                  Free limit reached (5/5)
                </div>
              )}

              {/* Settings Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettingsModal(true)}
                className="h-8 px-3"
              >
                <Settings className="h-4 w-4" />
              </Button>

              <Button
                size="default"
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isFreeLimitReached}
                onClick={() => setShowAddModal(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Schedule Post
              </Button>
            </div>
          </div>

          {/* Queue */}
          <div className="space-y-6">
            {upcomingDays.map((day) => (
              <div key={day.date} className="space-y-3">
                {/* Day Header */}
                <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                  <h2 className="text-lg font-semibold text-foreground">{day.displayName}</h2>
                </div>

                {/* Time slots for this day */}
                <div className="space-y-2">
                  {/* Afficher tous les posts existants pour ce jour */}
                  {day.scheduledPosts.map((post) => (
                    <ScheduledPostItem
                      key={`post-${post.id}`}
                      post={post}
                      onEdit={startEdit}
                      onDelete={deleteSchedule}
                    />
                  ))}

                  {/* Afficher les créneaux prédéfinis disponibles si on n'a pas atteint la limite */}
                  {useMemo(() => {
                    const usedSlots = day.scheduledPosts.map((post) => {
                      return new Date(post.scheduleTime).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                      })
                    })

                    const availableSlots = timeSlots.filter((slot) => !usedSlots.includes(slot))
                    const remainingSlots = Math.max(0, maxSlotsPerDay - day.scheduledPosts.length)
                    const slotsToShow = availableSlots.slice(0, remainingSlots)

                    return slotsToShow.map((timeSlot) => (
                      <EmptyTimeSlot
                        key={`empty-${timeSlot}`}
                        timeSlot={timeSlot}
                        date={day.date}
                        isFreeLimitReached={isFreeLimitReached || false}
                        onSlotClick={handleSlotClick}
                      />
                    ))
                  }, [day.scheduledPosts, day.date, timeSlots, maxSlotsPerDay, isFreeLimitReached, handleSlotClick])}
                </div>
              </div>
            ))}

            {/* Global Add Button */}
            <Card
              className="border-dashed border-2 border-blue-300 dark:border-blue-600 hover:border-blue-500 dark:hover:border-blue-400 transition-colors cursor-pointer group"
              onClick={() => !isFreeLimitReached && setShowAddModal(true)}
            >
              <CardContent className="flex items-center justify-center py-6">
                <div className="flex items-center gap-3 text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300">
                  <div className="w-8 h-8 rounded-full border-2 border-current flex items-center justify-center">
                    <Plus className="h-4 w-4" />
                  </div>
                  <span className="font-medium">Add Custom Time Slot</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Edit Modal */}
          {editingSchedule && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <Card className="w-full max-w-lg mx-4">
                <CardHeader>
                  <CardTitle>Edit Scheduled Post</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="message" className="text-sm font-medium">
                      Message
                    </Label>
                    <textarea
                      id="message"
                      className="w-full p-3 border rounded-lg resize-none h-32 mt-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={editingSchedule.message}
                      onChange={(e) =>
                        setEditingSchedule({
                          ...editingSchedule,
                          message: e.target.value,
                        })
                      }
                      placeholder="What's on your mind?"
                    />
                  </div>

                  <div>
                    <Label htmlFor="datetime" className="text-sm font-medium">
                      Schedule Time
                    </Label>
                    <Input
                      id="datetime"
                      type="datetime-local"
                      value={localDateTime}
                      onChange={(e) => setLocalDateTime(e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button onClick={saveEdit} className="flex-1 bg-blue-500">
                      Save Changes
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setEditingSchedule(null)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Add Schedule Modal - Using original beautiful design */}
          {showAddModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <Card className="w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
                <CardHeader>
                  <CardTitle>Schedule New Post</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">
                      Accounts ({selectedAccountIds.length} selected)
                    </Label>
                    <div className="mt-2 space-y-2">
                      {/* Show selected accounts */}
                      {selectedAccountIds.length > 0 && (
                        <div className="flex flex-wrap gap-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded-md border border-blue-200 dark:border-blue-800">
                          {selectedAccountIds.map((accountId) => {
                            // ✅ NOUVEAU: Parser l'ID avec format platform:id
                            const [platform, id] = accountId.split(':')
                            const account = accounts.find(acc => 
                              acc.platform === platform && acc.id.toString() === id
                            )
                            if (!account) return null
                            
                            // Utiliser le bon handle selon la plateforme
                            const displayHandle = account.platform === 'twitter' 
                              ? account.username || account.handle 
                              : account.handle
                            
                            return (
                              <div
                                key={accountId}
                                className="flex items-center gap-2 bg-white dark:bg-gray-800 px-3 py-2 rounded-full border border-blue-300 dark:border-blue-600 text-sm"
                              >
                                {/* ✅ NOUVEAU: Icône de plateforme */}
                                {account.platform === 'twitter' ? (
                                  <Twitter className="h-4 w-4 text-blue-400" />
                                ) : (
                                  <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                                    <span className="text-white text-xs font-bold">B</span>
                                  </div>
                                )}
                                
                                <div className="flex flex-col">
                                  <span className="font-medium text-gray-900 dark:text-gray-100">
                                    {account.displayName}
                                  </span>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    @{displayHandle}
                                  </span>
                                </div>
                                
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedAccountIds(prev => prev.filter(id => id !== accountId))
                                  }}
                                  className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 ml-2"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      )}
                      
                      {/* Account selector */}
                      <CustomSelect
                        value={currentSelectValue}
                        onChange={(accountId) => {
                          if (accountId && !selectedAccountIds.includes(accountId)) {
                            setSelectedAccountIds(prev => [...prev, accountId])
                            setCurrentSelectValue('') // ✅ NOUVEAU: Remettre à vide après sélection
                          }
                        }}
                        options={accountOptions.filter(option => !selectedAccountIds.includes(option.value))}
                        placeholder={selectedAccountIds.length === 0 ? "Choose accounts" : "Add another account"}
                        className="w-full"
                      />
                      
                      {/* Quick actions */}
                      {accounts.length > 1 && (
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedAccountIds(accounts.map(acc => acc.id.toString()))}
                            className="text-xs h-6 px-2"
                            disabled={selectedAccountIds.length === accounts.length}
                          >
                            Select All
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedAccountIds([])}
                            className="text-xs h-6 px-2"
                            disabled={selectedAccountIds.length === 0}
                          >
                            Clear All
                          </Button>
                        </div>
                      )}
                    </div>
                    {selectedAccountIds.length === 0 && (
                      <p className="text-xs text-red-500 mt-1">Please select at least one account</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="addMessage" className="text-sm font-medium">
                      Message
                    </Label>
                    <textarea
                      id="addMessage"
                      className="w-full p-3 border border-gray-800 rounded-lg resize-none h-32 mt-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black dark:bg-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                      value={addMessage}
                      onChange={(e) => setAddMessage(e.target.value)}
                      placeholder="What's on your mind?"
                    />
                    
                    {/* Hashtag Selector */}
                    <div className="mt-2">
                      <HashtagGroupSelector 
                        onInsert={insertHashtags}
                        className="w-full sm:w-auto"
                      />
                    </div>
                  </div>

                  {/* Media Section */}
                  <div>
                    <Label className="text-sm font-medium">Media</Label>
                    <div className="mt-1 space-y-3">
                      {/* ✅ NOUVEAU: Avertissement si Twitter est sélectionné */}
                      {isTwitterSelected && (
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-600 text-amber-800 dark:text-amber-300 px-4 py-3 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Twitter className="h-4 w-4" />
                            <div>
                              <p className="font-medium text-sm">Media upload disabled for Twitter</p>
                              <p className="text-xs mt-1">
                                Due to Twitter API limitations, media uploads are not supported. 
                                Select only Bluesky accounts to enable media uploads.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Media Upload Button */}
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={
                            isTwitterSelected || 
                            selectedImages.length >= 4 || 
                            selectedVideos.length >= 1 ||
                            selectedAccountIds.length === 0
                          }
                          className={`flex items-center gap-2 ${
                            isTwitterSelected ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          <FileText className="h-4 w-4" />
                          {isTwitterSelected 
                            ? 'Media Disabled (Twitter selected)' 
                            : `Add Media (${selectedImages.length + selectedVideos.length}/${selectedImages.length > 0 ? '4' : '1'})`
                          }
                        </Button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          accept="image/*,video/*"
                          className="hidden"
                          onChange={(e) => handleMediaSelect(e.target.files)}
                          disabled={isTwitterSelected}
                        />
                        {(selectedImages.length > 0 || selectedVideos.length > 0) && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={clearAllMedia}
                            className="text-red-500 hover:text-red-700"
                          >
                            Clear All
                          </Button>
                        )}
                      </div>

                      {/* Media Instructions */}
                      <p className="text-xs text-muted-foreground">
                        {isTwitterSelected 
                          ? '⚠️ Media uploads are disabled when Twitter accounts are selected'
                          : '💡 Upload up to 4 images OR 1 video (max 10MB for images, 50MB for videos)'
                        }
                      </p>

                      {/* Video Validation Error */}
                      {videoValidationError && (
                        <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 px-4 py-3 rounded relative">
                          <div className="flex items-center gap-2">
                            <strong className="font-bold">Video Error:</strong>
                            <span className="block sm:inline">{videoValidationError}</span>
                          </div>
                        </div>
                      )}

                      {/* Image Previews */}
                      {imagePreviews.length > 0 && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                            {imagePreviews.map((preview, index) => (
                              <div key={index} className="space-y-2">
                                <div className="relative group">
                                  <img
                                    src={preview}
                                    alt={imageAltTexts[index] || `Preview ${index + 1}`}
                                    className="w-full h-20 object-cover rounded border"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => removeImage(index)}
                                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                                <div className="space-y-1">
                                  <Label 
                                    htmlFor={`alt-text-modal-${index}`}
                                    className="text-xs font-medium text-gray-600 dark:text-gray-400"
                                  >
                                    Alt text
                                  </Label>
                                  <Input
                                    id={`alt-text-modal-${index}`}
                                    type="text"
                                    placeholder="Describe this image..."
                                    value={imageAltTexts[index] || ''}
                                    onChange={(e) => updateAltText(index, e.target.value)}
                                    className="text-xs"
                                    maxLength={1000}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Video Previews */}
                      {selectedVideos.length > 0 && (
                        <div className="space-y-3">
                          <div className="space-y-3">
                            {selectedVideos.map((video, index) => (
                              <div key={index} className="space-y-2">
                                <div className="relative group p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800">
                                  <div className="flex items-center gap-3">
                                    <Video className="h-8 w-8 text-blue-500" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                        {video.name}
                                      </p>
                                      <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {(video.size / (1024 * 1024)).toFixed(1)} MB • Video
                                      </p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => removeVideo(index)}
                                      className="p-1 text-red-500 hover:text-red-700 transition-colors"
                                    >
                                      <X className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <Label 
                                    htmlFor={`video-alt-text-modal-${index}`}
                                    className="text-xs font-medium text-gray-600 dark:text-gray-400"
                                  >
                                    Alt text
                                  </Label>
                                  <Input
                                    id={`video-alt-text-modal-${index}`}
                                    type="text"
                                    placeholder="Describe this video..."
                                    value={videoAltTexts[index] || ''}
                                    onChange={(e) => updateVideoAltText(index, e.target.value)}
                                    className="text-xs"
                                    maxLength={1000}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Content Warnings */}
                      {(selectedImages.length > 0 || selectedVideos.length > 0) && (
                        <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium flex items-center gap-2">
                              <Shield className="h-4 w-4" />
                              Content Warnings
                            </Label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setShowContentWarningModal(true)}
                              className="text-xs"
                            >
                              Add Warning
                            </Button>
                          </div>
                          
                          {contentWarnings.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {contentWarnings.map((warning) => (
                                <span 
                                  key={warning} 
                                  className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 text-xs rounded-full"
                                >
                                  {warning.replace('-', ' ')}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="addDatetime" className="text-sm font-medium">
                      Schedule Time
                    </Label>
                    {selectedDate && selectedTimeSlot ? (
                      <div className="mt-1 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                          Scheduled for:{' '}
                          {new Date(selectedDate).toLocaleDateString('en-US', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                          })}{' '}
                          at {selectedTimeSlot}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedDate('')
                            setSelectedTimeSlot('')
                          }}
                          className="mt-2 h-6 px-2 text-xs text-blue-700 dark:text-blue-300"
                        >
                          Change time
                        </Button>
                      </div>
                    ) : (
                      <Input
                        id="addDatetime"
                        type="datetime-local"
                        value={addDateTime}
                        onChange={(e) => setAddDateTime(e.target.value)}
                        className="mt-1"
                      />
                    )}
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button
                      onClick={saveAdd}
                      className="flex-1 bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300 disabled:text-white transition-colors"
                      disabled={
                        !addMessage.trim() || (!addDateTime && !selectedTimeSlot) || selectedAccountIds.length === 0
                      }
                    >
                      Schedule Post
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowAddModal(false)
                        setAddMessage('')
                        setSelectedAccountIds([])
                        setAddDateTime('')
                        setSelectedTimeSlot('')
                        setSelectedDate('')
                        setSelectedImages([])
                        setSelectedVideos([])
                        setImagePreviews([])
                        setImageAltTexts([])
                        setVideoAltTexts([])
                        setContentWarnings([])
                        setVideoValidationError('')
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Settings Modal */}
          {showSettingsModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <Card className="w-full max-w-lg mx-4">
                <CardHeader>
                  <CardTitle>Schedule Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="postsPerDay" className="text-sm font-medium">
                      Posts per day
                    </Label>
                    <div className="mt-1">
                      <Input
                        id="postsPerDay"
                        type="number"
                        min="1"
                        max="10"
                        value={tempPostsPerDay}
                        onChange={(e) => setTempPostsPerDay(parseInt(e.target.value) || 1)}
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Choose how many posts you want to schedule per day (1-10)
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button onClick={savePostsPerDay} className="flex-1 bg-blue-500">
                      Save Settings
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowSettingsModal(false)
                        setTempPostsPerDay(user.postsPerDay || 3)
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Content Warning Modal */}
          <ContentWarningModal
            isOpen={showContentWarningModal}
            onClose={() => setShowContentWarningModal(false)}
            onSave={setContentWarnings}
            initialWarnings={contentWarnings}
          />
        </div>
      </Layout>
    </>
  )
}

export default memo(Schedule)
