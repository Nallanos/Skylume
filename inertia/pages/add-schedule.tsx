import { useState, useEffect } from 'react'
import { Head, usePage, router } from '@inertiajs/react'
import Layout from '../components/Layout'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'
import { Badge } from '../components/ui/badge'
import { Alert, AlertDescription } from '../components/ui/alert'
import {
  Calendar,
  Clock,
  Send,
  ArrowLeft,
  Eye,
  TrendingUp,
  Users,
  MessageCircle,
  Hash,
  AtSign,
  Link as LinkIcon,
  AlertCircle,
  CheckCircle,
  Sparkles,
} from 'lucide-react'

interface Account {
  id: number
  handle: string
  displayName: string
  platform: string
  avatar?: string
  followerCount?: number
  isActive?: boolean
}

interface User {
  id: number
  email: string
  plan?: string
  isScheduledLimitReached?: boolean
}

interface AddScheduleProps {
  accounts: Account[]
  timeZone?: string
  planLimits?: {
    maxScheduledPosts: number
    currentScheduledPosts: number
  }
}

const OPTIMAL_POSTING_TIMES = [
  { time: '09:00', label: '9:00 AM', reason: 'Morning engagement peak' },
  { time: '12:00', label: '12:00 PM', reason: 'Lunch break activity' },
  { time: '15:00', label: '3:00 PM', reason: 'Afternoon activity' },
  { time: '18:00', label: '6:00 PM', reason: 'Evening peak' },
  { time: '21:00', label: '9:00 PM', reason: 'Night scrolling' },
]

const CONTENT_TIPS = [
  'Ask engaging questions to boost interaction',
  'Use relevant hashtags (2-3 optimal)',
  'Include a call-to-action',
  'Share behind-the-scenes content',
  'Post user-generated content',
  'Share industry insights or tips',
]

