<script lang="ts">
  import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shadcn-ui/card'
  import { onMount } from 'svelte'

  // Props
  export let posting_days: { date: string; count: number }[] = []

  // Reactive variable for theme detection
  let isDarkMode = false

  // Contribution calendar data
  $: calendarData = generateCalendarData()

  // Helper function to format dates
  function formatFullDate(dateString: string) {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' })
  }

  // Generate calendar data
  function generateCalendarData() {
    const now = new Date()
    const startDate = new Date(now)
    startDate.setMonth(now.getMonth() - 11)
    startDate.setDate(1) // Start from the first day of the month

    const days = []
    const months = []
    const monthPositions = []
    const weekdays = ['Mon', 'Wed', 'Fri']

    // Used to track the column position
    let columnIndex = 0
    let currentMonth = -1

    // Generate all days and track month positions
    const current = new Date(startDate)
    while (current <= now) {
      // If month changes, record its position
      if (current.getMonth() !== currentMonth) {
        currentMonth = current.getMonth()
        monthPositions.push({
          name: current.toLocaleDateString('en-US', { month: 'short' }),
          position: columnIndex,
          date: new Date(current),
        })
      }

      const dateStr = current.toISOString().split('T')[0]
      days.push({
        date: dateStr,
        day: current.getDay(),
        intensity: 0, // Will be updated later
      })

      // Move to next day and increment column index for the next day
      current.setDate(current.getDate() + 1)
      if (current.getDay() === 0) {
        // If it's Sunday, start a new column
        columnIndex++
      }
    }

    // Update intensity for each day based on contributions
    const contributions = posting_days.reduce(
      (acc: Record<string, number>, day) => {
        acc[day.date] = day.count
        return acc
      },
      {} as Record<string, number>
    )

    for (const day of days) {
      day.intensity = getIntensity(day.date, contributions)
    }

    return {
      days,
      monthPositions,
      weekdays,
      contributions,
    }
  }

  // Calculate contribution intensity (0-4) based on count
  function getIntensity(date: string, contributions: Record<string, number>) {
    const count = contributions[date] || 0
    if (count === 0) return 0
    if (count <= 1) return 1
    if (count <= 3) return 2
    if (count <= 5) return 3
    return 4
  }

  // Generate all days in a week-based grid for the calendar
  function getGridDays() {
    // Group days by week (7 days per row) and day of week (column)
    const grid = []
    let week = []
    let lastDayOfWeek = 0

    for (const day of calendarData.days) {
      const dayOfWeek = new Date(day.date).getDay()

      // If we've wrapped around to a new week, start a new row
      if (dayOfWeek < lastDayOfWeek) {
        grid.push(week)
        week = Array(7).fill(null) // Initialize with nulls for empty spots
      }

      // If this is the first week, we may need to pad the start
      if (week.length === 0) {
        week = Array(7).fill(null) // Initialize with nulls
      }

      week[dayOfWeek] = day
      lastDayOfWeek = dayOfWeek
    }

    // Add the last week if it's not empty
    if (week.some((d) => d !== null)) {
      grid.push(week)
    }

    return grid
  }

  onMount(() => {
    // Check for dark mode only after component is mounted (client-side)
    isDarkMode =
      typeof document !== 'undefined' && document.documentElement.classList.contains('dark')

    // Add listener to update if theme changes
    if (typeof document !== 'undefined') {
      const observer = new MutationObserver(() => {
        isDarkMode = document.documentElement.classList.contains('dark')
      })

      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class'],
      })
    }
  })
</script>

<Card>
  <CardHeader>
    <CardTitle>Publication Calendar</CardTitle>
    <CardDescription>History of your posts over the last 12 months</CardDescription>
  </CardHeader>
  <CardContent>
    <div class="contribution-calendar pb-4">
      <!-- Month labels with correct positioning -->
      <div class="month-labels relative h-6 mb-2">
        {#each calendarData.monthPositions as month, i}
          <div
            class="absolute text-xs text-muted-foreground"
            style="left: calc({month.position} * 20px)"
          >
            {month.name}
          </div>
        {/each}
      </div>

      <!-- Calendar grid with horizontal scrolling on small screens -->
      <div class="calendar-container">
        <div class="flex">
          <!-- Day labels -->
          <div class="day-labels flex flex-col justify-between mr-2">
            {#each calendarData.weekdays as day}
              <div class="h-5 text-xs text-muted-foreground">{day}</div>
            {/each}
          </div>

          <!-- Calendar cells -->
          <div class="calendar-grid">
            {#each calendarData.days as day}
              {@const intensity = day.intensity}
              <div
                class="contribution-cell w-4 h-4 rounded-sm transition-all cursor-pointer m-[2px]"
                class:bg-gray-200={intensity === 0 && !isDarkMode}
                class:bg-gray-800={intensity === 0 && isDarkMode}
                class:bg-green-100={intensity === 1 && !isDarkMode}
                class:bg-green-900={intensity === 1 && isDarkMode}
                class:bg-green-200={intensity === 2 && !isDarkMode}
                class:bg-green-700={intensity === 2 && isDarkMode}
                class:bg-green-300={intensity === 3 && !isDarkMode}
                class:bg-green-600={intensity === 3 && isDarkMode}
                class:bg-green-400={intensity === 4 && !isDarkMode}
                class:bg-green-500={intensity === 4 && isDarkMode}
                title={`${formatFullDate(day.date)}: ${calendarData.contributions[day.date] || 0} posts`}
              ></div>
            {/each}
          </div>
        </div>
      </div>

      <!-- Legend -->
      <div class="flex items-center justify-end mt-4 text-xs text-muted-foreground">
        <span class="mr-2">Less</span>
        <div class="w-3 h-3 rounded-sm bg-gray-200 dark:bg-gray-800 mr-1"></div>
        <div class="w-3 h-3 rounded-sm bg-green-100 dark:bg-green-900 mr-1"></div>
        <div class="w-3 h-3 rounded-sm bg-green-200 dark:bg-green-700 mr-1"></div>
        <div class="w-3 h-3 rounded-sm bg-green-300 dark:bg-green-600 mr-1"></div>
        <div class="w-3 h-3 rounded-sm bg-green-400 dark:bg-green-500 mr-1"></div>
        <span>More</span>
      </div>
    </div>
  </CardContent>
</Card>

<style>
  .contribution-calendar {
    margin-top: 1rem;
  }

  .calendar-container {
    overflow-x: auto;
    padding-bottom: 8px;
  }

  .month-labels {
    margin-left: 22px;
  }

  .day-labels {
    height: 100px; /* Adjust based on your calendar height */
  }

  .calendar-grid {
    display: grid;
    grid-template-rows: repeat(7, 1fr); /* 7 days in a week */
    grid-auto-flow: column;
    grid-auto-columns: 20px;
    gap: 1px;
  }

  .contribution-cell {
    width: 16px;
    height: 16px;
  }
</style>
