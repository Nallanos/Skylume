import { useState, useMemo, memo, useCallback, useEffect } from 'react'
import { Head, usePage } from '@inertiajs/react'
import Layout from '../components/Layout'
import { Card, CardContent } from '../components/ui/card'
import { Plus } from 'lucide-react'

import type { ScheduleProps, User, Scheduling, UpcomingDay, WeeklyStats } from '../types/schedule'
import { 
  useScheduleSlots, 
  useScheduleForm, 
  useMediaUpload, 
  useImageCompression,
  useAccountSelection,
  useScheduleOperations 
} from '../hooks/schedule'
import {
  ScheduledPostItem,
  EmptyTimeSlot,
  EditScheduleModal,
  CreateScheduleModal,
  ImageCompressionModal,
  CustomTimesModal,
  ScheduleHeader
} from '../components/schedule'

function Schedule({ schedulings }: ScheduleProps) {
  const { props } = usePage()
  const user = props.user as User
  const accounts = user.account || []

  const scheduleSlots = useScheduleSlots()
  const scheduleForm = useScheduleForm(accounts)
  const accountSelection = useAccountSelection(accounts)
  const mediaUpload = useMediaUpload(accountSelection.isTwitterSelected)
  const imageCompression = useImageCompression()
  const scheduleOps = useScheduleOperations()

  const [editingSchedule, setEditingSchedule] = useState<Scheduling | null>(null)

  const isFreeLimitReached = Boolean(user.plan === 'free' && user.isScheduledLimitReached)

  const sortedSchedulings = useMemo(() => {
    return [...schedulings]
      .filter((schedule) => schedule.status === 'pending')
      .sort((a, b) => new Date(a.scheduleTime).getTime() - new Date(b.scheduleTime).getTime())
  }, [schedulings])

  const groupedSchedulings = useMemo(() => {
    const groups: { [key: string]: Scheduling[] } = {}
    sortedSchedulings.forEach((schedule) => {
      const date = new Date(schedule.scheduleTime)
      const dateKey = date.toISOString().split('T')[0]
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(schedule)
    })
    return groups
  }, [sortedSchedulings])

  const upcomingDays: UpcomingDay[] = useMemo(() => {
    const days = []
    const today = new Date()

    for (let i = 0; i <= 7; i++) {
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

  const weeklyStats: WeeklyStats = useMemo(() => {
    const visiblePosts = upcomingDays.reduce((total, day) => total + day.scheduledPosts.length, 0)
    const remainingPosts = sortedSchedulings.filter(post => {
      const postDate = new Date(post.scheduleTime)
      const weekEndDate = new Date()
      weekEndDate.setDate(weekEndDate.getDate() + 7)
      weekEndDate.setHours(23, 59, 59, 999)
      return postDate > weekEndDate
    })

    return {
      total: sortedSchedulings.length,
      visible: visiblePosts,
      remaining: remainingPosts
    }
  }, [upcomingDays, sortedSchedulings])

  const handleSlotClick = useCallback((date: string, timeSlot: string) => {
    const [time, period] = timeSlot.split(' ')
    const [hours, minutes] = time.split(':').map(Number)
    let adjustedHours = hours

    if (period === 'PM' && hours !== 12) {
      adjustedHours += 12
    } else if (period === 'AM' && hours === 12) {
      adjustedHours = 0
    }

    const scheduleDate = new Date(date)
    scheduleDate.setHours(adjustedHours, minutes, 0, 0)

    if (scheduleDate <= new Date()) {
      alert('Cannot schedule a post in the past. Please select a future time slot.')
      return
    }

    scheduleForm.setSelectedDate(date)
    scheduleForm.setSelectedTimeSlot(timeSlot)
    scheduleForm.openModal()
  }, [scheduleForm])

  const handleCreatePost = async () => {
    let finalDateTime: string
    if (scheduleForm.selectedDate && scheduleForm.selectedTimeSlot) {
      const [time, period] = scheduleForm.selectedTimeSlot.split(' ')
      const [hours, minutes] = time.split(':').map(Number)
      let adjustedHours = hours

      if (period === 'PM' && hours !== 12) {
        adjustedHours += 12
      } else if (period === 'AM' && hours === 12) {
        adjustedHours = 0
      }

      const scheduleDate = new Date(scheduleForm.selectedDate)
      scheduleDate.setHours(adjustedHours, minutes, 0, 0)
      finalDateTime = scheduleDate.toISOString()
    } else {
      finalDateTime = new Date(scheduleForm.addDateTime).toISOString()
    }

    const success = await scheduleOps.saveAdd({
      message: scheduleForm.addMessage,
      scheduleTime: finalDateTime,
      selectedAccountIds: accountSelection.selectedAccountIds,
      images: mediaUpload.selectedImages,
      videos: mediaUpload.selectedVideos,
      imageAltTexts: mediaUpload.imageAltTexts,
      videoAltTexts: mediaUpload.videoAltTexts,
      contentWarnings: mediaUpload.contentWarnings,
      explicitLinks: scheduleForm.explicitLinks,
    })

    if (success) {
      scheduleForm.resetForm()
      accountSelection.clearAllAccounts()
      mediaUpload.resetMedia()
      scheduleForm.closeModal()
    }
  }

  const handleCompressImages = async () => {
    await imageCompression.handleCompressOversizedImages(
      mediaUpload.oversizedImages,
      (compressedFiles, compressedPreviews) => {
        mediaUpload.setSelectedImages(prev => [...prev, ...compressedFiles])
        mediaUpload.setImagePreviews(prev => [...prev, ...compressedPreviews])
        mediaUpload.setImageAltTexts(prev => [...prev, ...new Array(compressedFiles.length).fill('')])
        mediaUpload.setOversizedImages([])
      }
    )
  }

  useEffect(() => {
    if (mediaUpload.oversizedImages.length > 0) {
      imageCompression.setShowCompressionModal(true)
    }
  }, [mediaUpload.oversizedImages])

  useEffect(() => {
    if (!scheduleForm.showAddModal) return

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

      if (imageFiles.length > 0 && mediaUpload.selectedImages.length < 4) {
        const fileList = new DataTransfer()
        imageFiles.forEach((file) => fileList.items.add(file))
        await mediaUpload.handleMediaSelect(fileList.files)
      }
    }

    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [scheduleForm.showAddModal, mediaUpload.selectedImages.length, mediaUpload.handleMediaSelect])

  return (
    <>
      <Head title="Schedule Queue" />
      <Layout user={user}>
        <div className="space-y-6">
          <ScheduleHeader
            weeklyStats={weeklyStats}
            user={user}
            isFreeLimitReached={isFreeLimitReached}
            onSchedulePost={scheduleForm.openModal}
            onCustomTimes={() => scheduleSlots.setShowCustomTimesModal(true)}
          />

          <div className="space-y-6">
            {upcomingDays.map((day) => (
              <div key={day.date} className="space-y-3">
                <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                  <h2 className="text-lg font-semibold text-foreground">{day.displayName}</h2>
                </div>

                <div className="space-y-2">
                  {day.scheduledPosts.map((post) => (
                    <ScheduledPostItem
                      key={`post-${post.id}`}
                      post={post}
                      onEdit={setEditingSchedule}
                      onDelete={scheduleOps.deleteSchedule}
                    />
                  ))}

                  {useMemo(() => {
                    const activeSlotsForDay = scheduleSlots.getActiveSlotsForDay(day.date)

                    if (activeSlotsForDay.length === 0) return null

                    const usedSlots = day.scheduledPosts.map((post) => {
                      return new Date(post.scheduleTime).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                      })
                    })

                    const availableSlots = activeSlotsForDay.filter((slot) => {
                      if (usedSlots.includes(slot)) return false

                      const [time, period] = slot.split(' ')
                      const [hours, minutes] = time.split(':').map(Number)
                      let adjustedHours = hours

                      if (period === 'PM' && hours !== 12) {
                        adjustedHours += 12
                      } else if (period === 'AM' && hours === 12) {
                        adjustedHours = 0
                      }

                      const scheduleDate = new Date(day.date)
                      scheduleDate.setHours(adjustedHours, minutes, 0, 0)

                      return scheduleDate > new Date()
                    })

                    return availableSlots.map((timeSlot) => (
                      <EmptyTimeSlot
                        key={`empty-${timeSlot}`}
                        timeSlot={timeSlot}
                        date={day.date}
                        isFreeLimitReached={isFreeLimitReached}
                        onSlotClick={handleSlotClick}
                      />
                    ))
                  }, [day.scheduledPosts, day.date, isFreeLimitReached, handleSlotClick, scheduleSlots.getActiveSlotsForDay])}
                </div>
              </div>
            ))}

            {weeklyStats.remaining.length > 0 && (
              <div className="space-y-3">
                <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                  <h2 className="text-lg font-semibold text-foreground">Later ({weeklyStats.remaining.length} posts)</h2>
                  <p className="text-sm text-muted-foreground">Posts scheduled beyond this week</p>
                </div>

                <div className="grid gap-3">
                  {weeklyStats.remaining.map((schedule) => (
                    <ScheduledPostItem
                      key={schedule.id}
                      post={schedule}
                      onEdit={setEditingSchedule}
                      onDelete={scheduleOps.deleteSchedule}
                    />
                  ))}
                </div>
              </div>
            )}

            <Card
              className="border-dashed border-2 border-blue-300 dark:border-blue-600 hover:border-blue-500 dark:hover:border-blue-400 transition-colors cursor-pointer group"
              onClick={() => !isFreeLimitReached && scheduleForm.openModal()}
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

          <EditScheduleModal
            schedule={editingSchedule}
            onClose={() => setEditingSchedule(null)}
            onSave={scheduleOps.saveEdit}
          />

          <CreateScheduleModal
            isOpen={scheduleForm.showAddModal}
            onClose={() => {
              scheduleForm.closeModal()
              scheduleForm.resetForm()
              accountSelection.clearAllAccounts()
              mediaUpload.resetMedia()
            }}
            accounts={accounts}
            message={scheduleForm.addMessage}
            setMessage={scheduleForm.setAddMessage}
            messageTextareaRef={scheduleForm.messageTextareaRef}
            selectedAccountIds={accountSelection.selectedAccountIds}
            currentSelectValue={accountSelection.currentSelectValue}
            setCurrentSelectValue={accountSelection.setCurrentSelectValue}
            accountOptions={accountSelection.accountOptions}
            onSelectAccount={accountSelection.selectAccount}
            onDeselectAccount={accountSelection.deselectAccount}
            onSelectAllAccounts={accountSelection.selectAllAccounts}
            onClearAllAccounts={accountSelection.clearAllAccounts}
            isTwitterSelected={accountSelection.isTwitterSelected}
            isOnlyBlueskySelected={accountSelection.isOnlyBlueskySelected}
            previewAccount={accountSelection.previewAccount}
            selectedDate={scheduleForm.selectedDate}
            selectedTimeSlot={scheduleForm.selectedTimeSlot}
            addDateTime={scheduleForm.addDateTime}
            setAddDateTime={scheduleForm.setAddDateTime}
            getCurrentDateTime={scheduleForm.getCurrentDateTime}
            explicitLinks={scheduleForm.explicitLinks}
            setExplicitLinks={scheduleForm.setExplicitLinks}
            onLinkInsert={scheduleForm.handleLinkInsert}
            onInsertHashtags={scheduleForm.insertHashtags}
            selectedImages={mediaUpload.selectedImages}
            selectedVideos={mediaUpload.selectedVideos}
            imagePreviews={mediaUpload.imagePreviews}
            imageAltTexts={mediaUpload.imageAltTexts}
            videoAltTexts={mediaUpload.videoAltTexts}
            videoValidationError={mediaUpload.videoValidationError}
            fileInputRef={mediaUpload.fileInputRef}
            onMediaSelect={mediaUpload.handleMediaSelect}
            onRemoveImage={mediaUpload.removeImage}
            onRemoveVideo={mediaUpload.removeVideo}
            onClearAllMedia={mediaUpload.clearAllMedia}
            onUpdateImageAltText={mediaUpload.updateAltText}
            onUpdateVideoAltText={mediaUpload.updateVideoAltText}
            contentWarnings={mediaUpload.contentWarnings}
            onContentWarningsChange={mediaUpload.setContentWarnings}
            onSave={handleCreatePost}
            isFormValid={scheduleForm.isFormValid}
          />

          <ImageCompressionModal
            isOpen={imageCompression.showCompressionModal}
            oversizedImages={mediaUpload.oversizedImages}
            onCompress={handleCompressImages}
            onCancel={() => {
              imageCompression.setShowCompressionModal(false)
              mediaUpload.setOversizedImages([])
            }}
            isCompressing={imageCompression.isCompressing}
          />

          <CustomTimesModal
            isOpen={scheduleSlots.showCustomTimesModal}
            customTimes={scheduleSlots.customTimes}
            scheduledSlots={scheduleSlots.scheduledSlots}
            newCustomTime={scheduleSlots.newCustomTime}
            setNewCustomTime={scheduleSlots.setNewCustomTime}
            onAddTime={scheduleSlots.addCustomTime}
            onRemoveTime={scheduleSlots.removeCustomTime}
            onToggleDay={scheduleSlots.toggleDay}
            onSave={async () => {
              const success = await scheduleSlots.saveCustomTimes()
              if (success) {
                scheduleSlots.setShowCustomTimesModal(false)
              }
            }}
            onCancel={() => scheduleSlots.setShowCustomTimesModal(false)}
          />
        </div>
      </Layout>
    </>
  )
}

export default memo(Schedule)
