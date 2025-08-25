import DmCampaign from '#models/dm_campaign'
import FollowerCampaign from '#models/follower_campaign'
import CampaignVariable from '#models/campaign_variable'
import CampaignGroup from '#models/campaign_group'
import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'

@inject()
export default class DmCampaignStatsController {

    /**
     * Obtenir les statistiques d'une campagne
     */
    public async getCampaignStats({ params, response, auth }: HttpContext) {
        try {
            const user = auth.getUserOrFail()
            const campaignId = params.id
            
            const campaign = await DmCampaign.query()
                .where('id', campaignId)
                .where('user_id', user.id)
                .firstOrFail()

            const stats = await this.calculateCampaignStats(campaign)
            return response.json(stats)

        } catch (error) {
            console.error('Error getting campaign stats:', error)
            return response.status(500).json({ error: error.message })
        }
    }

    /**
     * Page du dashboard d'une campagne (pour Inertia)
     */
    public async getCampaignDashboardPage({ params, inertia, auth }: HttpContext) {
        try {
            const user = auth.getUserOrFail()
            const campaignId = params.id

            // Récupérer la campagne et vérifier l'accès
            const campaign = await DmCampaign.query()
                .where('id', campaignId)
                .where('user_id', user.id)
                .firstOrFail()
            

            // Récupérer les variables de la campagne
            const variables = await CampaignVariable.query()
                .where('campaign_id', campaignId)
                .orderBy('created_at', 'asc')

            // Récupérer les groupes de la campagne
            const groups = await CampaignGroup.query()
                .where('campaign_id', campaignId)
                .orderBy('order', 'asc')

            // Calculer les statistiques
            const stats = await this.calculateCampaignStats(campaign)

            // Récupérer quelques followers pour l'affichage (limité pour performance)
            const followers = await FollowerCampaign.query()
                .where('dm_campaign_id', campaignId)
                .orderBy('similarity_score', 'desc')
                .limit(100)

            // Enrichir l'objet campaign avec les variables et groupes
            const enrichedCampaign = {
                ...campaign.toJSON(),
                variables: variables.map((v: any) => v.toJSON()),
                groups: groups.map((g: any) => {
                    const groupJson = g.toJSON()
                    return {
                        ...groupJson,
                        conditions: typeof groupJson.conditions === 'string' 
                            ? JSON.parse(groupJson.conditions) 
                            : groupJson.conditions
                    }
                })
            }
            
            return inertia.render('CampaignDashboard', {
                user: user.toJSON(),
                campaign: enrichedCampaign,
                stats,
                followers: followers.map((f) => ({
                    ...f.toJSON(),
                    similarity_score: f.similarityScore || 0
                }))
            })
        } catch (error) {
            console.error('Error loading campaign dashboard page:', error)
            return inertia.render('CampaignDashboard', {
                user: auth.user?.toJSON() || {},
                campaign: null,
                stats: null,
                followers: [],
                error: 'Failed to load campaign dashboard'
            })
        }
    }

    /**
     * Page des statistiques d'une campagne (pour Inertia)
     */
    public async getCampaignStatsPage({ params, inertia, auth, request }: HttpContext) {
        try {
            const user = auth.getUserOrFail()
            const campaignId = params.id

            // Récupérer la campagne et vérifier l'accès
            const campaign = await DmCampaign.query()
                .where('id', campaignId)
                .where('user_id', user.id)
                .firstOrFail()

            // Calculer les statistiques
            const stats = await this.calculateCampaignStats(campaign)
            
            // Récupérer les groupes de la campagne
            const groups = await CampaignGroup.query()
                .where('campaign_id', campaignId)
                .orderBy('order', 'asc')
            
            // Paramètres de pagination et filtres depuis l'URL
            const page = Number(request.input('page', 1))
            const limit = Number(request.input('limit', 50))
            const filter = request.input('filter', 'all')
            const search = request.input('search', '')
            const sortBy = request.input('sort', 'similarity_desc')

            // Récupérer les followers avec pagination et filtres
            const followersData = await this.getAnalyzedFollowersPaginated(
                campaignId, 
                page, 
                limit, 
                filter, 
                search, 
                sortBy
            )

            return inertia.render('CampaignStats', {
                stats,
                groups,
                followersData,
                error: null
            })
        } catch (error) {
            console.error('Error loading campaign stats page:', error)
            return inertia.render('CampaignStats', {
                stats: null,
                groups: [],
                followersData: { followers: [], pagination: null, counts: {}, filters: { filter: 'all', search: '', sortBy: 'similarity_desc' } },
                error: 'Failed to load campaign statistics'
            })
        }
    }

