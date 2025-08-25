import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Progress } from './ui/progress'
import { Users, MessageSquare, TrendingUp } from 'lucide-react'

interface CampaignGroup {
  id: number
  name: string
  conditions: Record<string, any>
  priority: number
  targetCount?: number
  messagesSent?: number
  message?: string
}

interface GroupStatsProps {
  groups: CampaignGroup[]
  className?: string
}

export default function GroupStats({ groups, className }: GroupStatsProps) {
  // Debug: vérifier les données reçues
  console.log('GroupStats received groups:', groups)
  
  const totalCount = groups.reduce((sum, group) => {
    console.log(`Group ${group.name}: target_count=${group.targetCount}`)
    return sum + (group.targetCount || 0)
  }, 0)
  const totalSent = groups.reduce((sum, group) => {
    console.log(`Group ${group.name}: messages_sent=${group.messagesSent}`)
    return sum + (group.messagesSent || 0)
  }, 0)
  
  // Calcul du taux de conversion estimation -> assignation
  const assignmentRate = totalCount > 0 && totalSent > 0 ? (totalSent / totalCount) * 100 : 0

  return (
    <div className={className}>
      {/* Statistiques globales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-xs text-muted-foreground">Assigned</p>
                <p className="text-lg font-semibold">{totalCount.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-xs text-muted-foreground">Messages Sent</p>
                <p className="text-lg font-semibold">{totalSent.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-xs text-muted-foreground">Conversion</p>
                <p className="text-lg font-semibold">{assignmentRate.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Détail par groupe */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Groups Breakdown ({groups.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {groups.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No groups configured yet
            </p>
          ) : (
            <div className="space-y-4">
              {groups
                .sort((a, b) => a.priority - b.priority)
                .map((group) => {
                  const targetCount = group.targetCount ?? 0
                  const groupAssignmentRate = targetCount > 0
                    ? (targetCount / targetCount) * 100
                    : 0
                  const groupSendRate = targetCount > 0
                    ? ((group.messagesSent ?? 0) / targetCount) * 100
                    : 0

                  return (
                    <div key={group.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{group.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            Priority: {group.priority}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {formatCondition(group.conditions)}
                        </Badge>
                      </div>

                      {/* Métriques du groupe */}
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Assigned</p>
                          <p className="font-medium text-green-600">
                            {(group.targetCount || 0).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Sent</p>
                          <p className="font-medium text-blue-600">
                            {(group.messagesSent || 0).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* Barres de progression */}
                      <div className="space-y-2">
                        <div>
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Assignment Rate</span>
                            <span>{groupAssignmentRate.toFixed(1)}%</span>
                          </div>
                          <Progress value={groupAssignmentRate} className="h-2" />
                        </div>
                        
                        {(group.targetCount || 0) > 0 && (
                          <div>
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                              <span>Send Rate</span>
                              <span>{groupSendRate.toFixed(1)}%</span>
                            </div>
                            <Progress value={groupSendRate} className="h-2" />
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Fonction helper pour formater les conditions
function formatCondition(conditions: Record<string, any>): string {
  if (!conditions) return 'No conditions'
  
  if (conditions.field && conditions.operator && conditions.value !== undefined) {
    const field = conditions.field.replace('_', ' ')
    const operator = getOperatorSymbol(conditions.operator)
    return `${field} ${operator} ${conditions.value}`
  }
  
  return 'Complex conditions'
}

function getOperatorSymbol(operator: string): string {
  switch (operator) {
    case 'gte': return '≥'
    case 'lte': return '≤'
    case 'gt': return '>'
    case 'lt': return '<'
    case 'eq': return '='
    default: return operator
  }
}
