import { useState, useMemo } from 'react'
import { Head, usePage, router } from '@inertiajs/react'
import Layout from '../components/Layout'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { ChevronLeft, ChevronRight, Plus, Trash, Lock, Edit } from 'lucide-react'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'

interface Scheduling {
  id: number
  account_id: number
  message: string
  scheduleTime: string
  account?: {
    handle: string
    displayName: string
  }
}

interface User {
  id: number
  email: string
  plan?: string
  isScheduledLimitReached?: boolean
}

interface ScheduleProps {
  schedulings: Scheduling[]
}

function Schedule({ schedulings }: ScheduleProps) {
  const { props } = usePage()
  const user = props.user as User

  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - date.getDay() + 1)
    return date
  })

  const [selectedScheduling, setSelectedScheduling] = useState<Scheduling | null>(null)
  const [editingSchedule, setEditingSchedule] = useState<Scheduling | null>(null)
  const [localDateTime, setLocalDateTime] = useState('')

  const isFreeLimitReached = user.plan === 'free' && user.isScheduledLimitReached

  const dateFormatter = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short' })
  const timeFormatter = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' })
  const weekRangeFormatter = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' })

  const daysOfWeek = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(currentWeekStart)
      date.setDate(date.getDate() + i)
      return date
    })
  }, [currentWeekStart])

  const groupedSchedulings = useMemo(() => {
    const groups: Scheduling[][] = []
    const sortedItems = [...schedulings].sort(
      (a, b) => new Date(a.scheduleTime).getTime() - new Date(b.scheduleTime).getTime()
    )

    for (const item of sortedItems) {
      const itemTime = new Date(item.scheduleTime)
      let added = false

      for (const group of groups) {
        const lastItemTime = new Date(group[group.length - 1].scheduleTime)

        if (itemTime.getTime() - lastItemTime.getTime() <= 70 * 60 * 1000) {
          group.push(item)
          added = true
          break
        }
      }

      if (!added) {
        groups.push([item])
      }
    }

    return groups
  }, [schedulings])

  async function deleteSchedule(schedule_id: number) {
    await router.put('/schedule/delete', { schedule_id })
    setSelectedScheduling(null)
  }

  async function saveEdit() {
    if (!editingSchedule) return

    const utcDate = new Date(localDateTime)
    utcDate.setMinutes(utcDate.getMinutes() + utcDate.getTimezoneOffset())

    const payload = {
      id: editingSchedule.id,
      account_id: editingSchedule.account_id,
      message: editingSchedule.message,
      schedule_time: utcDate.toISOString(),
    }

    await router.put('/schedule/edit', payload)
    setEditingSchedule(null)
    setSelectedScheduling(null)
  }

  function handleWeekNavigation(weeks: number) {
    const newDate = new Date(currentWeekStart)
    newDate.setDate(newDate.getDate() + weeks * 7)
    setCurrentWeekStart(newDate)
  }

  function startEdit(schedule: Scheduling) {
    setEditingSchedule({ ...schedule })
    const date = new Date(schedule.scheduleTime)
    const localISOString = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16)
    setLocalDateTime(localISOString)
  }

  return (
    <>
      <Head title="Schedule" />
      <Layout user={user}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Schedule
              </h1>
              <p className="text-muted-foreground mt-1">Manage your scheduled posts</p>
            </div>

            <div className="flex items-center gap-2">
              {isFreeLimitReached && (
                <div className="flex items-center gap-2 text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-3 py-1 rounded-md text-sm">
                  <Lock className="h-4 w-4" />
                  Free limit reached
                </div>
              )}

              <Button
                size="sm"
                disabled={isFreeLimitReached}
                className="bg-blue-500 hover:bg-blue-600"
                asChild
              >
                <a href="/add/schedule">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Schedule
                </a>
              </Button>
            </div>
          </div>

          {/* Week Navigation */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={() => handleWeekNavigation(-1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <CardTitle className="text-lg">
                  {weekRangeFormatter.format(currentWeekStart)}
                </CardTitle>

                <Button variant="outline" size="sm" onClick={() => handleWeekNavigation(1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-2 mb-4">
                {daysOfWeek.map((day, index) => (
                  <div key={index} className="text-center p-2 border rounded-lg bg-muted/30">
                    <div className="font-medium text-sm">
                      {day.toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                    <div className="text-xs text-muted-foreground">{dateFormatter.format(day)}</div>
                  </div>
                ))}
              </div>

              {/* Scheduled Posts */}
              <div className="space-y-4">
                {groupedSchedulings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No scheduled posts for this week</p>
                  </div>
                ) : (
                  groupedSchedulings.map((group, groupIndex) => (
                    <Card key={groupIndex} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          {group.map((schedule) => (
                            <div
                              key={schedule.id}
                              className="flex items-start justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-medium">
                                    @{schedule.account?.handle || 'Unknown'}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {timeFormatter.format(new Date(schedule.scheduleTime))}
                                  </span>
                                </div>
                                <p className="text-sm text-muted-foreground truncate">
                                  {schedule.message}
                                </p>
                              </div>

                              <div className="flex items-center gap-1 ml-3">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => startEdit(schedule)}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteSchedule(schedule.id)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <Trash className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Edit Modal */}
          {editingSchedule && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <Card className="w-full max-w-md mx-4">
                <CardHeader>
                  <CardTitle>Edit Schedule</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="message">Message</Label>
                    <textarea
                      id="message"
                      className="w-full p-2 border rounded-md resize-none h-20"
                      value={editingSchedule.message}
                      onChange={(e) =>
                        setEditingSchedule({
                          ...editingSchedule,
                          message: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="datetime">Schedule Time</Label>
                    <Input
                      id="datetime"
                      type="datetime-local"
                      value={localDateTime}
                      onChange={(e) => setLocalDateTime(e.target.value)}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={saveEdit} className="flex-1">
                      Save
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setEditingSchedule(null)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </Layout>
    </>
  )
}

export default Schedule