    /**
     * Obtenir les followers analysés avec pagination et filtres
     */
    public async getAnalyzedFollowers({ params, request, response, auth }: HttpContext) {
        try {
            const user = auth.getUserOrFail()
            const campaignId = params.id
            const { 
                page = 1, 
                limit = 20, 
                interestLevel, 
                search 
            } = request.only(['page', 'limit', 'interestLevel', 'search'])
            // Vérifier que l'utilisateur possède cette campagne
            await DmCampaign.query()
                .where('id', campaignId)
                .where('user_id', user.id)
                .firstOrFail()

            const query = FollowerCampaign.query()
                .where('dm_campaign_id', campaignId)

            // Filtrer par niveau d'intérêt si spécifié
            if (interestLevel) {
                query.where('interest_level', interestLevel)
            }

            // Recherche par handle ou bio si spécifiée
            if (search) {
                query.where((builder) => {
                    builder
                        .whereILike('follower_handle', `%${search}%`)
                        .orWhereILike('bio', `%${search}%`)
                })
            }

            const followers = await query
                .orderBy('similarity_score', 'desc')
                .paginate(page, limit)

            // Safe serialization of followers
            const safeFollowers = {
                ...followers.toJSON(),
                data: followers.map(f => {
                    try {
                        return f.toJSON()
                    } catch (error) {
                        console.error('Error serializing follower:', error)
                        return {
                            id: f.id,
                            followerHandle: f.followerHandle,
                            interestLevel: f.interestLevel,
                            similarityScore: f.similarityScore
                        }
                    }
                })
            }

            return response.json({ followers: safeFollowers })

        } catch (error) {
            console.error('Error getting analyzed followers:', error)
            return response.status(500).json({ error: error.message })
        }
    }

    /**
     * API pour obtenir les followers analysés avec pagination et filtres
     */
    public async getAnalyzedFollowersPaginatedApi({ params, request, response, auth }: HttpContext) {
        try {
            const user = auth.getUserOrFail()
            const campaignId = params.id

            // Vérifier l'accès à la campagne
            await DmCampaign.query()
                .where('id', campaignId)
                .where('user_id', user.id)
                .firstOrFail()

            // Paramètres de pagination et filtres
            const page = Number(request.input('page', 1))
            const limit = Number(request.input('limit', 50))
            const filter = request.input('filter', 'all')
            const search = request.input('search', '')
            const sortBy = request.input('sort', 'similarity_desc')

            // Récupérer les données paginées
            const followersData = await this.getAnalyzedFollowersPaginated(
                campaignId, 
                page, 
                limit, 
                filter, 
                search, 
                sortBy
            )

            return response.json(followersData)
        } catch (error) {
            console.error('Error fetching paginated followers:', error)
            return response.status(500).json({ 
                error: 'Failed to fetch followers data',
                followers: [],
                pagination: null,
                counts: {}
            })
        }
    }

