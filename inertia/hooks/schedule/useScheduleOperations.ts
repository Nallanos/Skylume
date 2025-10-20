import { useCallback } from 'react'
import { router } from '@inertiajs/react'
import type { Scheduling, ScheduleFormData } from '../../types/schedule'
import { isDateInPast } from '../../utils/schedule/dateTime'

export const useScheduleOperations = () => {
  const deleteSchedule = useCallback(async (schedule_id: number) => {
    if (!confirm('Are you sure you want to delete this scheduled post?')) return
    await router.put('/schedule/delete', { scheduleId: schedule_id })
  }, [])

  const saveEdit = useCallback(async (
    schedule: Scheduling,
    localDateTime: string
  ) => {
    if (isDateInPast(localDateTime)) {
      alert('Cannot schedule a post in the past. Please select a future date and time.')
      return false
    }

    const localDate = new Date(localDateTime)

    const payload = {
      scheduleId: schedule.id,
      message: schedule.message,
      schedule_time: localDate.toISOString(),
    }

    await router.put('/schedule/edit', payload)
    return true
  }, [])

  const saveAdd = useCallback(async (formData: ScheduleFormData) => {
    if (!formData.message.trim() || !formData.scheduleTime || formData.selectedAccountIds.length === 0) {
      return false
    }

    if (isDateInPast(formData.scheduleTime)) {
      alert('Cannot schedule a post in the past. Please select a future date and time.')
      return false
    }

    const formDataToSend = new FormData()
    formDataToSend.append('message', formData.message)
    formDataToSend.append('schedule_time', formData.scheduleTime)
    formDataToSend.append('selected_accounts', JSON.stringify(formData.selectedAccountIds))

    formData.images.forEach((image) => {
      formDataToSend.append('images[]', image)
    })

    if (formData.imageAltTexts.length > 0) {
      formDataToSend.append('image_alt_texts', JSON.stringify(formData.imageAltTexts))
    }

    formData.videos.forEach((video) => {
      formDataToSend.append('videos[]', video)
    })

    if (formData.videoAltTexts.length > 0) {
      formDataToSend.append('video_alt_texts', JSON.stringify(formData.videoAltTexts))
    }

    if (formData.contentWarnings.length > 0) {
      formDataToSend.append('content_warnings', JSON.stringify(formData.contentWarnings))
    }

    if (formData.explicitLinks.length > 0) {
      formDataToSend.append('explicit_links', JSON.stringify(formData.explicitLinks))
    }

    try {
      await router.post('/schedule/create', formDataToSend)
      console.log(`Successfully scheduled crosspost for ${formData.selectedAccountIds.length} accounts`)
      return true
    } catch (error) {
      console.error('Failed to schedule crosspost:', error)
      return false
    }
  }, [])

  return {
    deleteSchedule,
    saveEdit,
    saveAdd,
  }
}