export default function AddSchedule({ accounts = [] }: AddScheduleProps) {
  const { props } = usePage()
  const user = props.user as User

  const [selectedAccount, setSelectedAccount] = useState<string>('')
  const [message, setMessage] = useState('')
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [charCount, setCharCount] = useState(0)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [showPreview, setShowPreview] = useState(false)

  const isFreeLimitReached = user.plan === 'free' && user.isScheduledLimitReached
  const selectedAccountData = accounts.find((acc) => acc.id.toString() === selectedAccount)

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isFreeLimitReached) {
      return
    }

    setIsSubmitting(true)
    setErrors({})

    try {
      const scheduleDateTime = new Date(`${scheduleDate}T${scheduleTime}`)

      await router.post('/schedule/create', {
        account_id: parseInt(selectedAccount),
        message: message.trim(),
        schedule_time: scheduleDateTime.toISOString(),
      })

      // Redirect to schedule page on success
      router.visit('/schedule')
    } catch (error: any) {
      if (error.response?.status === 422) {
        setErrors(error.response.data.errors || {})
      } else {
        setErrors({ general: 'An error occurred while scheduling the post.' })
      }
    } finally {
      setIsSubmitting(false)
    }
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
    return elements
  }

  const getOptimalTimeRecommendation = () => {
    const currentTime = scheduleTime
    const optimal = OPTIMAL_POSTING_TIMES.find((t) => t.time === currentTime)
    return optimal
  }

  return (
    <Layout user={user}>
      <Head title="Schedule New Post" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.visit('/schedule')}
              className="text-gray-600 dark:text-gray-300"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Schedule
            </Button>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">
            Schedule New Post
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Plan your content and reach your audience at the perfect time
          </p>
        </div>

        {/* Free plan limit warning */}
        {isFreeLimitReached && (
          <Alert className="mb-6 border-yellow-500/30 bg-yellow-500/10">
            <AlertCircle className="h-4 w-4 text-yellow-500" />
            <AlertDescription className="text-yellow-700 dark:text-yellow-300">
              You've reached the free plan limit.
              <Button
                variant="link"
                className="p-0 h-auto text-yellow-700 dark:text-yellow-300 underline ml-1"
                onClick={() => router.post('/create-stripe-session')}
              >
                Upgrade to Pro
              </Button>
              to schedule unlimited posts.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0A1020] shadow-sm">
              <CardHeader className="border-b border-gray-300 dark:border-gray-600">
                <CardTitle className="text-gray-800 dark:text-gray-100 flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  Compose Post
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Account Selection */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="account"
                      className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Select Account
                    </Label>
                    <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                      <SelectTrigger className="w-full border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
                        <SelectValue
                          placeholder="Choose an account to post from"
                          className="text-gray-500 dark:text-gray-400"
                        />
                      </SelectTrigger>
                      <SelectContent className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 rounded-lg">
                        {accounts.map((account) => (
                          <SelectItem
                            key={account.id}
                            value={account.id.toString()}
                            className="hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md mx-1"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 text-sm font-medium">
                                {account.displayName?.[0] || account.handle[0]}
                              </div>
                              <div>
                                <div className="font-medium text-gray-900 dark:text-gray-100">
                                  {account.displayName || account.handle}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  @{account.handle}
                                </div>
                              </div>
                              {account.followerCount && (
                                <Badge
                                  variant="outline"
                                  className="ml-auto border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"
                                >
                                  {account.followerCount.toLocaleString()} followers
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.account_id && (
                      <p className="text-sm text-red-500">{errors.account_id}</p>
                    )}
                  </div>

                  {/* Message Input */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="message"
                        className="text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        Post Content
                      </Label>
                      <div className="text-sm text-gray-500">
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

                  {/* Date and Time */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="date"
                        className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2"
                      >
                        <Calendar className="h-4 w-4 text-gray-600 dark:text-gray-400" />
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
                      {errors.schedule_date && (
                        <p className="text-sm text-red-500">{errors.schedule_date}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="time"
                        className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2"
                      >
                        <Clock className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                        Time
                      </Label>
                      <Select value={scheduleTime} onValueChange={setScheduleTime}>
                        <SelectTrigger className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
                          <SelectValue className="text-gray-900 dark:text-gray-100" />
                        </SelectTrigger>
                        <SelectContent className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 rounded-lg">
                          {OPTIMAL_POSTING_TIMES.map((time) => (
                            <SelectItem
                              key={time.time}
                              value={time.time}
                              className="hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md mx-1"
                            >
                              <div className="flex items-center justify-between w-full">
                                <span className="text-gray-900 dark:text-gray-100">
                                  {time.label}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="ml-2 text-xs border-green-200 dark:border-green-800 text-green-600 dark:text-green-400"
                                >
                                  Optimal
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                          {/* Add other times */}
                          {Array.from({ length: 24 }, (_, i) => {
                            const time = `${i.toString().padStart(2, '0')}:00`
                            if (!OPTIMAL_POSTING_TIMES.some((opt) => opt.time === time)) {
                              return (
                                <SelectItem
                                  key={time}
                                  value={time}
                                  className="hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md mx-1"
                                >
                                  <span className="text-gray-900 dark:text-gray-100">
                                    {new Date(`2000-01-01T${time}`).toLocaleTimeString([], {
                                      hour: 'numeric',
                                      minute: '2-digit',
                                      hour12: true,
                                    })}
                                  </span>
                                </SelectItem>
                              )
                            }
                            return null
                          })}
                        </SelectContent>
                      </Select>
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
                    <Alert className="border-red-500/30 bg-red-500/10">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      <AlertDescription className="text-red-700 dark:text-red-300">
                        {errors.general}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Submit Buttons */}
                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowPreview(!showPreview)}
                      className="flex-1"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      {showPreview ? 'Hide Preview' : 'Preview'}
                    </Button>
                    <Button
                      type="submit"
                      disabled={
                        isSubmitting || isFreeLimitReached || !selectedAccount || !message.trim()
                      }
                      className="flex-1 bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-gray-200 text-white dark:text-gray-900"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white dark:border-gray-900 mr-2" />
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

            {/* Preview */}
            {showPreview && message && selectedAccountData && (
              <Card className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0A1020] shadow-sm">
                <CardHeader className="border-b border-gray-300 dark:border-gray-600">
                  <CardTitle className="text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Post Preview
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 font-medium">
                      {selectedAccountData.displayName?.[0] || selectedAccountData.handle[0]}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-gray-800 dark:text-gray-200">
                          {selectedAccountData.displayName || selectedAccountData.handle}
                        </span>
                        <span className="text-gray-500 text-sm">@{selectedAccountData.handle}</span>
                        <span className="text-gray-400 text-sm">
                          · {new Date(`${scheduleDate}T${scheduleTime}`).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                        {message}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Quick Stats */}{' '}
            {selectedAccountData && (
              <Card className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-950 shadow-sm">
                <CardHeader className="border-b border-gray-300 dark:border-gray-600">
                  <CardTitle className="text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Account Stats
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Followers
                      </span>
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        {selectedAccountData.followerCount?.toLocaleString() || 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Platform</span>
                      <Badge
                        variant="outline"
                        className="border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"
                      >
                        {selectedAccountData.platform}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            {/* Content Tips */}
            <Card className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0A1020] shadow-sm">
              <CardHeader className="border-b border-gray-300 dark:border-gray-600">
                <CardTitle className="text-gray-800 dark:text-gray-100 flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Content Tips
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <ul className="space-y-2">
                  {CONTENT_TIPS.map((tip, index) => (
                    <li
                      key={index}
                      className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2"
                    >
                      <span className="text-blue-500 mt-1">•</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            {/* Optimal Times */}
            <Card className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0A1020] shadow-sm">
              <CardHeader className="border-b border-gray-300 dark:border-gray-600">
                <CardTitle className="text-gray-800 dark:text-gray-100 flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Best Times to Post
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-2">
                  {OPTIMAL_POSTING_TIMES.map((time, index) => (
                    <div
                      key={index}
                      className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                        scheduleTime === time.time
                          ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800/60'
                      }`}
                    >
                      <div>
                        <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                          {time.label}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {time.reason}
                        </div>
                      </div>
                      {scheduleTime === time.time && (
                        <CheckCircle className="h-4 w-4 text-blue-500" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  )
}
