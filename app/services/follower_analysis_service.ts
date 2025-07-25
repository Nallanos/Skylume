import Account from '#models/account'
import SuperCluster from '#models/superCluster'
import Cluster from '#models/cluster'
import AccountManager from './account_manager.js';
import { AIService } from './AI_services.js';
import { inject } from '@adonisjs/core';

@inject()
export default class FollowerAnalysisService {

    constructor(
        protected account_manager: AccountManager,
        protected targetAudienceService: AIService
    ) { }

    /**
     * Crée uniquement des SuperClusters basés sur la proximité des centroïdes
     * Nouvelle logique: trouve le SuperCluster le plus proche par centroïde et l'assigne
     * Recalcule le tag et le centroïde avec les nouveaux membres
     */
    public async createClustersFromData(account: Account, clustersData: ClusterData[]) {
        console.log("🚀 Creating SuperClusters with CENTROID-BASED logic:", clustersData.length, "clusters")

        // Filter clusters by minimum size (>=3 members)
        const validClusters = clustersData.filter(cluster => cluster.size >= 3)
        console.log(`📊 Filtered to ${validClusters.length} clusters with minimum size of 3`)

        if (validClusters.length === 0) {
            console.log("⚠️  No clusters meet minimum size requirement")
            return
        }

        // Get existing SuperClusters for this account
        const existingSuperClusters = await SuperCluster.query()
            .where('accountHandle', account.handle)

        console.log(`🔍 Found ${existingSuperClusters.length} existing SuperClusters`)

        // Process each cluster individually using centroid proximity
        for (const cluster of validClusters) {
            await this.assignToNearestSuperCluster(cluster, existingSuperClusters, account)
        }

        // Handle small clusters by trying to merge them with existing SuperClusters
        const smallClusters = clustersData.filter(cluster => cluster.size < 3)
        if (smallClusters.length > 0) {
            console.log(`🔧 Processing ${smallClusters.length} small clusters for potential merging`)
            await this.mergeSmallClustersWithSuperClusters(account, smallClusters, existingSuperClusters)
        }

        console.log("🎉 SuperCluster creation completed with CENTROID-BASED assignment!")

        // Final summary
        const finalSuperClusters = await SuperCluster.query().where('accountHandle', account.handle)
        console.log(`📊 FINAL SUMMARY for ${account.handle}:`)
        console.log(`   • Total SuperClusters: ${finalSuperClusters.length}`)

        // Display each SuperCluster with its size
        for (const superCluster of finalSuperClusters) {
            console.log(`   🎯 SuperCluster "${superCluster.tag}": ${superCluster.size} members`)
        }
    }

    /**
     * Assigne un cluster au SuperCluster le plus proche basé sur la similarité des centroïdes
     * Crée un nouveau SuperCluster si aucun n'est suffisamment proche
     */
    private async assignToNearestSuperCluster(
        cluster: ClusterData,
        existingSuperClusters: SuperCluster[],
        account: Account
    ): Promise<void> {
        const clusterCentroid = this.getClusterCentroid(cluster)

        if (clusterCentroid.length === 0) {
            console.warn(`⚠️ No valid centroid for cluster "${cluster.tag}", skipping...`)
            return
        }

        // Calculer les distances vers tous les SuperClusters existants
        const distances: { superCluster: SuperCluster, distance: number, similarity: number }[] = []

        for (const superCluster of existingSuperClusters) {
            const superClusterCentroid = Array.isArray(superCluster.embeddings)
                ? superCluster.embeddings
                : JSON.parse(superCluster.embeddings || '[]')

            if (superClusterCentroid.length > 0) {
                const similarity = this.cosineSimilarityTF(clusterCentroid, superClusterCentroid)
                const distance = 1 - similarity // Convert similarity to distance

                distances.push({
                    superCluster,
                    distance,
                    similarity
                })
            }
        }

        // Trier par distance (plus proche en premier)
        distances.sort((a, b) => a.distance - b.distance)

        // Seuil de similarité minimum pour l'assignation (70%)
        const MIN_SIMILARITY_THRESHOLD = 0.70

        if (distances.length > 0 && distances[0].similarity >= MIN_SIMILARITY_THRESHOLD) {
            // Assigner au SuperCluster le plus proche
            const nearestSuperCluster = distances[0].superCluster
            console.log(`🔗 Assigning cluster "${cluster.tag}" to nearest SuperCluster "${nearestSuperCluster.tag}" (similarity: ${distances[0].similarity.toFixed(3)})`)

            await this.addClusterToSuperCluster(cluster, nearestSuperCluster, account)
        } else {
            // Créer un nouveau SuperCluster
            console.log(`✨ Creating new SuperCluster for cluster "${cluster.tag}" (no suitable match found)`)
            await this.createNewSuperCluster(cluster, account)
        }
    }

