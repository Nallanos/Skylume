<script lang="ts">
  import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shadcn-ui/card'
  import { onMount } from 'svelte'

  // Props
  export let posting_days: { date: string; count: number }[] = []

  // Normaliser les données au cas où le format ne serait pas celui attendu
  $: normalized_posting_days = posting_days.map((day) => ({
    date:
      typeof day.date === 'string'
        ? day.date.includes('T')
          ? day.date.split('T')[0]
          : day.date
        : day.date,
    count: typeof day.count === 'number' ? day.count : parseInt(day.count as any) || 0,
  }))
  // Reactive variable for theme detection - initialized with browser preference when possible
  let isDarkMode = false

  // Initial theme check - will work during SSR without causing hydration issues
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    // Check for both dark mode class and system preference
    isDarkMode =
      document.documentElement.classList.contains('dark') ||
      (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
  }

  // Contribution calendar data
  $: calendarData = generateCalendarData(normalized_posting_days)

  // Helper function to format dates
  function formatFullDate(dateString: string) {
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) {
        console.error(`Date invalide: "${dateString}"`)
        return 'Date invalide'
      }
      return date.toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' })
    } catch (error) {
      console.error(`Erreur lors du formatage de la date: "${dateString}"`, error)
      return 'Erreur de date'
    }
  }

  // Generate calendar data
  function generateCalendarData(normalizedPostingDays: { date: string; count: number }[]) {
    // Déterminer la plage de dates à afficher
    // Si des dates futures sont présentes, utiliser la date la plus récente comme fin
    const now = new Date()
    let endDate = new Date(now)

    // Trouver la date la plus récente dans les données
    normalizedPostingDays.forEach((day) => {
      const postDate = new Date(day.date)
      if (postDate > endDate) {
        endDate = postDate
      }
    })

    // Calculer la date de début (12 mois avant la date de fin)
    const startDate = new Date(endDate)
    startDate.setMonth(endDate.getMonth() - 11)
    startDate.setDate(1) // Start from the first day of the month

    const days = []
    const monthPositions = []
    const weekdays = ['Mon', 'Wed', 'Fri']

    // Used to track the column position
    let columnIndex = 0
    let currentMonth = -1

    // Generate all days and track month positions
    const current = new Date(startDate)
    while (current <= endDate) {
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
    const contributions = normalizedPostingDays.reduce(
      (acc: Record<string, number>, day) => {
        // La date est déjà normalisée à ce stade
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

  onMount(() => {
    // Update dark mode status after component is mounted (client-side)
    isDarkMode =
      document.documentElement.classList.contains('dark') ||
      (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)

    // Add listener to update if theme changes
    const observer = new MutationObserver(() => {
      isDarkMode = document.documentElement.classList.contains('dark')
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })

    // Also listen for system preference changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e: MediaQueryListEvent) => {
      if (
        !document.documentElement.classList.contains('dark') &&
        !document.documentElement.classList.contains('light')
      ) {
        isDarkMode = e.matches
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => {
      observer.disconnect()
      mediaQuery.removeEventListener('change', handleChange)
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
        {#each calendarData.monthPositions as month}
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
                class:contribution-cell-empty={intensity === 0}
                class:contribution-cell-level-1={intensity === 1}
                class:contribution-cell-level-2={intensity === 2}
                class:contribution-cell-level-3={intensity === 3}
                class:contribution-cell-level-4={intensity === 4}
                title={`${formatFullDate(day.date)}: ${calendarData.contributions[day.date] || 0} posts`}
              ></div>
            {/each}
          </div>
        </div>
      </div>

      <!-- Legend -->
      <div class="flex items-center justify-end mt-4 text-xs text-muted-foreground">
        <span class="mr-2">Less</span>
        <div class="w-3 h-3 rounded-sm contribution-cell-empty mr-1"></div>
        <div class="w-3 h-3 rounded-sm contribution-cell-level-1 mr-1"></div>
        <div class="w-3 h-3 rounded-sm contribution-cell-level-2 mr-1"></div>
        <div class="w-3 h-3 rounded-sm contribution-cell-level-3 mr-1"></div>
        <div class="w-3 h-3 rounded-sm contribution-cell-level-4 mr-1"></div>
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
    min-height: 118px; /* Hauteur minimale pour éviter les sauts lors du rendu */
  }

  .contribution-cell {
    width: 16px;
    height: 16px;
  }

  /* Dedicated classes for each intensity level with proper light/dark mode support */
  .contribution-cell-empty {
    background-color: #ebedf0; /* Light gray for light mode */
  }

  .contribution-cell-level-1 {
    background-color: #9be9a8; /* Light green */
  }

  .contribution-cell-level-2 {
    background-color: #40c463; /* Medium green */
  }

  .contribution-cell-level-3 {
    background-color: #30a14e; /* Darker green */
  }

  .contribution-cell-level-4 {
    background-color: #216e39; /* Darkest green */
  }

  /* Dark mode overrides using :global to ensure they apply */
  :global(.dark) .contribution-cell-empty {
    background-color: #2d333b; /* Dark gray for dark mode */
  }

  :global(.dark) .contribution-cell-level-1 {
    background-color: #0e4429; /* Dark green level 1 */
  }

  :global(.dark) .contribution-cell-level-2 {
    background-color: #006d32; /* Dark green level 2 */
  }

  :global(.dark) .contribution-cell-level-3 {
    background-color: #26a641; /* Dark green level 3 */
  }

  :global(.dark) .contribution-cell-level-4 {
    background-color: #39d353; /* Dark green level 4 */
  }
</style>
