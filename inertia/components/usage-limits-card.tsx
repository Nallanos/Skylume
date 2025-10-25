import React from 'react'
import { Progress } from './ui/progress'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { AlertTriangle, Calendar, Users, Rss, Download, MousePointer } from 'lucide-react'

interface UsageData {
  current: number
  limit: number
  percentage: number
}

interface UsageStatus {
  scheduledPosts: UsageData
  accounts: UsageData
  feeds: UsageData
  followerLoadings: UsageData
  followActions: UsageData
  plan: string
}

interface Props {
  usageStatus: UsageStatus
}

const UsageLimitsCard: React.FC<Props> = ({ usageStatus }) => {
  const getStatusColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600'
    if (percentage >= 75) return 'text-orange-600'
    if (percentage >= 50) return 'text-yellow-600'
    return 'text-green-600'
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 75) return 'bg-orange-500'
    if (percentage >= 50) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const formatLimit = (limit: number) => {
    return limit === -1 ? '∞' : limit.toString()
  }

  const usageItems = [
    {
      key: 'scheduledPosts',
      icon: Calendar,
      title: 'Posts programmés',
      data: usageStatus.scheduledPosts,
      description: 'Posts en attente de publication'
    },
    {
      key: 'accounts',
      icon: Users,
      title: 'Comptes connectés',
      data: usageStatus.accounts,
      description: 'Comptes Bluesky gérés'
    },
    {
      key: 'feeds',
      icon: Rss,
      title: 'Feeds personnalisés',
      data: usageStatus.feeds,
      description: 'Feeds créés sur tous vos comptes'
    },
    {
      key: 'followerLoadings',
      icon: Download,
      title: 'Analyses followers ce mois',
      data: usageStatus.followerLoadings,
      description: 'Chargements d\'analyses de followers'
    },
    {
      key: 'followActions',
      icon: MousePointer,
      title: 'Actions follow aujourd\'hui',
      data: usageStatus.followActions,
      description: 'Actions de follow/unfollow effectuées'
    }
  ]

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <span>Utilisation actuelle</span>
            <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
              Free Forever
            </Badge>
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {usageItems.map((item) => {
            const Icon = item.icon
            const isUnlimited = item.data.limit === -1
            const isNearLimit = item.data.percentage >= 80
            
            return (
              <div key={item.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">{item.title}</span>
                    {isNearLimit && !isUnlimited && (
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${getStatusColor(item.data.percentage)}`}>
                      {item.data.current} / {formatLimit(item.data.limit)}
                    </span>
                  </div>
                </div>
                
                {!isUnlimited && (
                  <div className="space-y-1">
                    <Progress 
                      value={item.data.percentage} 
                      className="h-2"
                      color={getProgressColor(item.data.percentage)}
                    />
                    <p className="text-xs text-gray-500">{item.description}</p>
                  </div>
                )}
                
                {isUnlimited && (
                  <p className="text-xs text-green-600 font-medium">✓ Illimité</p>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

export default UsageLimitsCard
