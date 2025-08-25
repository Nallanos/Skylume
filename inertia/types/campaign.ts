// Types centralisés pour les campagnes DM
export interface User {
  id: number
  email: string
  plan?: string
  name?: string
}

export interface Campaign {
  id: number
  name: string
  accountHandle: string
  strategy: string
  keywords: string // Backend sends JSON string
  excludeKeywords?: string // New field for exclude keywords
  targetCount: number
  analysisStatus: string
  executionStatus?: string
  interestedThreshold?: number
  moderatelyInterestedThreshold?: number
  createdAt: string
  updatedAt: string
  variables?: CampaignVariable[]
  groups?: CampaignGroup[]
}

export interface CampaignVariable {
  id: number
  campaign_id: number
  name: string
  type: string
  configuration: Record<string, any>
  created_at: string
  updated_at: string
}

export interface CampaignGroup {
  id: number
  campaignId: number // Frontend property
  campaign_id: number // Backend property (alias)
  name: string
  conditions: Record<string, any>
  order: number // Frontend property
  priority: number // Backend property (alias)
  targetCount: number // Frontend property
  target_count: number // Backend property (alias)
  messagesSent: number // Frontend property
  messages_sent: number // Backend property (alias)
  message?: string
  explicitLinks?: Array<{ text: string, url: string }> | null
  createdAt: string
  updatedAt: string
  created_at: string // Backend property (alias)
  updated_at: string // Backend property (alias)
  messages?: CampaignGroupMessage[]
  loading_estimation?: boolean // Pour le mode async (frontend uniquement)
}

export interface CampaignGroupMessage {
  id: number
  campaign_group_id: number
  content: string
  weight: number
  created_at: string
  updated_at: string
}

export interface CampaignMessage {
  id: number
  interestLevel: 'interested' | 'moderately_interested'
  message: string
  subject?: string
  isActive: boolean
}

export interface FollowerCampaign {
  id: number
  followerHandle: string
  followerDisplayName?: string
  followerBio?: string
  followerDid?: string
  interestLevel?: 'interested' | 'moderately_interested' | 'not_interested' | 'excluded' | 'cannot_determine'
  similarityScore?: number
  messageSent: boolean
  responseReceived?: boolean
  messageSentAt?: string
  responseReceivedAt?: string
  bioQuality?: string
  alreadyContacted: boolean
}

export interface CampaignBreakdown {
  total: number
  interested: number
  moderatelyInterested: number
  notInterested: number
  excluded: number
  cannotDetermine: number
  messagesSent: number
  responsesReceived: number
  alreadyContacted: number
}

export interface CampaignStatsData {
  id: number
  name: string
  analysisStatus: string
  totalFollowersAnalyzed: number
  interestedFollowers: number
  moderatelyInterestedFollowers: number
  notInterestedFollowers: number
  excludedFollowers: number
  cannotDetermineFollowers: number
  alreadyContactedFollowers: number
  targetCount: number
  messagesSent: number
  interestedThreshold: number
  moderatelyInterestedThreshold: number
  analysisStartedAt?: string
  analysisCompletedAt?: string
  executionStartedAt?: string
  executionCompletedAt?: string
}

export interface CampaignStats {
  campaign: CampaignStatsData
  breakdown: CampaignBreakdown
}

export interface Pagination {
  currentPage: number
  totalPages: number
  totalCount: number
  hasNextPage: boolean
  hasPrevPage: boolean
  perPage: number
}

export interface FollowersData {
  followers: FollowerCampaign[]
  pagination: Pagination | null
  counts: Record<string, number>
  filters: {
    filter: string
    search: string
    sortBy: string
  }
}

// Props interfaces
export interface CampaignDashboardProps {
  user: User
  campaign: Campaign
  stats?: CampaignStats
  followers?: FollowerCampaign[]
}

export interface CampaignStatsProps {
  user: User
  stats: CampaignStats | null
  groups?: CampaignGroup[]
  followersData?: FollowersData
  error?: string
}

export interface CampaignMessagesManagerProps {
  campaignId: number
  onUpdate?: () => void
}

export interface GroupManagerProps {
  campaignId: number
  groups: CampaignGroup[]
  variables: CampaignVariable[]
  onGroupUpdate?: () => void
  useAsyncLoading?: boolean
}

export interface VariableManagerProps {
  campaignId: number
  variables: CampaignVariable[]
  onVariableUpdate?: () => void
}

export interface GroupStatsProps {
  groups: CampaignGroup[]
  className?: string
}
