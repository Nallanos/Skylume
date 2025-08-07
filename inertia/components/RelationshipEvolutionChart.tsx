import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { ChartContainer, ChartTooltipContent } from './ui/chart'
import { TrendingUp, Info } from 'lucide-react'
import { Button } from './ui/button'
import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis, ResponsiveContainer } from 'recharts'

interface RelationshipHistory {
  date: string
  mutual: number
  i_follow_only: number
  they_follow_only: number
}

interface RelationshipEvolutionChartProps {
  relationshipHistory?: RelationshipHistory[]
  currentCounts: {
    mutual: number
    i_follow_only: number
    they_follow_only: number
  }
}

const RelationshipEvolutionChart: React.FC<RelationshipEvolutionChartProps> = ({ 
  relationshipHistory, 
  currentCounts 
}) => {
  // Utiliser l'historique réel si disponible, sinon fallback sur une valeur unique
  const chartData = React.useMemo(() => {
    if (relationshipHistory && relationshipHistory.length > 0) {
      return relationshipHistory.map((item) => ({
        ...item,
        formattedDate: new Date(item.date).toLocaleDateString('fr-FR', {
          month: 'short',
          day: 'numeric',
        }),
      }))
    }
    // Fallback : une seule valeur actuelle
    const today = new Date()
    return [{
      date: today.toISOString().split('T')[0],
      i_follow_only: currentCounts.i_follow_only,
      mutual: currentCounts.mutual,
      they_follow_only: currentCounts.they_follow_only,
      formattedDate: today.toLocaleDateString('fr-FR', {
        month: 'short',
        day: 'numeric',
      }),
    }]
  }, [relationshipHistory, currentCounts])

  // Configuration du graphique
  const chartConfig = {
    i_follow_only: {
      label: 'I Follow Only',
      color: 'hsl(0, 84.2%, 60.2%)', // Rouge
    },
  }

  // Calcul du domaine Y pour une échelle appropriée qui montre mieux les variations
  const allValues = chartData.map(d => d.i_follow_only)
  const minValue = allValues.length > 0 ? Math.min(...allValues) : 0
  const maxValue = allValues.length > 0 ? Math.max(...allValues) : 0
  // Zoom sur la variation réelle : domaine centré sur les valeurs min/max, marge réduite
  const range = maxValue - minValue
  let margin = 0
  if (range === 0) {
    margin = Math.max(1, Math.round(maxValue * 0.05))
  } else if (range < 20) {
    margin = Math.max(1, Math.round(range * 0.1))
  } else {
    margin = Math.round(range * 0.05)
  }
  // Domaine Y centré sur la variation, pour "zoomer" sur la courbe
  const yDomain = [minValue - margin, maxValue + margin]

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Relationship Evolution
            </CardTitle>
            <div className="group relative">
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <Info className="h-4 w-4 text-muted-foreground" />
              </Button>
              <div className="absolute right-0 top-8 w-80 bg-popover text-popover-foreground text-sm p-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity delay-500 duration-200 z-50 border border-border shadow-lg pointer-events-none transform -translate-x-full mr-2">
                <strong>Data Notice:</strong> This chart shows relationship evolution over time. 
                Historical data is tracked from when you started using our platform.
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
            <TrendingUp className="h-12 w-12 mb-2 opacity-50" />
            <p>No relationship data available</p>
            <p className="text-sm">Data will appear as your relationships evolve</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Relationship Evolution (Last 7 Days)
          </CardTitle>
          <div className="group relative">
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <Info className="h-4 w-4 text-muted-foreground" />
            </Button>
            <div className="absolute right-0 top-8 w-80 bg-popover text-popover-foreground text-sm p-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-50 border border-border shadow-lg pointer-events-none">
              <strong>Relationship Insights:</strong> Track how your mutual connections and one-way follows evolve over time. 
              This helps identify engagement patterns and follower quality trends.
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Chart Legend */}
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span>I Follow Only</span>
            </div>
          </div>

          {/* Chart */}
          <ChartContainer config={chartConfig} className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{
                  left: 12,
                  right: 12,
                  top: 12,
                  bottom: 12,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="formattedDate"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={10}
                  interval={0}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => value.toLocaleString()}
                  domain={yDomain}
                />
                <Tooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(label, payload) => {
                        if (payload && payload.length > 0) {
                          const originalData = payload[0].payload
                          return new Date(originalData.date).toLocaleDateString('fr-FR', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        }
                        return label
                      }}
                      formatter={(value, name) => [
                        typeof value === 'number' ? value.toLocaleString() : value,
                        chartConfig[name as keyof typeof chartConfig]?.label || name,
                      ]}
                    />
                  }
                />
                <defs>
                  <linearGradient id="fillIFollowOnly" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-i_follow_only)" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="var(--color-i_follow_only)" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <Area
                  dataKey="i_follow_only"
                  type="monotone"
                  fill="url(#fillIFollowOnly)"
                  fillOpacity={0.4}
                  stroke="var(--color-i_follow_only)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>

          {/* Current Stats Summary */}
          <div className="grid grid-cols-1 gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {currentCounts.i_follow_only.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">I Follow Only</div>
              <div className="text-xs text-orange-600 mt-1">
                ⚠️ Consider reviewing
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default RelationshipEvolutionChart
