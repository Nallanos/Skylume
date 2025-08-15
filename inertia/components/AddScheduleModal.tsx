import { useState, useEffect } from 'react'
import { router } from '@inertiajs/react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Checkbox } from './ui/checkbox'
import CustomSelect, { type Option } from './ui/CustomSelect'
import { Badge } from './ui/badge'
import { Alert, AlertDescription } from './ui/alert'
import {
  Calendar,
  Clock,
  Send,
  X,
  User,
  MessageCircle,
  Hash,
  AtSign,
  Link as LinkIcon,
  AlertCircle,
  CheckCircle,
  Image as ImageIcon,
  Upload,
  Video,
} from 'lucide-react'

interface Account {
  id: string
  handle: string
  displayName: string
  platform?: 'bluesky' | 'twitter' // Optional platform
  username?: string
  profileImageUrl?: string
}

console.log("test ")
interface User {
  id: number
  email: string
  plan?: string
  isScheduledLimitReached?: boolean
  account?: Account[]
}

interface AddScheduleModalProps {
  isOpen: boolean
  onClose: () => void
  user: User
  accounts: Account[]
}

const OPTIMAL_POSTING_TIMES = [
  { time: '09:00', label: '9:00 AM', reason: 'Morning engagement peak' },
  { time: '12:00', label: '12:00 PM', reason: 'Lunch break activity' },
  { time: '15:00', label: '3:00 PM', reason: 'Afternoon activity' },
  { time: '18:00', label: '6:00 PM', reason: 'Evening peak' },
  { time: '21:00', label: '9:00 PM', reason: 'Night scrolling' },
]