    /**
     * Récupérer les followers analysés avec pagination et filtres optimisés
     */
    private async getAnalyzedFollowersPaginated(
        campaignId: number,
        page: number = 1,
        limit: number = 50,
        filter: string = 'all',
        search: string = '',
        sortBy: string = 'similarity_desc'
    ) {
        const offset = (page - 1) * limit

        // Construire la query de base
        let query = FollowerCampaign.query().where('dm_campaign_id', campaignId)

        // Appliquer les filtres
        if (filter !== 'all') {
            query = query.where('interest_level', filter)
        }

        if (search.trim()) {
            query = query.where((builder) => {
                builder
                    .whereILike('follower_handle', `%${search}%`)
                    .orWhereILike('bio', `%${search}%`)
            })
        }

        // Appliquer le tri
        switch (sortBy) {
            case 'similarity_desc':
                query = query.orderBy('similarity_score', 'desc')
                break
            case 'similarity_asc':
                query = query.orderBy('similarity_score', 'asc')
                break
            case 'handle':
                query = query.orderBy('follower_handle', 'asc')
                break
            default:
                query = query.orderBy('id', 'asc')
        }

        // Exécuter la query avec pagination
        const followers = await query.offset(offset).limit(limit)

        // Compter le total pour la pagination
        let countQuery = FollowerCampaign.query().where('dm_campaign_id', campaignId)
        
        if (filter !== 'all') {
            countQuery = countQuery.where('interest_level', filter)
        }

        if (search.trim()) {
            countQuery = countQuery.where((builder) => {
                builder
                    .whereILike('follower_handle', `%${search}%`)
                    .orWhereILike('bio', `%${search}%`)
            })
        }

        const totalCount = await countQuery.count('* as total')
        const total = Number(totalCount[0].$extras.total)

        // Calculer les compteurs par niveau d'intérêt pour les filtres
        const countsQuery = await FollowerCampaign.query()
            .where('dm_campaign_id', campaignId)
            .groupBy('interest_level')
            .select('interest_level')
            .count('* as count')

        const counts = countsQuery.reduce((acc, item: any) => {
            const interestLevel = item.$extras.interest_level || item.interest_level
            if (interestLevel) {
                acc[interestLevel] = Number(item.$extras.count)
            }
            return acc
        }, {} as Record<string, number>)

        // Ajouter le total
        counts.all = Object.values(counts).reduce((sum, count) => sum + count, 0)

        const pagination = {
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalCount: total,
            hasNextPage: page < Math.ceil(total / limit),
            hasPrevPage: page > 1,
            perPage: limit
        }

        return {
            followers,
            pagination,
            counts,
            filters: { filter, search, sortBy }
        }
    }

