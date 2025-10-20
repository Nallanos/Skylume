export const getCurrentDateTime = (): string => {
  const now = new Date()
  now.setMinutes(now.getMinutes() + 5)
  return now.toISOString().slice(0, 16)
}

export const isDateInPast = (dateTimeString: string): boolean => {
  const selectedDate = new Date(dateTimeString)
  const now = new Date()
  return selectedDate <= now
}

export const timeToMinutes = (timeStr: string): number => {
  const [time, period] = timeStr.split(' ')
  const [hours, minutes] = time.split(':').map(Number)

  let adjustedHours = hours
  if (period === 'PM' && hours !== 12) {
    adjustedHours += 12
  } else if (period === 'AM' && hours === 12) {
    adjustedHours = 0
  }

  return adjustedHours * 60 + minutes
}

export const formatScheduleTime = (date: Date): string => {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export const parseDateTimeLocal = (dateTimeString: string): Date => {
  return new Date(dateTimeString)
}

export const formatDateTimeLocal = (date: Date): string => {
  return date.toISOString().slice(0, 16)
}
