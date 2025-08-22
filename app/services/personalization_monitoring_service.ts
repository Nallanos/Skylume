import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

export interface PersonalizationMetrics {
  campaignId: number
  totalMessages: number
  variableUsage: Record<string, number>
  groupPerformance: Array<{
    groupId: number
    groupName: string
    messagesSent: number
    responseRate: number
    avgResponseTime: number
  }>
  performanceStats: {
    avgPersonalizationTime: number
    cacheHitRate: number
    errorRate: number
  }
}

export interface VariableUsageStats {
  variableName: string
  type: string
  totalUsage: number
  campaignsUsing: number
  avgResolutionTime: number
  errorRate: number
}

export default class PersonalizationMonitoringService {
  /**
   * Record metrics for a personalized message sent
   */
  async recordMessageSent(
    campaignId: number,
    groupId: number,
    variablesUsed: string[],
    personalizationTimeMs: number,
    fromCache: boolean
  ): Promise<void> {
    // Insert into metrics table (you'd need to create this table)
    await db.table('personalization_metrics').insert({
      campaign_id: campaignId,
      group_id: groupId,
      variables_used: JSON.stringify(variablesUsed),
      personalization_time_ms: personalizationTimeMs,
      from_cache: fromCache,
      created_at: DateTime.now().toSQL(),
    })
  }

  /**
   * Record when a variable resolution fails
   */
  async recordVariableError(
    campaignId: number,
    variableName: string,
    errorType: string,
    errorMessage: string
  ): Promise<void> {
    await db.table('personalization_errors').insert({
      campaign_id: campaignId,
      variable_name: variableName,
      error_type: errorType,
      error_message: errorMessage,
      created_at: DateTime.now().toSQL(),
    })
  }

  /**
   * Get comprehensive personalization metrics for a campaign
   */
  async getCampaignMetrics(campaignId: number, days = 30): Promise<PersonalizationMetrics> {
    const startDate = DateTime.now().minus({ days }).toSQL()

    // Get total messages sent
    const totalMessages = await db
      .from('personalization_metrics')
      .where('campaign_id', campaignId)
      .where('created_at', '>=', startDate)
      .count('* as count')
      .first()

    // Get variable usage statistics
    const variableUsageRaw = await db
      .from('personalization_metrics')
      .where('campaign_id', campaignId)
      .where('created_at', '>=', startDate)
      .select('variables_used')

    const variableUsage: Record<string, number> = {}
    for (const row of variableUsageRaw) {
      try {
        const variables = JSON.parse(row.variables_used) as string[]
        for (const variable of variables) {
          variableUsage[variable] = (variableUsage[variable] || 0) + 1
        }
      } catch (error) {
        // Skip malformed JSON
      }
    }

    // Get group performance
    const groupPerformance = await db
      .from('campaign_groups as cg')
      .leftJoin('personalization_metrics as pm', 'cg.id', 'pm.group_id')
      .leftJoin('follower_campaigns as fc', (query) => {
        query.on('fc.campaign_group_id', 'cg.id')
          .andOnVal('fc.message_sent', true)
      })
      .where('cg.campaign_id', campaignId)
      .where((query) => {
        query.where('pm.created_at', '>=', startDate)
          .orWhereNull('pm.created_at')
      })
      .groupBy('cg.id', 'cg.name')
      .select(
        'cg.id as group_id',
        'cg.name as group_name',
        db.raw('COUNT(pm.id) as messages_sent'),
        db.raw('COUNT(CASE WHEN fc.response_received = true THEN 1 END) as responses'),
        db.raw('AVG(EXTRACT(EPOCH FROM (fc.response_received_at - fc.message_sent_at))) as avg_response_time_seconds')
      )

    const processedGroupPerformance = groupPerformance.map(group => ({
      groupId: group.group_id,
      groupName: group.group_name,
      messagesSent: parseInt(group.messages_sent) || 0,
      responseRate: group.messages_sent > 0 
        ? (parseInt(group.responses) || 0) / parseInt(group.messages_sent) * 100
        : 0,
      avgResponseTime: parseFloat(group.avg_response_time_seconds) || 0,
    }))

    // Get performance statistics
    const performanceRaw = await db
      .from('personalization_metrics')
      .where('campaign_id', campaignId)
      .where('created_at', '>=', startDate)
      .select(
        db.raw('AVG(personalization_time_ms) as avg_personalization_time'),
        db.raw('COUNT(CASE WHEN from_cache = true THEN 1 END) as cache_hits'),
        db.raw('COUNT(*) as total_requests')
      )
      .first()

    const errorCount = await db
      .from('personalization_errors')
      .where('campaign_id', campaignId)
      .where('created_at', '>=', startDate)
      .count('* as count')
      .first()

    const performanceStats = {
      avgPersonalizationTime: parseFloat(performanceRaw?.avg_personalization_time) || 0,
      cacheHitRate: performanceRaw?.total_requests > 0 
        ? (parseInt(performanceRaw?.cache_hits) || 0) / parseInt(performanceRaw?.total_requests) * 100
        : 0,
      errorRate: totalMessages.count > 0 
        ? (parseInt(errorCount.count) || 0) / parseInt(totalMessages.count) * 100
        : 0,
    }

    return {
      campaignId,
      totalMessages: parseInt(totalMessages.count) || 0,
      variableUsage,
      groupPerformance: processedGroupPerformance,
      performanceStats,
    }
  }

