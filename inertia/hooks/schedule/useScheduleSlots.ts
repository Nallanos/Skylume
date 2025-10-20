import { useState, useEffect, useCallback } from 'react'
import type { TimeSlotConfig } from '../../types/schedule'
import { timeToMinutes } from '../../utils/schedule/dateTime'

const DEFAULT_SLOTS: TimeSlotConfig = {
  '9:00 AM': { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: false, sunday: false },
  '12:00 PM': { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: true },
  '3:00 PM': { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: true },
  '6:00 PM': { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: false, sunday: false },
  '8:00 PM': { monday: false, tuesday: false, wednesday: false, thursday: false, friday: false, saturday: true, sunday: true }
}

export const useScheduleSlots = () => {
  const [customTimes, setCustomTimes] = useState<string[]>(['9:00 AM', '12:00 PM', '3:00 PM', '6:00 PM', '8:00 PM'])
  const [scheduledSlots, setScheduledSlots] = useState<TimeSlotConfig>(DEFAULT_SLOTS)
  const [newCustomTime, setNewCustomTime] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [showCustomTimesModal, setShowCustomTimesModal] = useState(false)

  useEffect(() => {
    loadScheduleSlots()
  }, [])

  const loadScheduleSlots = async () => {
    try {
      const response = await fetch('/api/schedule-slots', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()

        if (data.scheduleSlots && data.scheduleSlots.length > 0) {
          const newCustomTimes: string[] = []
          const newScheduledSlots: TimeSlotConfig = {}

          data.scheduleSlots.forEach((slot: any) => {
            const timeSlot = slot.timeSlot
            if (!newCustomTimes.includes(timeSlot)) {
              newCustomTimes.push(timeSlot)
            }

            newScheduledSlots[timeSlot] = {
              monday: slot.monday,
              tuesday: slot.tuesday,
              wednesday: slot.wednesday,
              thursday: slot.thursday,
              friday: slot.friday,
              saturday: slot.saturday,
              sunday: slot.sunday
            }
          })

          setCustomTimes(newCustomTimes)
          setScheduledSlots(newScheduledSlots)
        }
      }
    } catch (error) {
      console.error('Error loading schedule slots:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getActiveSlotsForDay = useCallback((date: string) => {
    const dayOfWeek = new Date(date).getDay()
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const dayName = dayNames[dayOfWeek]

    return customTimes.filter(time => scheduledSlots[time]?.[dayName]).sort((a, b) => {
      return timeToMinutes(a) - timeToMinutes(b)
    })
  }, [customTimes, scheduledSlots])

  const addCustomTime = useCallback(() => {
    if (!newCustomTime.trim()) return

    const timeRegex = /^(1[0-2]|0?[1-9]):([0-5][0-9])\s?(AM|PM)$/i
    if (!timeRegex.test(newCustomTime.trim())) {
      alert('Please enter time in format: HH:MM AM/PM (e.g., 9:30 AM)')
      return
    }

    const formattedTime = newCustomTime.trim().toUpperCase()
    if (!customTimes.includes(formattedTime)) {
      setCustomTimes(prev => [...prev, formattedTime].sort((a, b) => {
        return timeToMinutes(a) - timeToMinutes(b)
      }))

      setScheduledSlots(prev => ({
        ...prev,
        [formattedTime]: {
          monday: true,
          tuesday: true,
          wednesday: true,
          thursday: true,
          friday: true,
          saturday: true,
          sunday: true
        }
      }))
    }
    setNewCustomTime('')
  }, [newCustomTime, customTimes])

  const removeCustomTime = useCallback((timeToRemove: string) => {
    setCustomTimes(prev => prev.filter(time => time !== timeToRemove))
    setScheduledSlots(prev => {
      const newSlots = { ...prev }
      delete newSlots[timeToRemove]
      return newSlots
    })
  }, [])

  const toggleDay = useCallback((timeSlot: string, day: string) => {
    setScheduledSlots(prev => ({
      ...prev,
      [timeSlot]: {
        ...prev[timeSlot],
        [day]: !prev[timeSlot]?.[day]
      }
    }))
  }, [])

  const saveCustomTimes = useCallback(async () => {
    try {
      const response = await fetch('/api/schedule-slots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scheduleSlots: scheduledSlots
        })
      })

      if (response.ok) {
        console.log('Schedule slots saved successfully')
        return true
      } else {
        console.error('Failed to save schedule slots')
        return false
      }
    } catch (error) {
      console.error('Error saving schedule slots:', error)
      return false
    }
  }, [scheduledSlots])

  return {
    customTimes,
    scheduledSlots,
    newCustomTime,
    setNewCustomTime,
    isLoading,
    showCustomTimesModal,
    setShowCustomTimesModal,
    getActiveSlotsForDay,
    addCustomTime,
    removeCustomTime,
    toggleDay,
    saveCustomTimes,
  }
}
