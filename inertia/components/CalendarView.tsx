import { useState, useMemo } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { ChevronLeft, ChevronRight, Plus, Clock } from 'lucide-react'

interface CalendarEvent {
  id: number
  date: Date
  time: string
  title: string
  account: string
  status: 'pending' | 'published' | 'failed'
}

interface CalendarViewProps {
  events: CalendarEvent[]
  onAddEvent?: (date: Date) => void
  onEventClick?: (event: CalendarEvent) => void
}

export default function CalendarView({ events, onAddEvent, onEventClick }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  
  const currentMonth = currentDate.getMonth()
  const currentYear = currentDate.getFullYear()
  
  // Get first day of month and number of days
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1)
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0)
  const firstDayWeekday = firstDayOfMonth.getDay()
  const daysInMonth = lastDayOfMonth.getDate()
  
  // Get previous month's last few days
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate()
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  
  // Generate calendar days
  const calendarDays = useMemo(() => {
    const days = []
    
    // Previous month's days
    for (let i = firstDayWeekday - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i
      const date = new Date(currentYear, currentMonth - 1, day)
      days.push({
        day,
        date,
        isCurrentMonth: false,
        isToday: false,
        events: []
      })
    }
    
    // Current month's days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day)
      const today = new Date()
      const isToday = date.toDateString() === today.toDateString()
      
      // Filter events for this date
      const dayEvents = events.filter(event => 
        event.date.toDateString() === date.toDateString()
      )
      
      days.push({
        day,
        date,
        isCurrentMonth: true,
        isToday,
        events: dayEvents
      })
    }
    
    // Next month's days to fill the grid
    const remainingCells = 42 - days.length // 6 weeks * 7 days
    for (let day = 1; day <= remainingCells; day++) {
      const date = new Date(currentYear, currentMonth + 1, day)
      days.push({
        day,
        date,
        isCurrentMonth: false,
        isToday: false,
        events: []
      })
    }
    
    return days
  }, [currentMonth, currentYear, events, daysInMonth, firstDayWeekday, daysInPrevMonth])
  
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1))
  }
  
  const goToNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1))
  }
  
  const goToToday = () => {
    setCurrentDate(new Date())
  }
  
  const getEventColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      case 'published':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
    }
  }
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold">
            {monthNames[currentMonth]} {currentYear}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToToday}
              className="text-sm"
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousMonth}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextMonth}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b">
          {dayNames.map((day) => (
            <div
              key={day}
              className="p-3 text-center text-sm font-medium text-muted-foreground border-r last:border-r-0"
            >
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {calendarDays.map((calendarDay, index) => (
            <div
              key={index}
              className={`
                min-h-[120px] border-r border-b last:border-r-0 p-2
                ${calendarDay.isCurrentMonth 
                  ? 'bg-background' 
                  : 'bg-muted/30'
                }
                ${calendarDay.isToday 
                  ? 'bg-blue-50 dark:bg-blue-950/20' 
                  : ''
                }
                hover:bg-muted/50 transition-colors cursor-pointer
              `}
              onClick={() => calendarDay.isCurrentMonth && onAddEvent?.(calendarDay.date)}
            >
              {/* Day number */}
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`
                    text-sm font-medium
                    ${calendarDay.isCurrentMonth 
                      ? 'text-foreground' 
                      : 'text-muted-foreground'
                    }
                    ${calendarDay.isToday 
                      ? 'bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs' 
                      : ''
                    }
                  `}
                >
                  {calendarDay.day}
                </span>
                
                {/* Add button for current month days */}
                {calendarDay.isCurrentMonth && calendarDay.date >= new Date() && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-5 h-5 p-0 opacity-0 group-hover:opacity-100 hover:bg-blue-500 hover:text-white"
                    onClick={(e) => {
                      e.stopPropagation()
                      onAddEvent?.(calendarDay.date)
                    }}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                )}
              </div>
              
              {/* Events */}
              <div className="space-y-1">
                {calendarDay.events.slice(0, 3).map((event) => (
                  <div
                    key={event.id}
                    className={`
                      px-2 py-1 rounded text-xs font-medium cursor-pointer
                      hover:shadow-sm transition-shadow truncate
                      ${getEventColor(event.status)}
                    `}
                    onClick={(e) => {
                      e.stopPropagation()
                      onEventClick?.(event)
                    }}
                    title={`${event.time} - ${event.title} (@${event.account})`}
                  >
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{event.time}</span>
                    </div>
                    <div className="truncate font-normal text-xs opacity-90 mt-0.5">
                      @{event.account}
                    </div>
                  </div>
                ))}
                
                {/* Show more indicator */}
                {calendarDay.events.length > 3 && (
                  <div className="text-xs text-muted-foreground text-center py-1">
                    +{calendarDay.events.length - 3} more
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