  /**
   * Get variable usage statistics across all campaigns
   */
  async getVariableUsageStats(days = 30): Promise<VariableUsageStats[]> {
    const startDate = DateTime.now().minus({ days }).toSQL()

    // This would require more complex analysis of the metrics data
    // For now, return a simplified version
    const variableStats = await db
      .from('campaign_variables as cv')
      .leftJoin('personalization_metrics as pm', 'pm.campaign_id', 'cv.campaign_id')
      .leftJoin('personalization_errors as pe', (query) => {
        query.on('pe.campaign_id', 'cv.campaign_id')
          .andOn('pe.variable_name', 'cv.name')
      })
      .where((query) => {
        query.where('pm.created_at', '>=', startDate)
          .orWhereNull('pm.created_at')
      })
      .groupBy('cv.name', 'cv.type')
      .select(
        'cv.name as variable_name',
        'cv.type',
        db.raw('COUNT(pm.id) as total_usage'),
        db.raw('COUNT(DISTINCT cv.campaign_id) as campaigns_using'),
        db.raw('AVG(pm.personalization_time_ms) as avg_resolution_time'),
        db.raw('COUNT(pe.id) as error_count')
      )

    return variableStats.map(stat => ({
      variableName: stat.variable_name,
      type: stat.type,
      totalUsage: parseInt(stat.total_usage) || 0,
      campaignsUsing: parseInt(stat.campaigns_using) || 0,
      avgResolutionTime: parseFloat(stat.avg_resolution_time) || 0,
      errorRate: stat.total_usage > 0 
        ? (parseInt(stat.error_count) || 0) / parseInt(stat.total_usage) * 100
        : 0,
    }))
  }

  /**
   * Get system-wide personalization performance metrics
   */
  async getSystemMetrics(days = 7): Promise<{
    totalPersonalizations: number
    avgPersonalizationTime: number
    cacheHitRate: number
    errorRate: number
    topPerformingCampaigns: Array<{
      campaignId: number
      campaignName: string
      personalizations: number
      avgTime: number
      errorRate: number
    }>
  }> {
    const startDate = DateTime.now().minus({ days }).toSQL()

    // System-wide metrics
    const systemStats = await db
      .from('personalization_metrics')
      .where('created_at', '>=', startDate)
      .select(
        db.raw('COUNT(*) as total_personalizations'),
        db.raw('AVG(personalization_time_ms) as avg_personalization_time'),
        db.raw('COUNT(CASE WHEN from_cache = true THEN 1 END) as cache_hits')
      )
      .first()

    const totalErrors = await db
      .from('personalization_errors')
      .where('created_at', '>=', startDate)
      .count('* as count')
      .first()

    // Top performing campaigns
    const topCampaigns = await db
      .from('personalization_metrics as pm')
      .join('campaigns as c', 'pm.campaign_id', 'c.id')
      .where('pm.created_at', '>=', startDate)
      .groupBy('pm.campaign_id', 'c.name')
      .select(
        'pm.campaign_id',
        'c.name as campaign_name',
        db.raw('COUNT(pm.id) as personalizations'),
        db.raw('AVG(pm.personalization_time_ms) as avg_time')
      )
      .orderBy('personalizations', 'desc')
      .limit(10)

    // Get error rates for top campaigns
    const topCampaignsWithErrors = await Promise.all(
      topCampaigns.map(async (campaign) => {
        const errors = await db
          .from('personalization_errors')
          .where('campaign_id', campaign.campaign_id)
          .where('created_at', '>=', startDate)
          .count('* as count')
          .first()

        return {
          campaignId: campaign.campaign_id,
          campaignName: campaign.campaign_name,
          personalizations: parseInt(campaign.personalizations),
          avgTime: parseFloat(campaign.avg_time),
          errorRate: campaign.personalizations > 0 
            ? (parseInt(errors.count) || 0) / parseInt(campaign.personalizations) * 100
            : 0,
        }
      })
    )

    return {
      totalPersonalizations: parseInt(systemStats?.total_personalizations) || 0,
      avgPersonalizationTime: parseFloat(systemStats?.avg_personalization_time) || 0,
      cacheHitRate: systemStats?.total_personalizations > 0
        ? (parseInt(systemStats?.cache_hits) || 0) / parseInt(systemStats?.total_personalizations) * 100
        : 0,
      errorRate: systemStats?.total_personalizations > 0
        ? (parseInt(totalErrors.count) || 0) / parseInt(systemStats?.total_personalizations) * 100
        : 0,
      topPerformingCampaigns: topCampaignsWithErrors,
    }
  }

