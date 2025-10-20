import { useState, useEffect } from 'react'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import RichTextHighlightTextarea from '../RichTextHighlightTextarea'
import type { Scheduling } from '../../types/schedule'
import { formatDateTimeLocal, getCurrentDateTime } from '../../utils/schedule/dateTime'

interface EditScheduleModalProps {
  schedule: Scheduling | null
  onClose: () => void
  onSave: (schedule: Scheduling, localDateTime: string) => Promise<boolean>
}

export const EditScheduleModal = ({ schedule, onClose, onSave }: EditScheduleModalProps) => {
  const [editingSchedule, setEditingSchedule] = useState<Scheduling | null>(null)
  const [localDateTime, setLocalDateTime] = useState('')

  useEffect(() => {
    if (schedule) {
      setEditingSchedule({ ...schedule })
      const date = new Date(schedule.scheduleTime)
      setLocalDateTime(formatDateTimeLocal(date))
    }
  }, [schedule])

  const handleSave = async () => {
    if (!editingSchedule) return

    const success = await onSave(editingSchedule, localDateTime)
    if (success) {
      onClose()
    }
  }

  if (!schedule || !editingSchedule) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg mx-4">
        <CardHeader>
          <CardTitle>Edit Scheduled Post</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="message" className="text-sm font-medium">
              Message
            </Label>
            <RichTextHighlightTextarea
              value={editingSchedule.message}
              onChange={(newMessage) =>
                setEditingSchedule({
                  ...editingSchedule,
                  message: newMessage,
                })
              }
              placeholder="What's on your mind?"
              rows={6}
              className="mt-1 min-h-[150px] w-full px-3 py-2 text-sm bg-background border border-input rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              showPreview={true}
            />
          </div>

          <div>
            <Label htmlFor="datetime" className="text-sm font-medium">
              Schedule Time
            </Label>
            <Input
              id="datetime"
              type="datetime-local"
              value={localDateTime}
              onChange={(e) => setLocalDateTime(e.target.value)}
              min={getCurrentDateTime()}
              className="mt-1"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button onClick={handleSave} className="flex-1 bg-blue-500">
              Save Changes
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
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
