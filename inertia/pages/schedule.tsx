import { useState, useMemo, useRef, useEffect, useCallback, memo } from 'react'
import { Head, usePage, router } from '@inertiajs/react'
import Layout from '../components/Layout'
import ContentWarningModal from '../components/ContentWarningModal'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Plus, Trash, Lock, Edit, User, Settings, Image, X, Shield } from 'lucide-react'
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
  account?: Account[]
}

interface Account {
  id: string
  handle: string
  displayName: string
}

interface ScheduleProps {
  schedulings: Scheduling[]
}

// Composant mémorisé pour les posts existants
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

// Composant mémorisé pour les créneaux vides
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
  const [addAccountId, setAddAccountId] = useState<string>('')
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [tempPostsPerDay, setTempPostsPerDay] = useState<number>(user.postsPerDay || 3)
  
  // Images state
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [imageAltTexts, setImageAltTexts] = useState<string[]>([])
  const [contentWarnings, setContentWarnings] = useState<string[]>([])
  const [showContentWarningModal, setShowContentWarningModal] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)


  const isFreeLimitReached = user.plan === 'free' && user.isScheduledLimitReached

  // Tri des posts par date (plus proche en premier)
  const sortedSchedulings = useMemo(() => {
    return [...schedulings]
      .filter((schedule) => schedule.status === 'pending')
      .sort((a, b) => new Date(a.scheduleTime).getTime() - new Date(b.scheduleTime).getTime())
  }, [schedulings])

  // Grouper les posts par jour
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

  
  // Générer les créneaux horaires en fonction du nombre de posts par jour - mémorisé
  const timeSlots = useMemo(() => {
    const generateTimeSlots = (postsCount: number) => {
      const baseSlots = ['9:28 AM', '12:30 PM', '3:15 PM', '5:26 PM', '7:45 PM', '9:20 PM', '11:00 AM', '2:10 PM', '6:35 PM', '8:50 PM']
      return baseSlots.slice(0, Math.min(postsCount, baseSlots.length))
    }
    return generateTimeSlots(user.postsPerDay || 3)
  }, [user.postsPerDay])
  
  const maxSlotsPerDay = user.postsPerDay || 3 // Utiliser la préférence de l'utilisateur ou 3 par défaut

  const upcomingDays = useMemo(() => {
    const days = []
    const today = new Date()

    for (let i = 1; i <= 7; i++) {
      // 7 jours à venir
        const date = new Date(today)
        date.setDate(today.getDate() + i)

        const dateKey = date.toISOString().split('T')[0]
        const dayName =
          i === 1
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

  const saveAdd = useCallback(async () => {
    try {
      if (!addMessage.trim() || !addAccountId) return
      let finalDateTime = addDateTime

      // Si un créneau prédéfini est sélectionné, l'utiliser
      if (selectedDate && selectedTimeSlot && !addDateTime) {
        const date = new Date(selectedDate)
        const [time, period] = selectedTimeSlot.split(' ')
        const [hours, minutes] = time.split(':')
        let hour24 = parseInt(hours)

        if (period === 'PM' && hour24 !== 12) {
          hour24 += 12
        } else if (period === 'AM' && hour24 === 12) {
          hour24 = 0
        }

        date.setHours(hour24, parseInt(minutes), 0, 0)
        finalDateTime = date.toISOString().slice(0, 16)
      }

      if (!finalDateTime) return

      console.log('Final date time:', finalDateTime)

      // Créer la date directement en UTC pour éviter les problèmes de fuseau horaire
      const localDate = new Date(finalDateTime)
      
      // Trouver le handle du compte sélectionné
      const selectedAccount = accounts.find((acc) => acc.id === addAccountId)
      console.log('Selected account:', accounts, addAccountId)
      if (!selectedAccount) return

      // Créer FormData pour inclure les images
      const formData = new FormData()
      formData.append('account_handle', selectedAccount.handle)
      formData.append('message', addMessage)
      formData.append('schedule_time', localDate.toISOString())
      formData.append('alt_texts', JSON.stringify(imageAltTexts))
      formData.append('content_warnings', JSON.stringify(contentWarnings))
      
      // Ajouter les images
      selectedImages.forEach((image) => {
        formData.append('images', image)
      })

      console.log('Scheduling payload with images:', { 
        account_handle: selectedAccount.handle,
        message: addMessage,
        schedule_time: localDate.toISOString(),
        images_count: selectedImages.length,
        alt_texts: imageAltTexts,
        content_warnings: contentWarnings
      })

      // Debug FormData contents
      console.log('FormData contents:')
      for (let [key, value] of formData.entries()) {
        console.log(key, ':', value)
      }

      // Utiliser router.post avec FormData
      router.post('/schedule/create', formData, {
        forceFormData: true
      })
      
      setShowAddModal(false)
      setAddMessage('')
      setAddDateTime('')
      setAddAccountId('')
      setSelectedDate('')
      setSelectedTimeSlot('')
      setContentWarnings([])
      clearImages()
    } catch (error) {
      console.error('Error saving schedule:', error)
      return
    }
  }, [addMessage, addAccountId, addDateTime, selectedDate, selectedTimeSlot, accounts, selectedImages, imageAltTexts, contentWarnings])

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
      // La redirection backend se charge du rechargement
    } catch (error) {
      console.error('Error saving posts per day:', error)
    }
  }, [tempPostsPerDay])

  const handleSlotClick = useCallback((date: string, timeSlot: string) => {
    setSelectedDate(date)
    setSelectedTimeSlot(timeSlot)
    setShowAddModal(true)
  }, [])

  // Functions for image handling optimisées
  const handleImageSelect = useCallback((files: FileList | null) => {
    if (!files) return
    
    const newImages = Array.from(files).filter(file => 
      file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024 // 10MB limit
    ).slice(0, 4 - selectedImages.length) // Limit to 4 total images
    
    if (newImages.length === 0) return
    
    setSelectedImages(prev => [...prev, ...newImages])
    setImageAltTexts(prev => [...prev, ...new Array(newImages.length).fill('')])
    
    // Create previews
    newImages.forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        if (e.target?.result) {
          setImagePreviews(prev => [...prev, e.target!.result as string])
        }
      }
      reader.readAsDataURL(file)
    })
  }, [selectedImages.length])

  const removeImage = useCallback((index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index))
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
    setImageAltTexts(prev => prev.filter((_, i) => i !== index))
  }, [])

  const clearImages = useCallback(() => {
    setSelectedImages([])
    setImagePreviews([])
    setImageAltTexts([])
    setContentWarnings([])
  }, [])

  const updateAltText = useCallback((index: number, altText: string) => {
    setImageAltTexts(prev => {
      const newAltTexts = [...prev]
      newAltTexts[index] = altText
      return newAltTexts
    })
  }, [])

  // Handle paste event for images
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!showAddModal) return
      
      const items = e.clipboardData?.items
      if (!items) return
      
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.type.startsWith('image/')) {
          e.preventDefault()
          const file = item.getAsFile()
          if (file && selectedImages.length < 4) {
            const dt = new DataTransfer()
            dt.items.add(file)
            handleImageSelect(dt.files)
          }
        }
      }
    }

    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [showAddModal, selectedImages.length])

  return (
    <>
      <Head title="Schedule Queue" />
      <Layout user={user}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Schedule Queue</h1>
              <p className="text-muted-foreground mt-1">
                {sortedSchedulings.length > 0
                  ? `${sortedSchedulings.length} post${sortedSchedulings.length > 1 ? 's' : ''} in queue`
                  : 'No posts scheduled'} 
                {user.postsPerDay && (
                  <span className="text-xs ml-2 px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded">
                    {user.postsPerDay} posts/day max
                  </span>
                )}
              </p>
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

          {/* Add Schedule Modal */}
          {showAddModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <Card className="w-full max-w-lg mx-4">
                <CardHeader>
                  <CardTitle>Schedule New Post</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="addAccount" className="text-sm font-medium">
                      Account
                    </Label>
                    <select
                      id="addAccount"
                      className="w-full p-2 border-gray-800 rounded-md bg-background"
                      value={addAccountId}
                      onChange={(e) => setAddAccountId(e.target.value)}
                    >
                      <option value="" disabled>
                        Choose an account
                      </option>
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id.toString()}>
                          {account.displayName} (@{account.handle})
                        </option>
                      ))}
                    </select>
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
                  </div>

                  {/* Images Section */}
                  <div>
                    <Label className="text-sm font-medium">Images</Label>
                    <div className="mt-1 space-y-3">
                      {/* Upload Button */}
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={selectedImages.length >= 4}
                          className="flex items-center gap-2"
                        >
                          <Image className="h-4 w-4" />
                          Add Images ({selectedImages.length}/4)
                        </Button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleImageSelect(e.target.files)}
                        />
                        {selectedImages.length > 0 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={clearImages}
                            className="text-red-500 hover:text-red-700"
                          >
                            Clear All
                          </Button>
                        )}
                      </div>

                      {/* Paste Hint */}
                      <p className="text-xs text-muted-foreground">
                        💡 You can also paste images with Ctrl+V
                      </p>

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

                      {/* Content Warnings for images */}
                      {selectedImages.length > 0 && (
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
                          {new Date(selectedDate).toLocaleDateString('fr-FR', {
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
                        !addMessage.trim() || (!addDateTime && !selectedTimeSlot) || !addAccountId
                      }
                    >
                      Schedule Post
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowAddModal(false)
                        setAddMessage('')
                        setAddDateTime('')
                        setAddAccountId('')
                        setSelectedDate('')
                        setSelectedTimeSlot('')
                        clearImages()
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