  /**
   * Create performance alerts based on thresholds
   */
  async checkPerformanceAlerts(): Promise<Array<{
    type: 'high_error_rate' | 'slow_personalization' | 'low_cache_hit_rate'
    message: string
    campaignId?: number
    severity: 'warning' | 'error'
  }>> {
    const alerts: Array<{
      type: 'high_error_rate' | 'slow_personalization' | 'low_cache_hit_rate'
      message: string
      campaignId?: number
      severity: 'warning' | 'error'
    }> = []

    // Check for high error rates (>5%)
    const highErrorCampaigns = await db
      .from('personalization_errors as pe')
      .join('personalization_metrics as pm', 'pe.campaign_id', 'pm.campaign_id')
      .join('campaigns as c', 'pe.campaign_id', 'c.id')
      .where('pe.created_at', '>=', DateTime.now().minus({ hours: 24 }).toSQL())
      .groupBy('pe.campaign_id', 'c.name')
      .having(db.raw('(COUNT(pe.id)::float / COUNT(pm.id)) > 0.05'))
      .select(
        'pe.campaign_id',
        'c.name',
        db.raw('COUNT(pe.id) as errors'),
        db.raw('COUNT(pm.id) as total')
      )

    for (const campaign of highErrorCampaigns) {
      const errorRate = (parseInt(campaign.errors) / parseInt(campaign.total)) * 100
      alerts.push({
        type: 'high_error_rate',
        message: `Campaign "${campaign.name}" has high error rate: ${errorRate.toFixed(1)}%`,
        campaignId: campaign.campaign_id,
        severity: errorRate > 10 ? 'error' : 'warning',
      })
    }

    // Check for slow personalization (>1000ms average)
    const slowCampaigns = await db
      .from('personalization_metrics as pm')
      .join('campaigns as c', 'pm.campaign_id', 'c.id')
      .where('pm.created_at', '>=', DateTime.now().minus({ hours: 24 }).toSQL())
      .groupBy('pm.campaign_id', 'c.name')
      .having(db.raw('AVG(pm.personalization_time_ms) > 1000'))
      .select(
        'pm.campaign_id',
        'c.name',
        db.raw('AVG(pm.personalization_time_ms) as avg_time')
      )

    for (const campaign of slowCampaigns) {
      const avgTime = parseFloat(campaign.avg_time)
      alerts.push({
        type: 'slow_personalization',
        message: `Campaign "${campaign.name}" has slow personalization: ${avgTime.toFixed(0)}ms average`,
        campaignId: campaign.campaign_id,
        severity: avgTime > 2000 ? 'error' : 'warning',
      })
    }

    // Check for low cache hit rate (<70%)
    const lowCacheCampaigns = await db
      .from('personalization_metrics')
      .join('campaigns as c', 'personalization_metrics.campaign_id', 'c.id')
      .where('personalization_metrics.created_at', '>=', DateTime.now().minus({ hours: 24 }).toSQL())
      .groupBy('personalization_metrics.campaign_id', 'c.name')
      .having(db.raw('(COUNT(CASE WHEN from_cache = true THEN 1 END)::float / COUNT(*)) < 0.7'))
      .select(
        'personalization_metrics.campaign_id',
        'c.name',
        db.raw('COUNT(CASE WHEN from_cache = true THEN 1 END) as cache_hits'),
        db.raw('COUNT(*) as total')
      )

    for (const campaign of lowCacheCampaigns) {
      const hitRate = (parseInt(campaign.cache_hits) / parseInt(campaign.total)) * 100
      alerts.push({
        type: 'low_cache_hit_rate',
        message: `Campaign "${campaign.name}" has low cache hit rate: ${hitRate.toFixed(1)}%`,
        campaignId: campaign.campaign_id,
        severity: hitRate < 50 ? 'error' : 'warning',
      })
    }

    return alerts
  }
}