    /**
     * Ajoute un cluster à un SuperCluster existant et recalcule le centroïde et le tag
     */
    private async addClusterToSuperCluster(
        cluster: ClusterData,
        superCluster: SuperCluster,
        account: Account
    ): Promise<void> {
        // Obtenir tous les clusters actuels de ce SuperCluster (pour recalculer le centroïde)
        const existingClusters = await Cluster.query()
            .where('superClusterId', superCluster.id)
            .where('accountHandle', account.handle)

        // Ajouter le nouveau cluster aux handles et calculs
        const allHandles = [
            ...(superCluster.handles as string[] || []),
            ...cluster.handles
        ]

        // Recalculer le centroïde avec tous les clusters (existants + nouveau)
        const allEmbeddings: number[][] = [
            ...(Array.isArray(superCluster.embeddings) ? [superCluster.embeddings] : [JSON.parse(superCluster.embeddings || '[]')]),
            this.getClusterCentroid(cluster)
        ]

        // Ajouter les centroïdes des clusters existants
        for (const existingCluster of existingClusters) {
            const existingCentroid = Array.isArray(existingCluster.embeddings)
                ? existingCluster.embeddings
                : JSON.parse(existingCluster.embeddings || '[]')
            if (existingCentroid.length > 0) {
                allEmbeddings.push(existingCentroid)
            }
        }

        const newCentroid = this.calculateAverageEmbedding(allEmbeddings.filter(emb => emb.length > 0))
        const newSize = superCluster.size + cluster.size

        // Générer un nouveau tag basé sur tous les clusters
        const allClusterTags = [
            superCluster.tag,
            cluster.tag,
            ...existingClusters.map(c => c.tag)
        ]
        const newTag = await this.generateCombinedTag(allClusterTags)

        // Mettre à jour le SuperCluster
        await SuperCluster.query()
            .where('id', superCluster.id)
            .update({
                tag: newTag,
                size: newSize,
                embeddings: newCentroid,
                handles: allHandles
            })

        console.log(`🔄 Updated SuperCluster "${newTag}" (was "${superCluster.tag}") - new size: ${newSize}`)
    }

    /**
     * Crée un nouveau SuperCluster à partir d'un cluster
     */
    private async createNewSuperCluster(cluster: ClusterData, account: Account): Promise<SuperCluster> {
        const superCluster = await SuperCluster.create({
            tag: cluster.tag,
            size: cluster.size,
            embeddings: this.getClusterCentroid(cluster),
            handles: cluster.handles,
            accountHandle: account.handle,
            robustnessLevel: cluster.robustnessLevel || null,
            robustnessTag: cluster.robustnessTag || null,
            pipelineStep: cluster.pipelineStep || null,
            clusteringMethod: 'CentroidBased',
            skipTagging: cluster.skipTagging || false,
            processingStatus: cluster.processingStatus || 'processed'
        })

        console.log(`✅ Created new SuperCluster: "${superCluster.tag}" (${superCluster.size} members)`)
        return superCluster
    }

