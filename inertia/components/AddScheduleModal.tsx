import { useState, useEffect } from 'react'
import { router } from '@inertiajs/react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
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
} from 'lucide-react'

interface Account {
  id: number
  handle: string
  displayName: string
}

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
  const [selectedAccount, setSelectedAccount] = useState<string>('')
  const [message, setMessage] = useState('')
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [charCount, setCharCount] = useState(0)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([])

  const isFreeLimitReached = user.plan === 'free' && user.isScheduledLimitReached

  // Set default date and time
  useEffect(() => {
    if (isOpen) {
      const now = new Date()
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

      setScheduleDate(tomorrow.toISOString().split('T')[0])
      setScheduleTime('09:00')
      
      // Reset form
      setSelectedAccount('')
      setMessage('')
      setErrors({})
      setSelectedImages([])
      setImagePreviewUrls([])
    }
  }, [isOpen])

  // Update character count
  useEffect(() => {
    setCharCount(message.length)
  }, [message])

  const createSchedule = async () => {
    console.log('=== createSchedule START ===')
    if (!selectedAccount || !message.trim() || !scheduleDate || !scheduleTime) {
      console.log('Validation failed:', { selectedAccount, message: message.trim(), scheduleDate, scheduleTime })
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
      const selectedAccountData = accounts.find((acc) => acc.id.toString() === selectedAccount)

      if (!selectedAccountData) {
        setErrors({ account: 'Please select an account' })
        return
      }

      if (scheduleDateTime <= new Date()) {
        setErrors({ schedule_time: 'Please select a time in the future' })
        return
      }

      // Use POST with FormData to handle file uploads
      const formData = new FormData()
      formData.append('account_handle', selectedAccountData.handle)
      formData.append('message', message.trim())
      formData.append('schedule_time', scheduleDateTime.toISOString())
      
      // Append images
      selectedImages.forEach((image, index) => {
        formData.append(`images[${index}]`, image)
      })

      // Use POST with FormData to handle file uploads
      router.post('/schedule/create', formData, {
        onStart: () => console.log('=== INERTIA REQUEST STARTED ==='),
        onProgress: (progress) => console.log('=== INERTIA PROGRESS ===', progress),
        onSuccess: (page) => {
          console.log('=== INERTIA SUCCESS ===', page)
          // Reset form on success and close modal
          setSelectedAccount('')
          setMessage('')
          setScheduleDate('')
          setScheduleTime('09:00')
          // Clean up image URLs and reset images
          imagePreviewUrls.forEach(url => URL.revokeObjectURL(url))
          setSelectedImages([])
          setImagePreviewUrls([])
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
    console.log('Form data:', { selectedAccount, message, scheduleDate, scheduleTime })
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
    const files = Array.from(event.target.files || [])
    
    // Limit to 4 images (BlueSky limit)
    const newImages = files.slice(0, 4 - selectedImages.length)
    
    if (newImages.length > 0) {
      const newImageUrls = newImages.map(file => URL.createObjectURL(file))
      
      setSelectedImages(prev => [...prev, ...newImages])
      setImagePreviewUrls(prev => [...prev, ...newImageUrls])
    }
    
    // Reset input
    event.target.value = ''
  }

  const removeImage = (index: number) => {
    // Revoke the object URL to free memory
    URL.revokeObjectURL(imagePreviewUrls[index])
    
    setSelectedImages(prev => prev.filter((_, i) => i !== index))
    setImagePreviewUrls(prev => prev.filter((_, i) => i !== index))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-blue-500" />
            Schedule New Post
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Account Selection */}
            <div className="space-y-2">
              <Label htmlFor="account" className="text-sm font-medium">
                Select Account
              </Label>
              <CustomSelect
                value={selectedAccount}
                onChange={setSelectedAccount}
                options={accounts.map(account => ({
                  value: account.id.toString(),
                  label: account.displayName || account.handle,
                  sublabel: `@${account.handle}`
                }))}
                placeholder="Choose an account to post from"
                disabled={isFreeLimitReached}
              />
              {errors.account && (
                <p className="text-sm text-red-500">{errors.account}</p>
              )}
            </div>

            {/* Message Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="message" className="text-sm font-medium">
                  Post Content
                </Label>
                <div className="text-sm text-muted-foreground">
                  {formatCharacterCount()} characters remaining
                </div>
              </div>
              <Textarea
                id="message"
                placeholder="What's happening? Share your thoughts..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-[120px] resize-none"
                disabled={isFreeLimitReached}
                maxLength={300}
              />
              {errors.message && <p className="text-sm text-red-500">{errors.message}</p>}

              {/* Content Analysis */}
              {message && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {detectContentElements().map((element, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      <element.icon className="h-3 w-3 mr-1" />
                      {element.label}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Images (optional)
                </Label>
                <span className="text-xs text-muted-foreground">
                  {selectedImages.length}/4 images
                </span>
              </div>

              {/* Image Upload Area */}
              {selectedImages.length < 4 && (
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center hover:border-muted-foreground/50 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                    disabled={isFreeLimitReached}
                  />
                  <label htmlFor="image-upload" className="cursor-pointer">
                    <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground mb-1">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG, GIF up to 10MB each
                    </p>
                  </label>
                </div>
              )}

              {/* Image Previews */}
              {selectedImages.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {imagePreviewUrls.map((url, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={url}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg border"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date" className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Date
                </Label>
                <Input
                  type="date"
                  id="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  disabled={isFreeLimitReached}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="time" className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Time
                </Label>
                <CustomSelect
                  options={getTimeOptions()}
                  value={scheduleTime}
                  onChange={setScheduleTime}
                  placeholder="Select a time or enter custom time (HH:MM)"
                  disabled={isFreeLimitReached}
                  allowCustomInput={true}
                  customInputPlaceholder="Enter time (e.g., 14:30)"
                />
                {errors.schedule_time && (
                  <p className="text-sm text-red-500">{errors.schedule_time}</p>
                )}
              </div>
            </div>

            {/* Time Recommendation */}
            {getOptimalTimeRecommendation() && (
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span className="text-sm text-green-800 dark:text-green-300">
                  Great choice! {getOptimalTimeRecommendation()?.reason}
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

            {/* Submit Button */}
            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={
                  isSubmitting || isFreeLimitReached || !selectedAccount || !message.trim() || !scheduleDate || !scheduleTime
                }
                className="flex-1 bg-blue-500 text-white"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Scheduling...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Schedule Post
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-6"
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
