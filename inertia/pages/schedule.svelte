<script lang="ts">
  import { page, router } from '@inertiajs/svelte'
  import { Button } from '@/shadcn-ui/button'
  import * as Card from '@/shadcn-ui/card'
  import { Table, TableBody, TableCell, TableRow } from '@/shadcn-ui/table'
  import { Popover, PopoverContent, PopoverTrigger } from '@/shadcn-ui/popover'
  import { ChevronLeft, ChevronRight, Plus, Trash, Lock } from 'lucide-svelte'
  import { Input } from '@/shadcn-ui/input'
  import { Label } from '@/shadcn-ui/label'
  import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shadcn-ui/dialog'
  import type User from '#models/user'
  import type Scheduling from '#models/scheduling'
  import Layout from '@/components/Layout.svelte'

  export let schedulings: Scheduling[] = []

  const user = $page.props.user as User
  $: isFreeLimitReached = user.plan === 'free' && user.isScheduledLimitReached

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

<Layout {user}>
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

  <div class="mb-8">
    <h1 class="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">Post Scheduling</h1>
    <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
      Plan and manage your content calendar
    </p>
  </div>

  {#if isFreeLimitReached}
    <div
      class="mb-6 border border-yellow-500/30 bg-yellow-500/10 rounded-lg p-4 flex items-start gap-4"
    >
      <Lock class="h-5 w-5 mt-0.5 text-yellow-300" />
      <div class="flex-1">
        <h3 class="text-sm font-semibold text-yellow-200 mb-1">Schedule Limit Reached</h3>
        <p class="text-sm text-yellow-300/90 leading-relaxed">
          Free plan limited to 5 scheduled posts. <br class="hidden sm:block" />
          <button
            on:click={async () => {
              await router.post('/create-stripe-session')
            }}
            class="inline-flex items-center underline hover:text-yellow-200 transition-colors"
          >
            Upgrade to Pro
            <ChevronRight class="h-4 w-4 ml-1" />
          </button>
        </p>
      </div>
    </div>
  {/if}

  <div class="flex flex-col md:flex-row gap-4 justify-between items-start mb-6">
    <Card.Card
      class="border border-gray-200 dark:border-gray-800/80 bg-white dark:bg-[#0A1020] shadow-sm w-full"
    >
      <Card.CardHeader class="flex flex-row items-center justify-between px-4 py-3 lg:px-6 lg:py-4">
        <Card.CardTitle class="text-lg lg:text-xl font-semibold text-gray-800 dark:text-gray-100">
          {weekRangeFormatter.format(currentWeekStart)}
        </Card.CardTitle>
        <div class="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            on:click={() => handleWeekNavigation(-1)}
            class="border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300"
          >
            <ChevronLeft class="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            on:click={() => handleWeekNavigation(1)}
            class="border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300"
          >
            <ChevronRight class="h-4 w-4" />
          </Button>
        </div>
      </Card.CardHeader>
    </Card.Card>

    <Button href="/add/schedule" class="w-full md:w-auto bg-blue-500 hover:bg-blue-600 text-white">
      <Plus class="mr-2 h-4 w-4" />
      New Schedule
    </Button>
  </div>

  <div class="flex-1 flex flex-col lg:flex-row gap-4 lg:gap-8">
    <div
      class="flex-1 flex flex-col overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800/80 bg-white dark:bg-[#0A1020] shadow-sm"
    >
      <div
        class="grid grid-cols-7 gap-px border-b border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-[#0A1020]"
      >
        {#each daysOfWeek as day}
          <div class="p-2 lg:p-3 group relative bg-white dark:bg-[#0A1020]">
            <div class="flex items-center justify-between">
              <div>
                <div
                  class="text-xs lg:text-sm font-semibold uppercase text-gray-700 dark:text-gray-300"
                >
                  {day.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div class="text-[0.65rem] lg:text-xs mt-0.5 text-gray-500 dark:text-gray-400">
                  {day.getDate()}
                  {day.toLocaleDateString('en-US', { month: 'short' })}
                </div>
              </div>
              <Button
                variant="ghost"
                class="opacity-0 group-hover:opacity-100 h-6 w-6 text-blue-500"
              >
                <Plus class="h-3 w-3" />
              </Button>
            </div>
            {#if day.toDateString() === new Date().toDateString()}
              <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
            {/if}
          </div>
        {/each}
      </div>

      <div
        class="flex-1 relative overflow-auto h-[500px] lg:h-[600px] bg-gray-50 dark:bg-[#0A1020]"
      >
        <div class="grid grid-cols-7 auto-rows-min gap-px">
          {#each Array.from({ length: 24 }, (_, i) => i) as hour}
            <div class="col-span-full h-16 border-t border-gray-200 dark:border-gray-700 relative">
              <div
                class="absolute -top-2 left-0 text-[0.65rem] pl-1 px-1 py-0.5 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
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
                        class="border-2 border-blue-500 bg-blue-500/10 p-2 hover:border-blue-400 transition-all h-full rounded flex items-center justify-center text-sm text-blue-500 dark:text-blue-400 shadow-sm"
                        on:click|stopPropagation
                      >
                        {group.length} posts
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      class="w-64 p-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0A1020] shadow-md"
                      style="position: absolute; left: {menuPosition?.x}px; top: {menuPosition?.y}px"
                    >
                      <div class="space-y-2">
                        {#each group as scheduling}
                          <button
                            class="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer w-full text-left"
                            on:click|stopPropagation={() => (selectedScheduling = scheduling)}
                          >
                            <div class="text-xs font-medium text-gray-800 dark:text-gray-200">
                              {truncate(scheduling.message, 30)}
                            </div>
                            <div class="text-xs text-gray-500 dark:text-gray-400">
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
                    class="border shadow-sm {isPast
                      ? 'border-gray-300 dark:border-gray-600'
                      : 'border-blue-300 dark:border-blue-500'} bg-gradient-to-br {isPast
                      ? 'from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700'
                      : 'from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/30'} p-2 h-full flex flex-col justify-between w-full rounded-md {isPast
                      ? ''
                      : 'hover:border-blue-400 dark:hover:border-blue-400'}
                    transition-all duration-300 {isPast
                      ? ''
                      : 'hover:-translate-y-0.5 hover:shadow-md'}"
                    on:click|stopPropagation={(e) => !isPast && handleCardClick(firstScheduling, e)}
                  >
                    <div class="flex justify-between w-full text-center gap-4 mb-1.5">
                      <span
                        class="text-xs font-medium {isPast
                          ? 'text-gray-700 dark:text-gray-400'
                          : 'text-blue-800 dark:text-blue-400'}"
                      >
                        {truncate(firstScheduling.message, 10)}
                      </span>
                      <span class="text-[0.65rem] font-mono text-gray-700 dark:text-gray-400">
                        {formattedDate.time}
                      </span>
                    </div>
                    <div
                      class="text-xs {isPast
                        ? 'text-gray-700 dark:text-gray-400'
                        : 'text-blue-900 dark:text-blue-300'} w-full truncate justify-center h-full font-normal"
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
      <Card.Card
        class="border border-gray-200 dark:border-gray-800/80 bg-white dark:bg-[#0A1020] shadow-sm"
      >
        <Card.CardHeader class="border-b border-gray-200 dark:border-gray-700 p-4">
          <Card.CardTitle class="text-gray-800 dark:text-gray-100">Scheduled Posts</Card.CardTitle>
        </Card.CardHeader>
        <Card.CardContent class="p-0">
          <Table>
            <TableBody class="divide-y divide-gray-200 dark:divide-gray-700">
              {#each schedulings as scheduling}
                {@const formattedDate = formatScheduleTime(scheduling.scheduleTime)}
                <TableRow
                  class="hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors {selectedScheduling?.id ===
                  scheduling.id
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500'
                    : ''} {formattedDate.isPast ? 'opacity-60' : ''}"
                >
                  <TableCell class="py-3" on:click={() => (selectedScheduling = scheduling)}>
                    <div class="text-sm line-clamp-2 text-gray-800 dark:text-gray-200">
                      {scheduling.message}
                    </div>
                    <div class="text-xs mt-1 font-mono text-gray-500 dark:text-gray-400">
                      {formattedDate.fullDate} ·
                      <span>{formattedDate.time}</span>
                    </div>
                  </TableCell>
                </TableRow>
              {:else}
                <TableRow>
                  <TableCell class="py-4 text-center text-gray-500 dark:text-gray-400">
                    No scheduled posts
                  </TableCell>
                </TableRow>
              {/each}
            </TableBody>
          </Table>
        </Card.CardContent>
      </Card.Card>

      {#if selectedScheduling}
        {@const formattedDate = formatScheduleTime(selectedScheduling.scheduleTime)}
        <Card.Card
          class="border border-gray-200 dark:border-gray-800/80 bg-white dark:bg-[#0A1020] shadow-sm"
        >
          <Card.CardHeader class="border-b border-gray-200 dark:border-gray-700 p-4">
            <Card.CardTitle class="text-gray-800 dark:text-gray-100">Post Details</Card.CardTitle>
          </Card.CardHeader>
          <Card.CardContent class="p-4 space-y-4">
            <div class="space-y-2">
              <div class="text-sm font-medium text-gray-700 dark:text-gray-300">
                Publication Date
              </div>
              <div class="font-mono text-gray-600 dark:text-gray-300">
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
              <div class="text-sm font-medium text-gray-700 dark:text-gray-300">Content</div>
              <div
                class="p-3 rounded bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 text-sm whitespace-pre-wrap leading-relaxed text-gray-800 dark:text-gray-200"
              >
                {selectedScheduling.message}
              </div>
            </div>

            <div class="flex gap-2 border-t border-gray-200 dark:border-gray-700 pt-4">
              <Button
                variant="destructive"
                size="sm"
                class="hover:scale-[1.02] transition-transform bg-red-500 hover:bg-red-600 text-white"
                on:click={() => selectedScheduling && deleteSchedule(selectedScheduling.id)}
              >
                <Trash class="mr-2 h-4 w-4" />
                Delete
              </Button>
            </div>
          </Card.CardContent>
        </Card.Card>
      {:else}
        <div
          class="text-center text-gray-500 dark:text-gray-400 h-full flex items-center justify-center py-8 italic"
        >
          Select a post to view details
        </div>
      {/if}
    </div>
  </div>
</Layout>