export default function AddScheduleModal({ isOpen, onClose, user, accounts }: AddScheduleModalProps) {
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]) // CHANGÉ: multiple comptes
  const [message, setMessage] = useState('')
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [charCount, setCharCount] = useState(0)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  
  // États pour la gestion des médias uniformisée
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([])
  const [imageAltTexts, setImageAltTexts] = useState<string[]>([])
  const [selectedVideos, setSelectedVideos] = useState<File[]>([])
  const [videoAltTexts, setVideoAltTexts] = useState<string[]>([])
  const [videoValidationError, setVideoValidationError] = useState<string>('')

  const isFreeLimitReached = user.plan === 'free' && user.isScheduledLimitReached

  // Logique de hauteur optimisée
  const getModalHeight = () => {
    let baseHeight = 'max-h-[75vh]' // Hauteur de base plus grande
    
    // Augmenter si du média est présent
    if (selectedImages.length > 0 || selectedVideos.length > 0) {
      baseHeight = 'max-h-[85vh]'
    }
    
    // Maximum pour beaucoup de contenu
    if (message.length > 200 && (selectedImages.length > 0 || selectedVideos.length > 0)) {
      baseHeight = 'max-h-[90vh]'
    }
    
    return baseHeight
  }

  // Set default date and time
  useEffect(() => {
    if (isOpen) {
      const now = new Date()
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

      setScheduleDate(tomorrow.toISOString().split('T')[0])
      setScheduleTime('09:00')
      
      // Reset form
      setSelectedAccounts([])
      setMessage('')
      setErrors({})
      setSelectedImages([])
      setImagePreviewUrls([])
      setImageAltTexts([])
      setSelectedVideos([])
      setVideoAltTexts([])
      setVideoValidationError('')

      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
    } else {
      // Restore body scroll when modal is closed
      document.body.style.overflow = 'unset'
    }

    // Cleanup function to restore scroll when component unmounts
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // Update character count
  useEffect(() => {
    setCharCount(message.length)
  }, [message])

  // Gestion uniformisée des médias - Validation vidéo
  const validateVideoFile = async (file: File): Promise<{ valid: boolean; error?: string }> => {
    return new Promise((resolve) => {
      const video = document.createElement('video')
      const url = URL.createObjectURL(file)
      
      video.onloadedmetadata = () => {
        const width = video.videoWidth
        const height = video.videoHeight
        const duration = video.duration
        
        URL.revokeObjectURL(url)
        
        // Check resolution (max 1920x1080)
        if (width > 1920 || height > 1080) {
          resolve({ 
            valid: false, 
            error: `Video resolution too high: ${width}x${height} (max: 1920x1080)` 
          })
          return
        }
        
        // Check duration (max 60 seconds)
        if (duration > 60) {
          resolve({ 
            valid: false, 
            error: `Video too long: ${Math.round(duration)}s (max: 60s)` 
          })
          return
        }
        
        resolve({ valid: true })
      }
      
      video.onerror = () => {
        URL.revokeObjectURL(url)
        resolve({ 
          valid: false, 
          error: 'Unable to read video metadata' 
        })
      }
      
      video.src = url
    })
  }

  // Gestion uniformisée des médias - Fonction principale
  const handleMediaSelect = async (files: FileList | null) => {
    if (!files) return
    
    const newImages = Array.from(files).filter(file => 
      file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024 // 10MB limit
    ).slice(0, 4 - selectedImages.length) // Limit to 4 total images
    
    const newVideos = Array.from(files).filter(file => 
      file.type.startsWith('video/') && file.size <= 50 * 1024 * 1024 // 50MB limit
    ).slice(0, 1 - selectedVideos.length) // Limit to 1 total video
    
    // Ne pas permettre images ET vidéos en même temps
    if (selectedImages.length > 0 && newVideos.length > 0) {
      setVideoValidationError('Cannot upload both images and videos in the same post. Please choose either images OR videos.')
      return
    }
    if (selectedVideos.length > 0 && newImages.length > 0) {
      setVideoValidationError('Cannot upload both images and videos in the same post. Please choose either images OR videos.')
      return
    }
    
    // Handle videos with validation
    if (newVideos.length > 0) {
      const videoFile = newVideos[0]
      const validationResult = await validateVideoFile(videoFile)
      
      if (!validationResult.valid) {
        setVideoValidationError(validationResult.error || 'Video validation failed')
        setTimeout(() => setVideoValidationError(''), 5000)
        return
      }
      
      // If validation passes, add the video
      setSelectedVideos(prev => [...prev, videoFile])
      setVideoAltTexts(prev => [...prev, ''])
    }
    
    // Handle images
    if (newImages.length > 0) {
      setSelectedImages(prev => [...prev, ...newImages])
      setImageAltTexts(prev => [...prev, ...new Array(newImages.length).fill('')])
      
      // Create previews
      newImages.forEach(file => {
        const reader = new FileReader()
        reader.onload = (e) => {
          if (e.target?.result) {
            setImagePreviewUrls(prev => [...prev, e.target!.result as string])
          }
        }
        reader.readAsDataURL(file)
      })
    }
  }

  // Fonctions pour supprimer les médias
  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index))
    setImagePreviewUrls(prev => prev.filter((_, i) => i !== index))
    setImageAltTexts(prev => prev.filter((_, i) => i !== index))
  }

  const removeVideo = (index: number) => {
    setSelectedVideos(prev => prev.filter((_, i) => i !== index))
    setVideoAltTexts(prev => prev.filter((_, i) => i !== index))
  }

  const clearAllMedia = () => {
    setSelectedImages([])
    setImagePreviewUrls([])
    setImageAltTexts([])
    setSelectedVideos([])
    setVideoAltTexts([])
    setVideoValidationError('')
  }

  // Fonctions pour mettre à jour les alt texts
  const updateImageAltText = (index: number, altText: string) => {
    setImageAltTexts(prev => {
      const newAltTexts = [...prev]
      newAltTexts[index] = altText
      return newAltTexts
    })
  }

  const updateVideoAltText = (index: number, altText: string) => {
    setVideoAltTexts(prev => {
      const newAltTexts = [...prev]
      newAltTexts[index] = altText
      return newAltTexts
    })
  }

  // Gestion du Ctrl+V pour coller des médias
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!isOpen) return
      
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
            handleMediaSelect(dt.files)
          }
        }
      }
    }

    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [isOpen, selectedImages.length])

  // Auto-clear l'erreur de validation après 5 secondes
  useEffect(() => {
    if (videoValidationError) {
      const timer = setTimeout(() => {
        setVideoValidationError('')
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [videoValidationError])

  const createSchedule = async () => {
    console.log('=== createSchedule START ===')
    if (selectedAccounts.length === 0 || !message.trim() || !scheduleDate || !scheduleTime) {
      console.log('Validation failed:', { selectedAccounts, message: message.trim(), scheduleDate, scheduleTime })
      return
    }

    // Validate custom time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    if (!timeRegex.test(scheduleTime)) {
      setErrors({ schedule_time: 'Please enter a valid time format (HH:MM, e.g., 14:30)' })
      return
    }

    setIsSubmitting(true)
    setErrors({})

    try {
      const scheduleDateTime = new Date(`${scheduleDate}T${scheduleTime}`)
      
      if (selectedAccounts.length === 0) {
        setErrors({ account: 'Please select at least one account' })
        return
      }

      if (scheduleDateTime <= new Date()) {
        setErrors({ schedule_time: 'Please select a time in the future' })
        return
      }

      // Validation: Ne pas permettre images ET vidéos en même temps
      if (selectedImages.length > 0 && selectedVideos.length > 0) {
        setErrors({ media: 'Cannot upload both images and videos in the same post. Please choose either images OR videos.' })
        return
      }

      // Use POST with FormData to handle file uploads
      const formData = new FormData()
      formData.append('account_handles', selectedAccounts.join(',')) // Multiple accounts
      formData.append('message', message.trim())
      formData.append('schedule_time', scheduleDateTime.toISOString())
      
      // Append images
      selectedImages.forEach((image, index) => {
        formData.append(`images[${index}]`, image)
      })

      // Append videos
      selectedVideos.forEach((video, index) => {
        formData.append(`videos[${index}]`, video)
      })

      // Append image alt texts
      if (imageAltTexts.length > 0) {
        formData.append('image_alt_texts', JSON.stringify(imageAltTexts))
      }

      // Append video alt texts
      if (videoAltTexts.length > 0) {
        formData.append('video_alt_texts', JSON.stringify(videoAltTexts))
      }

      // Use POST with FormData to handle file uploads
      router.post('/schedule/create', formData, {
        onStart: () => console.log('=== INERTIA REQUEST STARTED ==='),
        onProgress: (progress) => console.log('=== INERTIA PROGRESS ===', progress),
        onSuccess: (page) => {
          console.log('=== INERTIA SUCCESS ===', page)
          // Reset form on success and close modal
          setSelectedAccounts([])
          setMessage('')
          setScheduleDate('')
          setScheduleTime('09:00')
          // Clean up image URLs and reset images
          imagePreviewUrls.forEach(url => URL.revokeObjectURL(url))
          setSelectedImages([])
          setImagePreviewUrls([])
          // Reset videos
          setSelectedVideos([])
          setVideoAltTexts([])
          onClose()
        },
        onError: (errors) => {
          console.log('=== INERTIA ERROR ===', errors)
          setErrors({ general: 'Failed to create schedule. Please try again.' })
        },
        onFinish: () => console.log('=== INERTIA FINISHED ===')
      })
      
    } catch (error: any) {
      console.error('Scheduling error:', error)
      setErrors({ general: 'An error occurred while scheduling the post. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('handleSubmit called')
    console.log('Form data:', { selectedAccounts, message, scheduleDate, scheduleTime })
    console.log('isFreeLimitReached:', isFreeLimitReached)

    if (isFreeLimitReached) {
      setErrors({ general: 'You have reached the free plan limit. Please upgrade to continue scheduling posts.' })
      return
    }

    await createSchedule()
  }

  const formatCharacterCount = () => {
    const limit = 300 // BlueSky character limit
    const remaining = limit - charCount

    if (remaining < 0) {
      return <span className="text-red-500 font-medium">{remaining}</span>
    } else if (remaining < 50) {
      return <span className="text-yellow-500 font-medium">{remaining}</span>
    }

    return <span className="text-gray-500">{remaining}</span>
  }

  const detectContentElements = () => {
    const elements = []
    if (message.includes('#')) elements.push({ icon: Hash, label: 'Hashtags' })
    if (message.includes('@')) elements.push({ icon: AtSign, label: 'Mentions' })
    if (message.includes('http')) elements.push({ icon: LinkIcon, label: 'Links' })
    if (message.includes('?')) elements.push({ icon: MessageCircle, label: 'Question' })
    if (selectedImages.length > 0) elements.push({ icon: ImageIcon, label: `${selectedImages.length} Image${selectedImages.length > 1 ? 's' : ''}` })
    if (selectedVideos.length > 0) elements.push({ icon: Video, label: `${selectedVideos.length} Video${selectedVideos.length > 1 ? 's' : ''}` })
    return elements
  }

  const getOptimalTimeRecommendation = () => {
    const currentTime = scheduleTime
    const optimal = OPTIMAL_POSTING_TIMES.find((t) => t.time === currentTime)
    return optimal
  }

  const getTimeOptions = () => {
    const options: Option[] = []
    
    // Add optimal times first
    OPTIMAL_POSTING_TIMES.forEach(time => {
      options.push({
        value: time.time,
        label: time.label,
        sublabel: `${time.reason} - Optimal`
      })
    })
    
    // Add other times
    Array.from({ length: 24 }, (_, i) => {
      const time = `${i.toString().padStart(2, '0')}:00`
      if (!OPTIMAL_POSTING_TIMES.some((opt) => opt.time === time)) {
        const label = new Date(`2000-01-01T${time}`).toLocaleTimeString([], {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })
        options.push({
          value: time,
          label: label,
        })
      }
    })
    
    return options.sort((a, b) => a.value.localeCompare(b.value))
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    // Use the unified media handler instead
    handleMediaSelect(event.target.files)
    
    // Reset input
    event.target.value = ''
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        // Close modal if clicking on backdrop
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <Card 
        className={`w-full max-w-2xl ${getModalHeight()} flex flex-col transition-all duration-300`}
        onClick={(e) => e.stopPropagation()}
      >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 flex-shrink-0 border-b px-4 pt-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Send className="h-4 w-4 text-blue-500" />
              Schedule New Post
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-7 w-7 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </CardHeader>
          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto">
            <CardContent className="p-2">
              <form onSubmit={handleSubmit} className="space-y-2">
                {/* Account Selection - Dropdown with multiple selection */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Accounts</Label>
                  <div className="space-y-1">
                    {accounts.map((account) => (
                      <div key={account.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`account-${account.id}`}
                          checked={selectedAccounts.includes(account.id.toString())}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedAccounts([...selectedAccounts, account.id.toString()])
                            } else {
                              setSelectedAccounts(selectedAccounts.filter(id => id !== account.id.toString()))
                            }
                          }}
                          disabled={isFreeLimitReached}
                        />
                        <Label 
                          htmlFor={`account-${account.id}`}
                          className="text-xs font-normal cursor-pointer"
                        >
                          {account.displayName || account.handle}
                          <span className="text-muted-foreground ml-1">@{account.handle}</span>
                        </Label>
                      </div>
                    ))}
                  </div>
                  {errors.account && (
                    <p className="text-xs text-red-500">{errors.account}</p>
                  )}
                </div>

                {/* Message Input - Ultra Compact */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="message" className="text-xs font-medium">
                      Content
                    </Label>
                    <div className="text-xs text-muted-foreground">
                      {formatCharacterCount()}
                    </div>
                  </div>
                  <Textarea
                    id="message"
                    placeholder="What's happening?"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="min-h-[40px] resize-none text-sm"
                    disabled={isFreeLimitReached}
                    maxLength={300}
                  />
                  {errors.message && <p className="text-xs text-red-500">{errors.message}</p>}

                  {/* Content Analysis - Super Compact */}
                  {message && (
                    <div className="flex flex-wrap gap-1">
                      {detectContentElements().map((element, index) => (
                        <Badge key={index} variant="secondary" className="text-xs py-0 px-1 h-4">
                          <element.icon className="h-2 w-2 mr-1" />
                          {element.label}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Media Upload - Ultra Compact */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <ImageIcon className="h-3 w-3" />
                    Media
                  </Label>
                  
                  {/* Inline media type selection with compact upload */}
                  <div className="flex items-center gap-2 text-xs">
                    <label className="flex items-center space-x-1 cursor-pointer">
                      <input
                        type="radio"
                        name="mediaType"
                        value="images"
                        checked={selectedVideos.length === 0}
                        onChange={() => {
                          setSelectedVideos([])
                          setVideoAltTexts([])
                        }}
                        className="w-3 h-3 text-blue-600"
                      />
                      <span>Images</span>
                    </label>
                    <label className="flex items-center space-x-1 cursor-pointer">
                      <input
                        type="radio"
                        name="mediaType"
                        value="videos"
                        checked={selectedVideos.length > 0}
                        onChange={() => {
                          setSelectedImages([])
                          setImagePreviewUrls([])
                        }}
                        className="w-3 h-3 text-blue-600"
                      />
                      <span>Videos</span>
                    </label>
                    
                    {/* Upload button inline */}
                    {selectedVideos.length === 0 && (
                      <>
                        <input
                          type="file"
                          accept="image/*,video/*"
                          multiple
                          onChange={handleImageUpload}
                          className="hidden"
                          id="image-upload"
                          disabled={isFreeLimitReached}
                        />
                        <label htmlFor="image-upload" className="cursor-pointer flex items-center gap-1 text-blue-600 hover:text-blue-700 ml-2">
                          <Upload className="h-3 w-3" />
                          Media ({selectedImages.length + selectedVideos.length}/{selectedImages.length > 0 ? '4' : '1'})
                        </label>
                        <span className="text-xs text-muted-foreground ml-1">
                          (Ctrl+V supported)
                        </span>
                      </>
                    )}
                  </div>

                  {/* Compact previews et gestion unifiée des médias */}
                  {selectedImages.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex gap-1 flex-wrap">
                        {imagePreviewUrls.map((url, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={url}
                              alt={imageAltTexts[index] || `Preview ${index + 1}`}
                              className="w-12 h-12 object-cover rounded border"
                            />
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                      {/* Alt text pour images (compact) */}
                      <div className="text-xs space-y-1">
                        {imageAltTexts.map((altText, index) => (
                          <Input
                            key={index}
                            placeholder={`Alt text for image ${index + 1}...`}
                            value={altText}
                            onChange={(e) => updateImageAltText(index, e.target.value)}
                            className="h-6 text-xs"
                            maxLength={1000}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Video upload unifié */}
                  {selectedVideos.length > 0 && (
                    <div className="space-y-2">
                      <div className="space-y-2">
                        {selectedVideos.map((video, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 border rounded text-xs">
                            <Video className="h-4 w-4 text-blue-500" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{video.name}</p>
                              <p className="text-muted-foreground">
                                {(video.size / (1024 * 1024)).toFixed(1)} MB • Video
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeVideo(index)}
                              className="w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                      {/* Alt text pour vidéos (compact) */}
                      <div className="text-xs space-y-1">
                        {videoAltTexts.map((altText, index) => (
                          <Input
                            key={index}
                            placeholder={`Alt text for video ${index + 1}...`}
                            value={altText}
                            onChange={(e) => updateVideoAltText(index, e.target.value)}
                            className="h-6 text-xs"
                            maxLength={1000}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Error display pour vidéos */}
                  {videoValidationError && (
                    <div className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                      {videoValidationError}
                    </div>
                  )}

                  {/* Clear all media button */}
                  {(selectedImages.length > 0 || selectedVideos.length > 0) && (
                    <button
                      type="button"
                      onClick={clearAllMedia}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Clear all media
                    </button>
                  )}
                </div>

                {/* Date and Time - Compact */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="date" className="text-sm font-medium flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Date
                    </Label>
                    <Input
                      type="date"
                      id="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      disabled={isFreeLimitReached}
                      className="text-sm h-8"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="time" className="text-sm font-medium flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Time
                    </Label>
                    <CustomSelect
                      options={getTimeOptions()}
                      value={scheduleTime}
                      onChange={setScheduleTime}
                      placeholder="HH:MM"
                      disabled={isFreeLimitReached}
                      allowCustomInput={true}
                      customInputPlaceholder="14:30"
                      compact={true}
                    />
                    {errors.schedule_time && (
                      <p className="text-xs text-red-500">{errors.schedule_time}</p>
                    )}
                  </div>
                </div>

                {/* Time Recommendation - Compact */}
                {getOptimalTimeRecommendation() && (
                  <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <CheckCircle className="h-3 w-3 text-green-600 dark:text-green-400 flex-shrink-0" />
                    <span className="text-xs text-green-800 dark:text-green-300">
                      {getOptimalTimeRecommendation()?.reason}
                    </span>
                  </div>
                )}

                {/* Error Messages */}
                {errors.general && (
                  <Alert className="border-red-200 bg-red-50 dark:bg-red-900/20">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-700 dark:text-red-300">
                      {errors.general}
                    </AlertDescription>
                  </Alert>
                )}
              </form>
            </CardContent>
          </div>
          
          {/* Sticky footer for buttons - Ultra Compact */}
          <div className="flex gap-2 p-2 border-t bg-white dark:bg-card flex-shrink-0">
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={
                isSubmitting || isFreeLimitReached || selectedAccounts.length === 0 || !message.trim() || !scheduleDate || !scheduleTime
              }
              className="flex-1 bg-blue-500 text-white h-7 text-xs"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1" />
                  Scheduling...
                </>
              ) : (
                <>
                  <Send className="h-3 w-3 mr-1" />
                  Schedule
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3 h-7 text-xs"
            >
              Cancel
            </Button>
          </div>
        </Card>
    </div>
  )
}
