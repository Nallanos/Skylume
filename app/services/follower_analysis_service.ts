import Account from '#models/account'
import SuperCluster from '#models/superCluster'
import Cluster from '#models/cluster'
import AccountManager from './account_manager.js';
import { TargetAudienceService } from './AI_services.js';
import { inject } from '@adonisjs/core';

@inject()
export default class FollowerAnalysisService {

    constructor(
        protected account_manager: AccountManager,
        protected targetAudienceService: TargetAudienceService
    ) { }


    /**
     * Crée des clusters et superclusters à partir de données déjà traitées
     * Cette méthode est utilisée par le système de batch pour créer les clusters
     * à partir des résultats agrégés de plusieurs batches
     * 
     * ✅ UTILISE LA NOUVELLE LOGIQUE HYBRIDE: 60% embeddings + 40% tag semantics
     */
    public async createClustersFromData(account: Account, clustersData: ClusterData[]) {
        console.log("🚀 Creating clusters with HYBRID semantic similarity:", clustersData.length, "clusters")

        // Filter clusters by minimum size (>=3 members)
        const validClusters = clustersData.filter(cluster => cluster.size >= 3)
        console.log(`📊 Filtered to ${validClusters.length} clusters with minimum size of 3`)

        if (validClusters.length === 0) {
            console.log("⚠️  No clusters meet minimum size requirement")
            return
        }

        const existingSuperClusters = await SuperCluster.query()
            .where('accountHandle', account.handle)

        // ✅ MUCH MORE PERMISSIVE: Lower base threshold for better SuperCluster creation
        const dynamicThreshold = await this.calculateDynamicThreshold(validClusters, 0.15) // Lowered from 0.25
        const superClusterGroups = await this.groupClustersBySimilarity(validClusters, dynamicThreshold)
        console.log(`🎯 Grouped ${validClusters.length} clusters into ${superClusterGroups.length} SuperCluster groups using HYBRID similarity`)

        // 🐛 DEBUG: Show group sizes
        superClusterGroups.forEach((group, index) => {
            console.log(`📦 Group ${index + 1}: ${group.length} clusters - [${group.map(c => `"${c.tag}"`).join(', ')}]`)
        })

        for (const group of superClusterGroups) {
            console.log(`🔍 Processing group with ${group.length} clusters: [${group.map(c => `"${c.tag}"`).join(', ')}]`)

            // Single cluster logic
            if (group.length === 1) {
                const singleCluster = group[0]
                let matchedSuperCluster = null

                console.log(`⚠️  Single cluster detected: "${singleCluster.tag}" - checking for existing SuperCluster match`)

                // ✅ NEW: Use hybrid similarity for matching existing SuperClusters
                for (const existingSuperCluster of existingSuperClusters) {
                    const hybridSimilarity = await this.calculateHybridSimilarity(
                        singleCluster,
                        { tag: existingSuperCluster.tag, embedding: existingSuperCluster.embeddings } as ClusterData
                    )

                    if (hybridSimilarity > 0.30) { // Lowered from 0.40 - more permissive for single clusters
                        matchedSuperCluster = existingSuperCluster
                        console.log(`🔗 Single cluster "${singleCluster.tag}" matched existing SuperCluster "${existingSuperCluster.tag}" (hybrid: ${hybridSimilarity.toFixed(3)})`)
                        break
                    }
                }

                // Create standalone cluster
                await Cluster.create({
                    tag: singleCluster.tag,
                    size: singleCluster.size,
                    superClusterId: matchedSuperCluster?.id || null,
                    handles: singleCluster.handles, // Model handles serialization
                    embeddings: singleCluster.embedding, // Model handles serialization
                    accountHandle: account.handle
                })

                if (!matchedSuperCluster) {
                    console.log(`🏷️  Created standalone cluster: "${singleCluster.tag}" (no SuperCluster needed)`)
                } else {
                    console.log(`✅ Created cluster "${singleCluster.tag}" linked to SuperCluster "${matchedSuperCluster.tag}"`)
                }

                continue
            }

            // Multiple clusters → SuperCluster logic
            console.log(`🏗️  MULTIPLE CLUSTERS DETECTED - Creating SuperCluster for ${group.length} clusters`)

            let matchedSuperCluster = null
            const groupEmbedding = this.calculateAverageEmbedding(group.map(c => c.embedding))

            // ✅ NEW: Use hybrid similarity for existing SuperCluster matching
            for (const existingSuperCluster of existingSuperClusters) {
                // Create a representative cluster for the group to compare
                const groupRepresentative: ClusterData = {
                    tag: group[0].tag, // Use first cluster's tag as representative
                    embedding: groupEmbedding,
                    handles: [],
                    keywords: [],
                    size: 0,
                    cohesion: 0
                }

                const hybridSimilarity = await this.calculateHybridSimilarity(
                    groupRepresentative,
                    { tag: existingSuperCluster.tag, embedding: existingSuperCluster.embeddings } as ClusterData
                )

                console.log(`🔍 Comparing group with existing SuperCluster "${existingSuperCluster.tag}": HYBRID similarity ${hybridSimilarity.toFixed(3)}`)

                if (hybridSimilarity > 0.45) { // Lowered from 0.65 - more permissive for SuperCluster groups
                    matchedSuperCluster = existingSuperCluster
                    console.log(`✅ Matched existing SuperCluster: ${existingSuperCluster.tag}`)
                    break
                }
            }

            // Create new supercluster if no match found
            if (!matchedSuperCluster) {
                const largestCluster = group.reduce((max, cluster) =>
                    cluster.size > max.size ? cluster : max, group[0])

                const totalSize = group.reduce((sum, cluster) => sum + cluster.size, 0)
                const combinedHandles = group.flatMap(cluster => cluster.handles)

                console.log(`🆕 Creating NEW SuperCluster for group of ${group.length} clusters with tag: "${largestCluster.tag}"`)

                matchedSuperCluster = await SuperCluster.create({
                    tag: largestCluster.tag,
                    size: totalSize,
                    embeddings: groupEmbedding, // Model handles serialization
                    handles: combinedHandles, // Model handles serialization
                    accountHandle: account.handle
                })

                existingSuperClusters.push(matchedSuperCluster)
                console.log(`✅ Created NEW SuperCluster: "${matchedSuperCluster.tag}" with ${group.length} clusters (ID: ${matchedSuperCluster.id})`)
            }

            // Create individual clusters
            for (const clusterData of group) {
                await Cluster.create({
                    tag: clusterData.tag,
                    size: clusterData.size,
                    superClusterId: matchedSuperCluster.id,
                    handles: clusterData.handles, // Model handles serialization
                    embeddings: clusterData.embedding, // Model handles serialization
                    accountHandle: account.handle
                })
                console.log(`🔗 Created cluster "${clusterData.tag}" linked to SuperCluster "${matchedSuperCluster.tag}"`)
            }
        }

        // Handle small clusters
        const smallClusters = clustersData.filter(cluster => cluster.size < 3)
        if (smallClusters.length > 0) {
            console.log(`🔧 Processing ${smallClusters.length} small clusters for potential merging`)
            await this.mergeSmallClusters(account, smallClusters, existingSuperClusters)
        }

        console.log("🎉 Cluster creation completed with HYBRID semantic grouping (60% embeddings + 40% tags)!")

        // 🐛 DEBUG: Final summary
        const finalClusters = await Cluster.query().where('accountHandle', account.handle)
        const finalSuperClusters = await SuperCluster.query().where('accountHandle', account.handle)
        const clustersWithSuperCluster = finalClusters.filter(c => c.superClusterId)
        const standaloneCluster = finalClusters.filter(c => !c.superClusterId)

        console.log(`📊 FINAL SUMMARY for ${account.handle}:`)
        console.log(`   • Total Clusters: ${finalClusters.length}`)
        console.log(`   • Total SuperClusters: ${finalSuperClusters.length}`)
        console.log(`   • Clusters linked to SuperClusters: ${clustersWithSuperCluster.length}`)
        console.log(`   • Standalone Clusters: ${standaloneCluster.length}`)

        if (finalSuperClusters.length === 0) {
            console.log(`⚠️  NO SUPERCLUSTERS CREATED! This might be because:`)
            console.log(`   • Threshold too high (${dynamicThreshold.toFixed(3)})`)
            console.log(`   • All groups had length 1 (no similar clusters found)`)
            console.log(`   • Similarity calculations are failing`)
        }
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
     * Calculate hybrid similarity between two clusters (embeddings + tag semantics)
     * ✅ USES DYNAMIC SEMANTIC SIMILARITY - NO HARDCODED CATEGORIES
     * ✅ HANDLES MISSING EMBEDDINGS GRACEFULLY
     * @param cluster1 First cluster to compare
     * @param cluster2 Second cluster to compare
     * @returns Weighted similarity score (0-1)
     */
    private async calculateHybridSimilarity(cluster1: ClusterData, cluster2: ClusterData): Promise<number> {
        try {
            // 1. Calculate embedding similarity (behavioral)
            const embeddingSimilarity = this.cosineSimilarityTF(cluster1.embedding, cluster2.embedding)

            // 2. Calculate tag semantic similarity DYNAMICALLY
            const tagSimilarity = await this.calculateTagSimilarity(cluster1.tag, cluster2.tag)

            // 3. Check if embeddings are empty/invalid
            const hasValidEmbeddings = embeddingSimilarity > 0 ||
                (this.normalizeVector(cluster1.embedding).length > 0 && this.normalizeVector(cluster2.embedding).length > 0)

            let hybridScore: number
            let calculationMethod: string

            if (!hasValidEmbeddings) {
                // 🔧 FIX: When embeddings are missing, use pure tag similarity
                hybridScore = tagSimilarity
                calculationMethod = "TAGS_ONLY"
                console.log(`⚠️  Empty embeddings detected - using TAG-ONLY similarity`)
            } else {
                // Normal hybrid calculation: 60% embeddings + 40% tag semantics
                hybridScore = (0.6 * embeddingSimilarity) + (0.4 * tagSimilarity)
                calculationMethod = "HYBRID"
            }

            console.log(`🔍 ${calculationMethod} similarity "${cluster1.tag}" ↔ "${cluster2.tag}": embeddings=${embeddingSimilarity.toFixed(3)}, tags=${tagSimilarity.toFixed(3)}, final=${hybridScore.toFixed(3)}`)

            return Math.min(1.0, Math.max(0.0, hybridScore))
        } catch (error) {
            console.error('Error calculating hybrid similarity:', error)
            return 0
        }
    }

    /**
     * Calculate semantic similarity between two tags using DYNAMIC similarity
     * @param tag1 First tag
     * @param tag2 Second tag  
     * @returns Similarity score (0-1)
     */
    private async calculateTagSimilarity(tag1: string, tag2: string): Promise<number> {
        try {
            const t1 = tag1.toLowerCase().trim()
            const t2 = tag2.toLowerCase().trim()

            // Exact match
            if (t1 === t2) return 1.0

            // Contains relationship (high similarity)
            if (t1.includes(t2) || t2.includes(t1)) return 0.85

            // 🔧 FIX: Check for common words (more generous for tag-only mode)
            const words1 = t1.split(/\s+/)
            const words2 = t2.split(/\s+/)
            const commonWords = words1.filter(word => words2.includes(word))

            if (commonWords.length > 0) {
                const commonWordRatio = commonWords.length / Math.max(words1.length, words2.length)
                if (commonWordRatio >= 0.3) { // If 30% or more words are common
                    return 0.6 + (commonWordRatio * 0.2) // Score between 0.6-0.8
                }
            }

            // Common prefixes/suffixes analysis for quick lexical check
            const maxLength = Math.max(t1.length, t2.length)
            if (maxLength === 0) return 0

            const commonPrefix = this.getCommonPrefix(t1, t2)
            const commonSuffix = this.getCommonSuffix(t1, t2)

            // Calculate lexical similarity
            const lexicalScore = (commonPrefix + commonSuffix) / maxLength

            // ✅ NEW: Get DYNAMIC semantic similarity using embeddings
            const semanticScore = await this.calculateSemanticRelationship(t1, t2)

            // Combine lexical and semantic scores (favor semantic)
            return Math.max(lexicalScore, semanticScore)
        } catch (error) {
            console.error('Error calculating tag similarity:', error)
            return 0
        }
    }

    /**
     * Calculate common prefix length between two strings
     */
    private getCommonPrefix(str1: string, str2: string): number {
        let i = 0
        const minLength = Math.min(str1.length, str2.length)
        while (i < minLength && str1[i] === str2[i]) {
            i++
        }
        return i
    }

    /**
     * Calculate common suffix length between two strings
     */
    private getCommonSuffix(str1: string, str2: string): number {
        let i = 0
        const minLength = Math.min(str1.length, str2.length)
        while (i < minLength && str1[str1.length - 1 - i] === str2[str2.length - 1 - i]) {
            i++
        }
        return i
    }

    /**
     * Calculate semantic relationship between tags using dynamic similarity
     * NO HARDCODED CATEGORIES - Uses local AI service embeddings for true semantic similarity
     */
    private async calculateSemanticRelationship(tag1: string, tag2: string): Promise<number> {
        try {
            // Use the local TargetAudienceService for semantic similarity calculation
            const similarity = await this.targetAudienceService.getSemanticSimilarity(tag1, tag2)
            return similarity
        } catch (error) {
            console.error('Error getting semantic similarity from AI service:', error)
            // Fallback to lexical similarity
            return this.calculateLexicalSimilarity(tag1, tag2)
        }
    }

    /**
     * Fallback lexical similarity calculation
     */
    private calculateLexicalSimilarity(tag1: string, tag2: string): number {
        const t1 = tag1.toLowerCase().trim()
        const t2 = tag2.toLowerCase().trim()

        if (t1 === t2) return 1.0
        if (t1.includes(t2) || t2.includes(t1)) return 0.75

        // Calculate edit distance based similarity
        const maxLength = Math.max(t1.length, t2.length)
        if (maxLength === 0) return 0

        const commonPrefix = this.getCommonPrefix(t1, t2)
        const commonSuffix = this.getCommonSuffix(t1, t2)

        return (commonPrefix + commonSuffix) / maxLength
    }

    /**
     * Calculate dynamic threshold based on data distribution
     * @param clusters Array of clusters to analyze
     * @param baseThreshold Base threshold to adjust
     * @returns Adaptive threshold
     */
    private async calculateDynamicThreshold(clusters: ClusterData[], baseThreshold: number): Promise<number> {
        try {
            if (clusters.length < 2) return baseThreshold

            // Calculate all pairwise similarities using async hybrid similarity
            const similarities: number[] = []
            let hasValidEmbeddings = false

            for (let i = 0; i < clusters.length; i++) {
                for (let j = i + 1; j < clusters.length; j++) {
                    const similarity = await this.calculateHybridSimilarity(clusters[i], clusters[j])
                    similarities.push(similarity)

                    // Check if we have valid embeddings
                    if (!hasValidEmbeddings) {
                        const embeddingSimilarity = this.cosineSimilarityTF(clusters[i].embedding, clusters[j].embedding)
                        if (embeddingSimilarity > 0) {
                            hasValidEmbeddings = true
                        }
                    }
                }
            }

            if (similarities.length === 0) return baseThreshold

            // Calculate statistics
            const sortedSimilarities = similarities.sort((a, b) => a - b)
            const median = this.getMedian(sortedSimilarities)
            const stdDev = this.getStandardDeviation(sortedSimilarities)

            let adaptiveThreshold: number

            if (!hasValidEmbeddings) {
                // 🔧 FIX: When embeddings are missing, be MUCH more permissive with tag-only similarity
                adaptiveThreshold = Math.min(0.35, Math.max(0.10, median + 0.10 * stdDev)) // Much lower for tag-only
                console.log(`🏷️  TAG-ONLY mode: Using more permissive threshold for clustering`)
            } else {
                // Normal hybrid mode
                adaptiveThreshold = Math.min(0.55, Math.max(0.15, median + 0.15 * stdDev))
            }

            console.log(`📊 Similarity stats - Median: ${median.toFixed(3)}, StdDev: ${stdDev.toFixed(3)}, Adaptive: ${adaptiveThreshold.toFixed(3)}`)
            console.log(`🎯 Using threshold ${adaptiveThreshold.toFixed(3)} for grouping (embeddings: ${hasValidEmbeddings ? 'present' : 'missing'})`)

            return adaptiveThreshold
        } catch (error) {
            console.error('Error calculating dynamic threshold:', error)
            return baseThreshold
        }
    }

    /**
     * Calculate median of an array
     */
    private getMedian(values: number[]): number {
        if (values.length === 0) return 0

        const sorted = [...values].sort((a, b) => a - b)
        const mid = Math.floor(sorted.length / 2)

        return sorted.length % 2 === 0
            ? (sorted[mid - 1] + sorted[mid]) / 2
            : sorted[mid]
    }

    /**
     * Calculate standard deviation of an array
     */
    private getStandardDeviation(values: number[]): number {
        if (values.length === 0) return 0

        const mean = values.reduce((sum, value) => sum + value, 0) / values.length
        const squaredDifferences = values.map(value => Math.pow(value - mean, 2))
        const variance = squaredDifferences.reduce((sum, value) => sum + value, 0) / values.length

        return Math.sqrt(variance)
    }

    /**
     * Group clusters by semantic similarity using hybrid approach
     * @param clusters Array of clusters to group
     * @param threshold Similarity threshold for grouping
     * @returns Array of cluster groups
     */
    private async groupClustersBySimilarity(clusters: ClusterData[], threshold: number): Promise<ClusterData[][]> {
        if (clusters.length === 0) return []

        const groups: ClusterData[][] = []
        const used = new Set<number>()

        console.log(`🎯 Grouping ${clusters.length} clusters using threshold ${threshold.toFixed(3)}`)

        for (let i = 0; i < clusters.length; i++) {
            if (used.has(i)) continue

            const group: ClusterData[] = [clusters[i]]
            used.add(i)

            // Find similar clusters using async hybrid similarity
            for (let j = i + 1; j < clusters.length; j++) {
                if (used.has(j)) continue

                const similarity = await this.calculateHybridSimilarity(clusters[i], clusters[j])

                if (similarity > threshold) {
                    group.push(clusters[j])
                    used.add(j)
                    console.log(`🔗 Grouped "${clusters[i].tag}" with "${clusters[j].tag}" (similarity: ${similarity.toFixed(3)})`)
                }
            }

            groups.push(group)
        }

        console.log(`✅ Created ${groups.length} groups from ${clusters.length} clusters`)

        return groups
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
     * Merge small clusters with existing superclusters or group them together
     * @param account Account to create clusters for
     * @param smallClusters Array of small clusters to merge
     * @param existingSuperClusters Existing superclusters to potentially merge with
     */
    private async mergeSmallClusters(
        account: Account,
        smallClusters: ClusterData[],
        existingSuperClusters: SuperCluster[]
    ): Promise<void> {
        console.log(`🔧 Attempting to merge ${smallClusters.length} small clusters using HYBRID similarity`)

        for (const smallCluster of smallClusters) {
            let merged = false

            // Try to merge with existing superclusters using hybrid similarity
            for (const superCluster of existingSuperClusters) {
                const similarity = await this.calculateHybridSimilarity(
                    smallCluster,
                    {
                        tag: superCluster.tag,
                        embedding: Array.isArray(superCluster.embeddings)
                            ? superCluster.embeddings
                            : JSON.parse(superCluster.embeddings || '[]'),
                        handles: [],
                        keywords: [],
                        size: 0,
                        cohesion: 0
                    } as ClusterData
                )

                if (similarity > 0.45) { // Lowered threshold for small clusters (was 0.6)
                    // Merge with existing supercluster
                    await Cluster.create({
                        tag: smallCluster.tag,
                        size: smallCluster.size,
                        superClusterId: superCluster.id,
                        handles: smallCluster.handles,
                        embeddings: smallCluster.embedding,
                        accountHandle: account.handle
                    })

                    console.log(`🔗 Merged small cluster "${smallCluster.tag}" with SuperCluster "${superCluster.tag}" (hybrid: ${similarity.toFixed(3)})`)
                    merged = true
                    break
                }
            }

            // If not merged, create as standalone cluster
            if (!merged) {
                await Cluster.create({
                    tag: smallCluster.tag,
                    size: smallCluster.size,
                    superClusterId: null, // Standalone cluster
                    handles: smallCluster.handles,
                    embeddings: smallCluster.embedding,
                    accountHandle: account.handle
                })

                console.log(`🏷️  Created standalone small cluster: "${smallCluster.tag}"`)
            }
        }
    }
}

export type ClusterData = {
    tag: string,
    handles: string[],
    keywords: string[],
    embedding: number[]
    size: number,
    cohesion: number,
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