    /**
     * Fusionne les petits clusters avec les SuperClusters existants
     */
    private async mergeSmallClustersWithSuperClusters(
        account: Account,
        smallClusters: ClusterData[],
        existingSuperClusters: SuperCluster[]
    ): Promise<void> {
        console.log(`🔧 Attempting to merge ${smallClusters.length} small clusters with existing SuperClusters`)

        for (const smallCluster of smallClusters) {
            const smallClusterCentroid = this.getClusterCentroid(smallCluster)

            if (smallClusterCentroid.length === 0) {
                console.warn(`⚠️ No valid centroid for small cluster "${smallCluster.tag}", skipping...`)
                continue
            }

            let bestMatch: { superCluster: SuperCluster, similarity: number } | null = null

            // Trouver le SuperCluster le plus proche
            for (const superCluster of existingSuperClusters) {
                const superClusterCentroid = Array.isArray(superCluster.embeddings)
                    ? superCluster.embeddings
                    : JSON.parse(superCluster.embeddings || '[]')

                if (superClusterCentroid.length > 0) {
                    const similarity = this.cosineSimilarityTF(smallClusterCentroid, superClusterCentroid)

                    if (!bestMatch || similarity > bestMatch.similarity) {
                        bestMatch = { superCluster, similarity }
                    }
                }
            }

            // Seuil plus bas pour les petits clusters (60%)
            const MIN_SIMILARITY_FOR_SMALL = 0.60

            if (bestMatch && bestMatch.similarity >= MIN_SIMILARITY_FOR_SMALL) {
                console.log(`🔗 Merging small cluster "${smallCluster.tag}" with SuperCluster "${bestMatch.superCluster.tag}" (similarity: ${bestMatch.similarity.toFixed(3)})`)
                await this.addClusterToSuperCluster(smallCluster, bestMatch.superCluster, account)
            } else {
                console.log(`🏷️ Creating standalone SuperCluster for small cluster "${smallCluster.tag}" (no suitable match)`)
                await this.createNewSuperCluster(smallCluster, account)
            }
        }
    }
    private getClusterCentroid(clusterData: ClusterData): number[] {
        // ✅ PRIORITY 1: If centroid is explicitly provided, use it directly
        if (clusterData.centroid && Array.isArray(clusterData.centroid) && clusterData.centroid.length > 0) {
            console.log(`✅ Using provided centroid for cluster "${clusterData.tag}" (${clusterData.centroid.length} dimensions)`)
            return clusterData.centroid
        }

        // ✅ PRIORITY 2: If embedding is already a single vector (centroid), return it
        if (Array.isArray(clusterData.embedding) && clusterData.embedding.length > 0) {
            // Check if it's a flat array of numbers (single embedding/centroid)
            if (typeof clusterData.embedding[0] === 'number') {
                console.log(`✅ Using embedding as centroid for cluster "${clusterData.tag}" (${clusterData.embedding.length} dimensions)`)
                return clusterData.embedding as number[]
            }

            // ✅ PRIORITY 3: If embedding is an array of arrays (multiple member embeddings), calculate centroid
            if (Array.isArray(clusterData.embedding[0])) {
                console.log(`🧮 Calculating centroid for cluster "${clusterData.tag}" from ${clusterData.embedding.length} member embeddings`)
                return this.calculateAverageEmbedding(clusterData.embedding as unknown as number[][])
            }
        }

        // Return empty array if no valid embedding found
        console.warn(`⚠️ No valid embedding found for cluster "${clusterData.tag}"`)
        return []
    }

    /**
     * Calcule la similarité cosinus entre deux vecteurs
     * Implémentation simple et efficace sans dépendances externes
     */
    private cosineSimilarityTF(a: number[] | unknown, b: number[] | string | unknown): number {
        try {
            // Convertir et valider les entrées
            const vecA = this.normalizeVector(a);
            const vecB = this.normalizeVector(b);

            // Vérifier si les vecteurs sont valides (silently handle empty vectors)
            if (!vecA.length || !vecB.length) {
                return 0;
            }

            // Utiliser la plus petite dimension commune
            const minLength = Math.min(vecA.length, vecB.length);

            // Calculer le produit scalaire
            let dotProduct = 0;
            let normA = 0;
            let normB = 0;

            for (let i = 0; i < minLength; i++) {
                dotProduct += vecA[i] * vecB[i];
                normA += vecA[i] * vecA[i];
                normB += vecB[i] * vecB[i];
            }

            // Éviter la division par zéro
            if (normA === 0 || normB === 0) {
                return 0;
            }

            // Formule de similarité cosinus: cos(θ) = (A·B)/(||A||·||B||)
            return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
        } catch (error) {
            console.error('Erreur lors du calcul de similarité cosinus:', error);
            return 0;
        }
    }