    /**
     * Calculer les statistiques d'une campagne
     */
    private async calculateCampaignStats(campaign: DmCampaign) {
        // Vérifier d'abord s'il y a des FollowerCampaign pour cette campagne
        const totalFollowers = await FollowerCampaign.query()
            .where('dm_campaign_id', campaign.id)
            .count('* as total')
        
        // ✅ NOUVEAU: Calculer le nombre de followers déjà contactés
        const alreadyContactedQuery = await FollowerCampaign.query()
            .where('dm_campaign_id', campaign.id)
            .where('message_sent', true)
            .count('* as total')
        
        const alreadyContactedFromFollowers = Number(alreadyContactedQuery[0].$extras.total)
        const alreadyContactedCount = Math.max(
            campaign.alreadyContactedCount || 0, 
            alreadyContactedFromFollowers
        )
        
        // Si pas de données FollowerCampaign, utiliser les données de la campagne directement
        if (Number(totalFollowers[0].$extras.total) === 0) {
            const breakdown = {
                total: campaign.totalFollowersAnalyzed || 0,
                interested: campaign.interestedFollowers || 0,
                moderatelyInterested: campaign.moderatelyInterestedFollowers || 0,
                notInterested: campaign.notInterestedFollowers || 0,
                excluded: campaign.excludedFollowers || 0,
                cannotDetermine: campaign.cannotDetermineFollowers || 0,
                messagesSent: campaign.number_of_message_sent || 0,
                responsesReceived: 0,
                alreadyContacted: alreadyContactedCount  
            }

            return {
                campaign: {
                    id: campaign.id,
                    name: campaign.name,
                    analysisStatus: campaign.analysisStatus,
                    totalFollowersAnalyzed: campaign.totalFollowersAnalyzed || 0,
                    interestedFollowers: campaign.interestedFollowers || 0,
                    moderatelyInterestedFollowers: campaign.moderatelyInterestedFollowers || 0,
                    notInterestedFollowers: campaign.notInterestedFollowers || 0,
                    excludedFollowers: campaign.excludedFollowers || 0,
                    cannotDetermineFollowers: campaign.cannotDetermineFollowers || 0,
                    targetCount: campaign.targetCount,
                    messagesSent: campaign.number_of_message_sent || 0,
                    interestedThreshold: campaign.interestedThreshold,
                    moderatelyInterestedThreshold: campaign.moderatelyInterestedThreshold,
                    analysisStartedAt: campaign.analysisStartedAt?.toISO(),
                    analysisCompletedAt: campaign.analysisCompletedAt?.toISO(),
                    executionStartedAt: campaign.executionStartedAt?.toISO(),
                    executionCompletedAt: campaign.executionCompletedAt?.toISO(),
                    alreadyContactedCount: alreadyContactedCount,  // ✅ NOUVEAU
                    alreadyContactedFollowers: alreadyContactedCount  // ✅ COMPAT frontend
                },
                breakdown
            }
        }

        // Calculer les compteurs depuis FollowerCampaign pour plus de précision
        const followerCounts = await FollowerCampaign.query()
            .where('dm_campaign_id', campaign.id)
            .groupBy('interest_level')
            .select('interest_level')
            .count('* as count')

        let interestedCount = 0
        let moderatelyInterestedCount = 0
        let notInterestedCount = 0
        let excludedCount = 0
        let cannotDetermineCount = 0

        followerCounts.forEach((item: any) => {
            const count = Number(item.$extras.count)
            const interestLevel = item.interestLevel || item.$extras.interest_level
            
            switch (interestLevel) {
                case 'interested':
                    interestedCount = count
                    break
                case 'moderately_interested':
                    moderatelyInterestedCount = count
                    break
                case 'not_interested':
                    notInterestedCount = count
                    break
                case 'excluded':
                    excludedCount = count
                    break
                case 'cannot_determine':
                    cannotDetermineCount = count
                    break
                default:
                    console.warn(`Unknown interest level: ${interestLevel}`)
            }
        })

        // Calculer les messages envoyés depuis FollowerCampaign
        const messagesSentQuery = await FollowerCampaign.query()
            .where('dm_campaign_id', campaign.id)
            .where('message_sent', true)
            .count('* as total')

        const messagesSentFromFollowers = Number(messagesSentQuery[0].$extras.total)

        // Calculer les réponses reçues
        const responsesReceived = await FollowerCampaign.query()
            .where('dm_campaign_id', campaign.id)
            .where('response_received', true)
            .count('* as total')

        const breakdown = {
            total: campaign.totalFollowersAnalyzed || 0,
            interested: interestedCount,
            moderatelyInterested: moderatelyInterestedCount,
            notInterested: notInterestedCount,
            excluded: excludedCount,
            cannotDetermine: cannotDetermineCount,
            messagesSent: Math.max(campaign.number_of_message_sent || 0, messagesSentFromFollowers),
            responsesReceived: Number(responsesReceived[0].$extras.total),
            alreadyContacted: alreadyContactedCount  // ✅ NOUVEAU
        }

        return {
            campaign: {
                id: campaign.id,
                name: campaign.name,
                analysisStatus: campaign.analysisStatus,
                totalFollowersAnalyzed: campaign.totalFollowersAnalyzed || 0,
                interestedFollowers: interestedCount,
                moderatelyInterestedFollowers: moderatelyInterestedCount,
                notInterestedFollowers: notInterestedCount,
                excludedFollowers: excludedCount,
                cannotDetermineFollowers: cannotDetermineCount,
                targetCount: campaign.targetCount,
                messagesSent: Math.max(campaign.number_of_message_sent || 0, messagesSentFromFollowers),
                interestedThreshold: campaign.interestedThreshold,
                moderatelyInterestedThreshold: campaign.moderatelyInterestedThreshold,
                analysisStartedAt: campaign.analysisStartedAt?.toISO(),
                analysisCompletedAt: campaign.analysisCompletedAt?.toISO(),
                executionStartedAt: campaign.executionStartedAt?.toISO(),
                executionCompletedAt: campaign.executionCompletedAt?.toISO(),
                alreadyContactedFollowers: alreadyContactedCount  // ✅ COMPAT frontend
            },
            breakdown   
        }
    }
}
