<script lang="ts">
  import Sidebar from '@/components/Sidebar.svelte'
  import { page, router } from '@inertiajs/svelte'
  import { Button } from '@/ui/button'
  import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card'
  import { Table, TableBody, TableCell, TableRow } from '@/ui/table'
  import { Popover, PopoverContent, PopoverTrigger } from '@/ui/popover'
  import { ChevronLeft, ChevronRight, Plus, Trash } from 'lucide-svelte'
  import { Input } from '@/ui/input'
  import { Label } from '@/ui/label'
  import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/ui/dialog'
  import type User from '#models/user'
  import type Account from '#models/account'
  import type Scheduling from '#models/scheduling'

  export let schedulings: Scheduling[] = []

  const user = $page.props.user as User
  const accounts = user.account as unknown as Account[]

  let currentWeekStart = new Date()
  currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay() + 1)
  let selectedScheduling: Scheduling | null = null
  let menuPosition: { x: number; y: number } | null = null
  let editingSchedule: Scheduling | null = null
  let localDateTime = ''

  const dateFormatter = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short' })
  const timeFormatter = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' })
  const weekRangeFormatter = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' })

  $: daysOfWeek = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(currentWeekStart)
    date.setDate(date.getDate() + i)
    return date
  })

  $: groupedSchedulings = groupByTimeSlot(schedulings)

  function groupByTimeSlot(items: Scheduling[]): Scheduling[][] {
    const groups: Scheduling[][] = []

    items.sort((a, b) => new Date(a.scheduleTime).getTime() - new Date(b.scheduleTime).getTime())

    for (const item of items) {
      const itemTime = new Date(item.scheduleTime).toLocaleString()
      let added = false

      for (const group of groups) {
        const lastItemTime = new Date(group[group.length - 1].scheduleTime).toLocaleString()

        if (new Date(itemTime).getTime() - new Date(lastItemTime).getTime() <= 70 * 60 * 1000) {
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
  }

  async function deleteSchedule(schedule_id: number) {
    await router.put('/schedule/delete', { schedule_id })
    selectedScheduling = null
  }

  // function openEditModal(schedule: Scheduling) {
  //   editingSchedule = { ...schedule }
  //   const date = new Date(schedule.scheduleTime)
  //   localDateTime = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  //     .toISOString()
  //     .slice(0, 16)
  // }

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
    schedulings = schedulings.map((s) =>
      s.id === editingSchedule?.id
        ? { ...editingSchedule, scheduleTime: utcDate.toLocaleString() }
        : s
    )

    editingSchedule = null
    selectedScheduling = null
  }

  function handleWeekNavigation(weeks: number) {
    const newDate = new Date(currentWeekStart)
    newDate.setDate(newDate.getDate() + weeks * 7)
    currentWeekStart = newDate
  }

  function handleCardClick(scheduling: Scheduling, event: MouseEvent | KeyboardEvent) {
    selectedScheduling = scheduling
    if (event instanceof MouseEvent) {
      menuPosition = { x: event.clientX, y: event.clientY }
    } else {
      const target = event.currentTarget as HTMLElement
      const rect = target.getBoundingClientRect()
      menuPosition = { x: rect.left, y: rect.top }
    }
  }

  function formatScheduleTime(dateString: string) {
    const date = new Date(dateString)
    const now = new Date()
    return {
      date: dateFormatter.format(date),
      time: timeFormatter.format(date),
      fullDate: date.toLocaleDateString('en-US'),
      isPast: date < now,
    }
  }

  function truncate(text: string, length: number) {
    return text.length > length ? text.substring(0, length) + '...' : text
  }
</script>

<div class="flex h-screen w-screen">
  <div class="h-screen">
    <Sidebar {user} {accounts} />
  </div>

  <div class="flex-1 flex flex-col p-8 space-y-8 overflow-auto">
    <Dialog open={!!editingSchedule} on:close={() => (editingSchedule = null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Schedule</DialogTitle>
        </DialogHeader>

        {#if editingSchedule}
          <div class="space-y-4">
            <div>
              <Label for="message">Message</Label>
              <Input id="message" bind:value={editingSchedule.message} class="w-full" />
            </div>

            <div>
              <Label for="schedule-time">Date and Time</Label>
              <Input
                type="datetime-local"
                id="schedule-time"
                bind:value={localDateTime}
                class="w-full"
              />
            </div>

            <div class="flex justify-end gap-2">
              <Button variant="outline" on:click={() => (editingSchedule = null)}>Cancel</Button>
              <Button on:click={saveEdit}>Save</Button>
            </div>
          </div>
        {/if}
      </DialogContent>
    </Dialog>

    <div class="flex flex-col md:flex-row gap-4 justify-between items-start">
      <Card class="border border-gray-800 w-full">
        <CardHeader class="flex flex-row items-center justify-between px-4 py-3 lg:px-6 lg:py-4">
          <CardTitle class="text-lg lg:text-xl font-semibold">
            {weekRangeFormatter.format(currentWeekStart)}
          </CardTitle>
          <div class="flex gap-2">
            <Button variant="outline" size="sm" on:click={() => handleWeekNavigation(-1)}>
              <ChevronLeft class="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" on:click={() => handleWeekNavigation(1)}>
              <ChevronRight class="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Button href="/add/schedule" class="w-full md:w-auto">
        <Plus class="mr-2 h-4 w-4" />
        New Schedule
      </Button>
    </div>

    <div class="flex-1 flex flex-col lg:flex-row gap-4 lg:gap-8">
      <div class="flex-1 flex flex-col overflow-hidden rounded-xl border-gray-800 border">
        <div class="grid grid-cols-7 gap-px border-b border-gray-800 bg-gray-900">
          {#each daysOfWeek as day}
            <div class="p-2 lg:p-3 group relative bg-background">
              <div class="flex items-center justify-between">
                <div>
                  <div class="text-xs lg:text-sm font-semibold uppercase">
                    {day.toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                  <div class="text-[0.65rem] lg:text-xs mt-0.5">
                    {day.getDate()}
                    {day.toLocaleDateString('en-US', { month: 'short' })}
                  </div>
                </div>
                <Button variant="ghost" class="opacity-0 group-hover:opacity-100 h-6 w-6">
                  <Plus class="h-3 w-3" />
                </Button>
              </div>
              {#if day.toDateString() === new Date().toDateString()}
                <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              {/if}
            </div>
          {/each}
        </div>

        <div class="flex-1 relative overflow-auto h-[500px] lg:h-[600px]">
          <div class="grid grid-cols-7 auto-rows-min gap-px">
            {#each Array.from({ length: 24 }, (_, i) => i) as hour}
              <div class="col-span-full h-16 border-t border-gray-800 relative">
                <div
                  class="absolute -top-2 left-0 text-[0.65rem] pl-1 px-1 py-0.5 rounded-full bg-muted"
                >
                  {hour.toString().padStart(2, '0')}:00
                </div>
              </div>
            {/each}

            {#each groupedSchedulings as group}
              {@const firstScheduling = group[0]}
              {@const formattedDate = formatScheduleTime(firstScheduling.scheduleTime)}
              {@const isPast = formattedDate.isPast}
              {@const date = new Date(firstScheduling.scheduleTime)}
              {@const dayIndex = daysOfWeek.findIndex(
                (d) => d.toDateString() === date.toDateString()
              )}

              {#if dayIndex !== -1}
                <div
                  class="absolute w-[calc(14.28%-8px)] mx-1 rounded-lg p-2 cursor-pointer"
                  style="height: 70px; top: {date.getHours() * 64 +
                    (date.getMinutes() / 60) * 64 +
                    5}px; left: {dayIndex * 14.28}%"
                >
                  {#if group.length > 1}
                    <Popover>
                      <PopoverTrigger>
                        <button
                          class="border-2 border-yellow-500 bg-yellow-500/10 p-2 hover:border-yellow-400 transition-all h-full rounded flex items-center justify-center text-sm text-yellow-300"
                          on:click|stopPropagation
                        >
                          {group.length} posts
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        class="w-64 p-2"
                        style="position: absolute; left: {menuPosition?.x}px; top: {menuPosition?.y}px"
                      >
                        <div class="space-y-2">
                          {#each group as scheduling}
                            <button
                              class="p-2 rounded hover:bg-accent cursor-pointer"
                              on:click|stopPropagation={() => (selectedScheduling = scheduling)}
                            >
                              <div class="text-xs font-medium">
                                {truncate(scheduling.message, 30)}
                              </div>
                              <div class="text-xs text-muted-foreground">
                                {timeFormatter.format(
                                  new Date(new Date(scheduling.scheduleTime).toLocaleTimeString())
                                )}
                              </div>
                            </button>
                          {/each}
                        </div>
                      </PopoverContent>
                    </Popover>
                  {:else}
                    <button
                      class="border {isPast
                        ? 'border-gray-600'
                        : 'border-primary/20'} bg-gradient-to-br {isPast
                        ? 'from-gray-800/50 to-gray-700/50'
                        : 'from-accent/90 to-accent/50'} p-2 h-full flex flex-col justify-between w-full rounded-md {isPast
                        ? ''
                        : 'hover:border-primary/30'}
                      transition-all duration-300 {isPast ? '' : 'hover:-translate-y-0.5'}"
                      on:click|stopPropagation={(e) =>
                        !isPast && handleCardClick(firstScheduling, e)}
                    >
                      <div class="flex justify-between w-full text-center gap-4 mb-1.5">
                        <span
                          class="text-xs font-medium {isPast ? 'text-gray-400' : 'text-primary'}"
                        >
                          {truncate(firstScheduling.message, 10)}
                        </span>
                        <span class="text-[0.65rem] font-mono text-muted-foreground/80">
                          {formattedDate.time}
                        </span>
                      </div>
                      <div
                        class="text-xs {isPast
                          ? 'text-gray-400'
                          : 'text-primary/90'} w-full truncate justify-center h-full font-normal"
                      >
                        {truncate(firstScheduling.message, 40)}
                      </div>
                    </button>
                  {/if}
                </div>
              {/if}
            {/each}
          </div>
        </div>
      </div>

      <div class="lg:w-96 flex flex-col gap-6">
        <Card>
          <CardHeader class="border-b border-gray-800 p-4">
            <CardTitle>Scheduled Posts</CardTitle>
          </CardHeader>
          <CardContent class="p-0">
            <Table>
              <TableBody class="divide-y">
                {#each schedulings as scheduling}
                  {@const formattedDate = formatScheduleTime(scheduling.scheduleTime)}
                  <TableRow
                    class="hover:bg-accent {selectedScheduling?.id === scheduling.id
                      ? 'bg-blue-900/20 border-l-4 border-blue-500'
                      : ''} {formattedDate.isPast ? 'opacity-50' : ''}"
                  >
                    <TableCell class="py-3" on:click={() => (selectedScheduling = scheduling)}>
                      <div class="text-sm line-clamp-2">{scheduling.message}</div>
                      <div class="text-xs mt-1 font-mono">
                        {formattedDate.fullDate} ·
                        <span>{formattedDate.time}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                {:else}
                  <TableRow>
                    <TableCell class="py-4 text-center text-muted-foreground">
                      No scheduled posts
                    </TableCell>
                  </TableRow>
                {/each}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {#if selectedScheduling}
          {@const formattedDate = formatScheduleTime(selectedScheduling.scheduleTime)}
          <Card>
            <CardHeader class="border-b border-gray-800 p-4">
              <CardTitle>Post Details</CardTitle>
            </CardHeader>
            <CardContent class="p-4 space-y-4">
              <div class="space-y-2">
                <div class="text-sm font-medium">Publication Date</div>
                <div class="font-mono">
                  {formattedDate.fullDate}
                  <span class="ml-2">
                    {formattedDate.time}
                  </span>
                  <span class={selectedScheduling.status === 'posted' ? 'text-green-500' : ''}>
                    {selectedScheduling.status}
                  </span>
                </div>
              </div>

              <div class="space-y-2">
                <div class="text-sm font-medium">Content</div>
                <div
                  class="p-3 rounded bg-accent border border-gray-800 text-sm whitespace-pre-wrap leading-relaxed"
                >
                  {selectedScheduling.message}
                </div>
              </div>

              <div class="flex gap-2 border-t border-gray-800 pt-4">
                <Button
                  variant="destructive"
                  size="sm"
                  class="hover:scale-[1.02] transition-transform"
                  on:click={() => selectedScheduling && deleteSchedule(selectedScheduling.id)}
                >
                  <Trash class="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        {:else}
          <div
            class="text-center text-muted-foreground h-full flex items-center justify-center py-8 italic"
          >
            Select a post to view details
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>
