import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { cn } from '../lib/utils'

interface PostingDay {
  date: string
  count: number
}

interface PublicationCalendarProps {
  posting_days: PostingDay[]
  className?: string
}

interface CalendarDay {
  date: string
  day: number
  intensity: number
  count: number
}

interface MonthPosition {
  name: string
  position: number
  date: Date
}

interface CalendarData {
  days: CalendarDay[]
  monthPositions: MonthPosition[]
  weekdays: string[]
  contributions: Record<string, number>
}

export default function PublicationCalendar({
  posting_days = [],
  className,
}: PublicationCalendarProps) {
  const [hoveredDay, setHoveredDay] = useState<string | null>(null)

  // Normaliser les données
  const normalizedPostingDays = useMemo(
    () =>
      posting_days.map((day) => ({
        date:
          typeof day.date === 'string'
            ? day.date.includes('T')
              ? day.date.split('T')[0]
              : day.date
            : day.date,
        count: typeof day.count === 'number' ? day.count : parseInt(day.count as any) || 0,
      })),
    [posting_days]
  )

  // Calculer l'intensité de contribution (0-4) basé sur le nombre
  const getIntensity = (count: number) => {
    if (count === 0) return 0
    if (count <= 1) return 1
    if (count <= 3) return 2
    if (count <= 5) return 3
    return 4
  }

  // Fonction pour formater les dates
  const formatFullDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) {
        return 'Date invalide'
      }
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    } catch (error) {
      return 'Erreur de date'
    }
  }

  // Génération des données du calendrier
  const calendarData = useMemo((): CalendarData => {
    const now = new Date()
    const endDate = new Date(now)

    // Calculer la date de début (52 semaines avant)
    const startDate = new Date(endDate)
    startDate.setDate(endDate.getDate() - 52 * 7)

    // Ajuster pour commencer un dimanche
    while (startDate.getDay() !== 0) {
      startDate.setDate(startDate.getDate() - 1)
    }

    const days: CalendarDay[] = []
    const monthPositions: MonthPosition[] = []
    const weekdays = ['', 'Mon', '', 'Wed', '', 'Fri', '']

    // Créer un map des contributions pour une lookup rapide
    const contributions = normalizedPostingDays.reduce(
      (acc: Record<string, number>, day) => {
        acc[day.date] = day.count
        return acc
      },
      {} as Record<string, number>
    )

    // Suivre les positions des mois
    let weekIndex = 0
    let currentMonth = -1

    // Générer tous les jours
    const current = new Date(startDate)
    while (current <= endDate) {
      // Si le mois change et c'est un dimanche, enregistrer sa position
      if (current.getMonth() !== currentMonth && current.getDay() === 0) {
        currentMonth = current.getMonth()
        monthPositions.push({
          name: current.toLocaleDateString('en-US', { month: 'short' }),
          position: weekIndex,
          date: new Date(current),
        })
      }

      const dateStr = current.toISOString().split('T')[0]
      const count = contributions[dateStr] || 0

      days.push({
        date: dateStr,
        day: current.getDay(),
        intensity: getIntensity(count),
        count: count,
      })

      // Passer au jour suivant
      current.setDate(current.getDate() + 1)

      // Si on passe à un nouveau dimanche, incrémenter la semaine
      if (current.getDay() === 0 && current <= endDate) {
        weekIndex++
      }
    }

    return {
      days,
      monthPositions,
      weekdays,
      contributions,
    }
  }, [normalizedPostingDays])

  // Organiser les jours en semaines
  const weeks = useMemo(() => {
    const weeksArray: CalendarDay[][] = []
    for (let i = 0; i < calendarData.days.length; i += 7) {
      weeksArray.push(calendarData.days.slice(i, i + 7))
    }
    return weeksArray
  }, [calendarData.days])

  // Calculer les statistiques
  const stats = useMemo(() => {
    const totalPosts = Object.values(calendarData.contributions).reduce(
      (sum, count) => sum + count,
      0
    )
    const activeDays = Object.values(calendarData.contributions).filter((count) => count > 0).length
    const maxPosts = Math.max(...Object.values(calendarData.contributions), 0)

    return { totalPosts, activeDays, maxPosts }
  }, [calendarData.contributions])

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Publication Activity</CardTitle>
          <div className="text-sm text-muted-foreground">
            {stats.totalPosts} posts in the last year
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Calendar Container avec largeur optimisée */}
        <div className="w-full">
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full">
              {/* Month Labels avec alignement correct */}
              <div className="flex mb-2" style={{ paddingLeft: '32px' }}>
                {calendarData.monthPositions.map((month, index) => (
                  <div
                    key={index}
                    className="text-xs text-muted-foreground"
                    style={{
                      width: `${14 * 4.3}px`, // Largeur approximative pour 4.3 semaines par mois
                      textAlign: 'left',
                    }}
                  >
                    {month.name}
                  </div>
                ))}
              </div>

              {/* Calendar Grid avec alignement parfait */}
              <div className="flex gap-2">
                {/* Weekday Labels */}
                <div
                  className="flex flex-col justify-between text-xs text-muted-foreground"
                  style={{ width: '28px', height: '105px' }}
                >
                  {calendarData.weekdays.map((day, index) => (
                    <div key={index} className="h-3 flex items-center justify-end">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Days Grid - Style GitHub parfait */}
                <div className="flex-1">
                  <div
                    className="grid grid-rows-7 gap-[2px]"
                    style={{
                      gridTemplateColumns: `repeat(${weeks.length}, 11px)`,
                      gridAutoFlow: 'column',
                    }}
                  >
                    {calendarData.days.map((day) => (
                      <div
                        key={day.date}
                        className={cn(
                          'w-[11px] h-[11px] rounded-[2px] cursor-pointer transition-all duration-150',
                          // Couleurs GitHub exactes comme dans le fichier Svelte
                          day.intensity === 0 && 'github-cell-empty',
                          day.intensity === 1 && 'github-cell-level-1',
                          day.intensity === 2 && 'github-cell-level-2',
                          day.intensity === 3 && 'github-cell-level-3',
                          day.intensity === 4 && 'github-cell-level-4'
                        )}
                        onMouseEnter={() => setHoveredDay(day.date)}
                        onMouseLeave={() => setHoveredDay(null)}
                        title={`${formatFullDate(day.date)}: ${day.count} post${day.count !== 1 ? 's' : ''}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Legend and Stats */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t">
          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{stats.activeDays} active days</span>
            <span>Max: {stats.maxPosts} posts/day</span>
          </div>

          {/* Legend avec couleurs GitHub authentiques */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Less</span>
            <div className="flex gap-1">
              {[0, 1, 2, 3, 4].map((level) => (
                <div
                  key={level}
                  className={cn(
                    'w-[11px] h-[11px] rounded-[2px]',
                    level === 0 && 'github-cell-empty',
                    level === 1 && 'github-cell-level-1',
                    level === 2 && 'github-cell-level-2',
                    level === 3 && 'github-cell-level-3',
                    level === 4 && 'github-cell-level-4'
                  )}
                />
              ))}
            </div>
            <span className="text-sm text-muted-foreground">More</span>
          </div>
        </div>

        {/* Tooltip for hovered day */}
        {hoveredDay && (
          <div className="text-sm p-3 bg-popover text-popover-foreground rounded-md border shadow-md">
            <div className="font-medium">{formatFullDate(hoveredDay)}</div>
            <div className="text-muted-foreground">
              {calendarData.contributions[hoveredDay] || 0} post
              {(calendarData.contributions[hoveredDay] || 0) !== 1 ? 's' : ''}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
