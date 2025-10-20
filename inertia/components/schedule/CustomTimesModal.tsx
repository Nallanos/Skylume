import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import { Plus, Trash2, Calendar } from 'lucide-react'
import { timeToMinutes } from '../../utils/schedule/dateTime'
import type { TimeSlotConfig } from '../../types/schedule'

interface CustomTimesModalProps {
  isOpen: boolean
  customTimes: string[]
  scheduledSlots: TimeSlotConfig
  newCustomTime: string
  setNewCustomTime: (value: string) => void
  onAddTime: () => void
  onRemoveTime: (time: string) => void
  onToggleDay: (timeSlot: string, day: string) => void
  onSave: () => Promise<void>
  onCancel: () => void
}

export const CustomTimesModal = ({
  isOpen,
  customTimes,
  scheduledSlots,
  newCustomTime,
  setNewCustomTime,
  onAddTime,
  onRemoveTime,
  onToggleDay,
  onSave,
  onCancel
}: CustomTimesModalProps) => {
  if (!isOpen) return null

  const handleSave = async () => {
    await onSave()
  }

  const handleAddTime = () => {
    onAddTime()
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Custom Posting Schedule
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Configure your personalized posting times for each day of the week
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Organization time zone
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Current time: {new Date().toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  })}
                </p>
              </div>
              <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
                {Intl.DateTimeFormat().resolvedOptions().timeZone}
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Weekly posting times</h3>

            <div className="grid grid-cols-8 gap-2 mb-4">
              <div className="text-sm font-medium text-muted-foreground p-3">Time</div>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                <div key={day} className="text-center">
                  <span className="text-sm font-medium text-muted-foreground">{day}</span>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              {customTimes
                .sort((a, b) => timeToMinutes(a) - timeToMinutes(b))
                .map((time, timeIndex) => (
                  <div key={timeIndex} className="grid grid-cols-8 gap-2 items-center">
                    <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded">
                      <span className="text-sm font-medium flex-1">{time}</span>
                      <button
                        onClick={() => onRemoveTime(time)}
                        className="text-red-500 hover:text-red-700 dark:text-red-400"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>

                    {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                      <div key={day} className="flex justify-center">
                        <button
                          onClick={() => onToggleDay(time, day)}
                          className={`w-8 h-8 rounded-full border-2 transition-colors ${
                            scheduledSlots[time]?.[day]
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
                          }`}
                        >
                          {scheduledSlots[time]?.[day] && (
                            <svg className="w-4 h-4 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                ))}
            </div>

            <div className="mt-6 p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
              <div className="flex items-center gap-3">
                <Plus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <Input
                  type="text"
                  placeholder="Add time (e.g., 9:30 AM)"
                  value={newCustomTime}
                  onChange={(e) => setNewCustomTime(e.target.value)}
                  className="flex-1"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddTime()
                    }
                  }}
                />
                <Button
                  onClick={handleAddTime}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Add
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Enter time in 12-hour format (e.g., 9:30 AM, 2:15 PM)
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSave}
              className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
            >
              Save changes
            </Button>
            <Button
              variant="outline"
              onClick={onCancel}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
