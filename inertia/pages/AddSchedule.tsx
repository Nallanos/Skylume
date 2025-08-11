import { useState, useEffect } from 'react'
import { Head, usePage, router } from '@inertiajs/react'
import Layout from '../components/Layout'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import CustomSelect, { type Option } from '../components/ui/CustomSelect'
import ContentWarningModal from '../components/ContentWarningModal'
import { Badge } from '../components/ui/badge'
import { Alert, AlertDescription } from '../components/ui/alert'
import {
  Calendar,
  Clock,
  Send,
  ArrowLeft,
  User,
  MessageCircle,
  Hash,
  AtSign,
  Link as LinkIcon,
  AlertCircle,
  CheckCircle,
  Image as ImageIcon,
  X,
  Upload,
  Shield,
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


const OPTIMAL_POSTING_TIMES = [
  { time: '09:00', label: '9:00 AM', reason: 'Morning engagement peak' },
  { time: '12:00', label: '12:00 PM', reason: 'Lunch break activity' },
  { time: '15:00', label: '3:00 PM', reason: 'Afternoon activity' },
  { time: '18:00', label: '6:00 PM', reason: 'Evening peak' },
  { time: '21:00', label: '9:00 PM', reason: 'Night scrolling' },
]

export default function AddSchedule() {
  const { props } = usePage()
  const user = props.user as User
  const accounts = user.account || []

  const [selectedAccount, setSelectedAccount] = useState<string>('')
  const [message, setMessage] = useState('')
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [charCount, setCharCount] = useState(0)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([])
  const [imageAltTexts, setImageAltTexts] = useState<string[]>([])
  const [contentWarnings, setContentWarnings] = useState<string[]>([])
  const [showContentWarningModal, setShowContentWarningModal] = useState(false)
  const [pasteNotification, setPasteNotification] = useState<string | null>(null)

  const isFreeLimitReached = user.plan === 'free' && user.isScheduledLimitReached

  // Set default date and time
  useEffect(() => {
    const now = new Date()
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    setScheduleDate(tomorrow.toISOString().split('T')[0])
    setScheduleTime('09:00')
  }, [])

  // Update character count
  useEffect(() => {
    setCharCount(message.length)
  }, [message])

  // Handle paste events for images
  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      // Check if we're focused on an input that shouldn't trigger image paste
      const target = event.target as HTMLElement
      if (target.tagName === 'INPUT' && target.getAttribute('type') === 'text') return
      if (target.tagName === 'TEXTAREA') return
      
      // Only handle paste if we're not at image limit
      if (selectedImages.length >= 4) {
        setPasteNotification('Maximum 4 images allowed')
        setTimeout(() => setPasteNotification(null), 3000)
        return
      }
      
      const items = event.clipboardData?.items
      if (!items) return

      // Look for image items in clipboard
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.type.startsWith('image/')) {
          event.preventDefault()
          
          const file = item.getAsFile()
          if (file) {
            // Create a new file with a timestamp name
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
            const newFile = new File([file], `pasted-image-${timestamp}.${file.type.split('/')[1]}`, {
              type: file.type,
            })
            
            const newImageUrl = URL.createObjectURL(newFile)
            setSelectedImages(prev => [...prev, newFile])
            setImagePreviewUrls(prev => [...prev, newImageUrl])
            setImageAltTexts(prev => [...prev, '']) // Initialize with empty alt text
            
            // Show success notification
            setPasteNotification('Image pasted successfully!')
            setTimeout(() => setPasteNotification(null), 3000)
          }
          break
        }
      }
    }

    // Add event listener to document
    document.addEventListener('paste', handlePaste)
    
    // Cleanup
    return () => {
      document.removeEventListener('paste', handlePaste)
    }
  }, [selectedImages.length]) // Re-run when selectedImages.length changes

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

      const payload = {
        account_handle: selectedAccountData.handle,
        message: message.trim(),
        schedule_time: scheduleDateTime.toISOString(),
        images: selectedImages, // Add images to payload
      }

      console.log('=== BEFORE router.post ===')
      console.log('Payload:', { ...payload, images: `${selectedImages.length} images` })
      console.log('User:', user)
      console.log('Props:', props)

      // Use POST with FormData to handle file uploads
      const formData = new FormData()
      formData.append('account_handle', selectedAccountData.handle)
      formData.append('message', message.trim())
      formData.append('schedule_time', scheduleDateTime.toISOString())
      formData.append('alt_texts', JSON.stringify(imageAltTexts))
      formData.append('content_warnings', JSON.stringify(contentWarnings))
      
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
          // Reset form on success
          setSelectedAccount('')
          setMessage('')
          setScheduleDate('')
          setScheduleTime('09:00')
          // Clean up image URLs and reset images
          imagePreviewUrls.forEach(url => URL.revokeObjectURL(url))
          setSelectedImages([])
          setImagePreviewUrls([])
          setImageAltTexts([])
          setContentWarnings([])
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
      const newAltTexts = new Array(newImages.length).fill('')
      
      setSelectedImages(prev => [...prev, ...newImages])
      setImagePreviewUrls(prev => [...prev, ...newImageUrls])
      setImageAltTexts(prev => [...prev, ...newAltTexts])
    }
    
    // Reset input
    event.target.value = ''
  }

  const removeImage = (index: number) => {
    // Revoke the object URL to free memory
    URL.revokeObjectURL(imagePreviewUrls[index])
    
    setSelectedImages(prev => prev.filter((_, i) => i !== index))
    setImagePreviewUrls(prev => prev.filter((_, i) => i !== index))
    setImageAltTexts(prev => prev.filter((_, i) => i !== index))
  }

  const updateAltText = (index: number, altText: string) => {
    setImageAltTexts(prev => {
      const newAltTexts = [...prev]
      newAltTexts[index] = altText
      return newAltTexts
    })
  }

  return (
    <>
      <Head title="Schedule New Post" />
      <Layout user={user}>
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <header className="mb-12 text-center">
            <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center text-white mb-6 mx-auto">
              <Send className="h-8 w-8" />
            </div>
            <h1 className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-4">
              Schedule New Post
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Create and schedule your next Bluesky post. Choose the perfect time to reach your audience 
              and let our system automatically publish your content.
            </p>
          </header>

          {/* Paste Notification */}
          {pasteNotification && (
            <div className="max-w-2xl mx-auto mb-6">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span className="text-sm text-green-800 dark:text-green-300">{pasteNotification}</span>
              </div>
            </div>
          )}

          {/* Back Button */}
          <div className="max-w-2xl mx-auto mb-6">
            <Button
              variant="outline"
              onClick={() => router.visit('/schedule')}
              className="w-fit"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Schedule
            </Button>
          </div>

          {/* Free plan limit warning */}
          {isFreeLimitReached && (
            <div className="max-w-2xl mx-auto mb-6">
              <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-900/20">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-700 dark:text-amber-300">
                  You've reached the free plan limit (5/5 posts).{' '}
                  <Button
                    variant="link"
                    className="p-0 h-auto text-amber-700 dark:text-amber-300 underline"
                    onClick={() => router.post('/create-stripe-session')}
                  >
                    Upgrade to Pro
                  </Button>{' '}
                  to schedule unlimited posts.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Main Card */}
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Compose Post
              </CardTitle>
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
                      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-muted-foreground/50 transition-colors">
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
                          <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground mb-1">
                            Click to upload images or drag and drop
                          </p>
                          <p className="text-xs text-muted-foreground mb-2">
                            PNG, JPG, GIF up to 10MB each
                          </p>
                          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                            <span>or press</span>
                            <kbd className="px-1.5 py-0.5 text-xs font-mono bg-muted border rounded">
                              {navigator.platform.toLowerCase().includes('mac') ? 'Cmd+V' : 'Ctrl+V'}
                            </kbd>
                            <span>to paste</span>
                          </div>
                        </label>
                      </div>
                    )}

                    {/* Image Previews */}
                    {selectedImages.length > 0 && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {imagePreviewUrls.map((url, index) => (
                            <div key={index} className="space-y-2">
                              <div className="relative group">
                                <img
                                  src={url}
                                  alt={imageAltTexts[index] || `Preview ${index + 1}`}
                                  className="w-full h-32 object-cover rounded-lg border"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeImage(index)}
                                  className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                                <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                                  {selectedImages[index]?.name}
                                </div>
                              </div>
                              <div className="space-y-1">
                                <Label 
                                  htmlFor={`alt-text-${index}`}
                                  className="text-xs font-medium text-gray-600 dark:text-gray-400"
                                >
                                  Alt text (for accessibility)
                                </Label>
                                <Input
                                  id={`alt-text-${index}`}
                                  type="text"
                                  placeholder="Describe this image..."
                                  value={imageAltTexts[index] || ''}
                                  onChange={(e) => updateAltText(index, e.target.value)}
                                  className="text-xs"
                                  maxLength={1000}
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {(imageAltTexts[index] || '').length}/1000 characters
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Content Warnings */}
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
                              <Badge key={warning} variant="secondary" className="text-xs">
                                {warning.replace('-', ' ')}
                              </Badge>
                            ))}
                          </div>
                        )}
                        
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Add content warnings for sensitive media to help users make informed viewing choices.
                        </p>
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
                  <div className="pt-4">
                    <Button
                      type="submit"
                      disabled={
                        isSubmitting || isFreeLimitReached || !selectedAccount || !message.trim() || !scheduleDate || !scheduleTime
                      }
                      className="w-full bg-blue-500 text-white"
                      onClick={() => console.log('Submit button clicked', { 
                        isSubmitting, 
                        isFreeLimitReached, 
                        selectedAccount, 
                        messageLength: message.trim().length,
                        scheduleDate,
                        scheduleTime
                      })}
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
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Content Warning Modal */}
          <ContentWarningModal
            isOpen={showContentWarningModal}
            onClose={() => setShowContentWarningModal(false)}
            onSave={setContentWarnings}
            initialWarnings={contentWarnings}
          />
      </Layout>
    </>
  )
}
