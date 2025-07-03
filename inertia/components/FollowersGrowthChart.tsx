import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { ChartContainer, ChartTooltipContent } from './ui/chart'
import { Users, Info } from 'lucide-react'
import { Button } from './ui/button'
import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts'

interface FollowerHistory {
  date: string | null
  count: number
}

interface FollowersGrowthChartProps {
  followers_history: FollowerHistory[]
}

const FollowersGrowthChart: React.FC<FollowersGrowthChartProps> = ({ followers_history }) => {
  // Filtrer les données valides et s'assurer qu'on a des données cohérentes
  const validData = followers_history
    .filter((point) => point.date && point.count >= 0 && !isNaN(point.count))
    .sort((a, b) => {
      // Trier par date pour s'assurer de l'ordre chronologique
      const dateA = new Date(a.date!).getTime()
      const dateB = new Date(b.date!).getTime()
      return dateA - dateB
    })

  // Transformer les données pour Recharts
  const chartData = validData.map((point) => ({
    date: point.date,
    followers: point.count,
    formattedDate: new Date(point.date!).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
  }))

  const chartConfig = {
    followers: {
      label: 'Followers',
      color: 'hsl(217.2, 91.2%, 49.8%)', // Couleur bleue principale
    },
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Followers Growth</CardTitle>
            <div className="group relative">
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <Info className="h-4 w-4 text-muted-foreground" />
              </Button>
              <div className="absolute right-0 top-8 w-80 bg-popover text-popover-foreground text-sm p-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity delay-500 duration-200 z-50 border border-border shadow-lg pointer-events-none transform -translate-x-full mr-2">
                <strong>Data Limitation Notice:</strong> This chart shows follower growth only since
                you signed up on our app. We cannot display historical data from before your account
                registration as we only track followers from the moment you connect your Bluesky
                account to our platform.
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
            <Users className="h-12 w-12 mb-2 opacity-50" />
            <p>No followers data available</p>
            <p className="text-sm">Connect your account to see growth analytics</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Followers Growth</CardTitle>{' '}
          <div className="group relative">
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <Info className="h-4 w-4 text-muted-foreground" />
            </Button>
            <div className="absolute right-0 top-8 w-80 bg-popover text-popover-foreground text-sm p-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-50 border border-border shadow-lg pointer-events-none">
              <strong>Data Limitation Notice:</strong> This chart shows follower growth only since
              you signed up on our app. We cannot display historical data from before your account
              registration as we only track followers from the moment you connect your Bluesky
              account to our platform.
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-64 w-full">
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
              minTickGap={32}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value.toLocaleString()}
            />
            <Tooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(label, payload) => {
                    if (payload && payload.length > 0) {
                      const originalData = payload[0].payload
                      return new Date(originalData.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    }
                    return label
                  }}
                  formatter={(value) => [
                    typeof value === 'number' ? value.toLocaleString() : value,
                    'Followers',
                  ]}
                />
              }
            />
            <defs>
              <linearGradient id="fillFollowers" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-followers)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-followers)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <Area
              dataKey="followers"
              type="monotone"
              fill="url(#fillFollowers)"
              fillOpacity={0.4}
              stroke="var(--color-followers)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export default FollowersGrowthChart