    /**
     * Normalise et convertit différents types d'entrées en vecteur numérique
     */
    private normalizeVector(input: any): number[] {
        if (!input) return [];

        // Si c'est déjà un tableau
        if (Array.isArray(input)) {
            return input.filter(val => typeof val === 'number');
        }

        // Si c'est une chaîne JSON
        if (typeof input === 'string') {
            try {
                const parsed = JSON.parse(input);
                return Array.isArray(parsed) ? parsed.filter(val => typeof val === 'number') : [];
            } catch {
                return [];
            }
        }

        return [];
    }

    /**
     * Calculate average embedding from multiple embeddings
     * @param embeddings Array of embedding vectors
     * @returns Average embedding vector
     */
    private calculateAverageEmbedding(embeddings: number[][]): number[] {
        if (embeddings.length === 0) return []

        const dimensions = embeddings[0]?.length || 0
        if (dimensions === 0) return []

        const sum = new Array(dimensions).fill(0)

        for (const embedding of embeddings) {
            if (embedding.length !== dimensions) {
                console.warn('Inconsistent embedding dimensions detected')
                continue
            }

            for (let i = 0; i < dimensions; i++) {
                sum[i] += embedding[i]
            }
        }

        // Calculate average and normalize
        const average = sum.map(value => value / embeddings.length)
        const norm = Math.sqrt(average.reduce((sum, value) => sum + value * value, 0))

        return norm > 0 ? average.map(value => value / norm) : average
    }

    /**
     * Génère un tag combiné à partir de plusieurs tags de clusters en utilisant WordNet
     */
    private async generateCombinedTag(tags: string[]): Promise<string> {
        try {
            // Utiliser le service AI avec WordNet pour une analyse sémantique sophistiquée
            const aiGeneratedTag = await this.targetAudienceService.generateCombinedClusterTag(tags)
            if (aiGeneratedTag && aiGeneratedTag.trim().length > 0) {
                return aiGeneratedTag.trim()
            }
        } catch (error) {
            console.warn('Failed to generate AI-based combined tag:', error)
        }

        // Fallback: utiliser le tag le plus long ou le plus descriptif
        const validTags = tags.filter(tag => tag && tag.trim().length > 0)
        if (validTags.length === 0) return 'Mixed Community'

        // Retourner le tag le plus long (généralement plus descriptif)
        return validTags.reduce((longest, current) =>
            current.length > longest.length ? current : longest
        )
    }
}

export type ClusterData = {
    tag: string,
    handles: string[],
    keywords: string[],
    embedding: number[]
    centroid?: number[]  // ✅ NEW: Explicit centroid field for clarity
    size: number,
    cohesion: number | null,
    persistence?: number | null,
    // 🎯 NEW: Robustness fields from graduated pipeline
    robustnessLevel?: string | null,
    robustnessTag?: string | null,
    pipelineStep?: number | null,
    clusteringMethod?: string | null,
    skipTagging?: boolean,
    processingStatus?: string | null
}

export type ClusterResult = ClusterData & {
    clusterType: 'new' | 'existing',
    superClusterId: number
}

export type AnalysisResult = {
    clusters: ClusterResult[],
    clustersData: ClusterData[],
    account_insights: Array<{
        category: string,
        insights: {
            topInterests: string[],
            activeHours: string[],
            demographicTrends: string
        }
    }>,
    content_suggestions: Array<{
        title: string,
        description: string,
        type: string
    }>
}
