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
     * Crée des clusters et superclusters à partir de données déjà traitées
     * Cette méthode est utilisée par le système de batch pour créer les clusters
     * à partir des résultats agrégés de plusieurs batches
     * 
     * ✅ IMPROVED LOGIC: Strict cohesion validation & dynamic rebalancing
     */
    public async createClustersFromData(account: Account, clustersData: ClusterData[]) {
        console.log("🚀 Creating clusters with IMPROVED clustering logic:", clustersData.length, "clusters")

        // Filter clusters by minimum size (>=3 members)
        const validClusters = clustersData.filter(cluster => cluster.size >= 3)
        console.log(`📊 Filtered to ${validClusters.length} clusters with minimum size of 3`)

        if (validClusters.length === 0) {
            console.log("⚠️  No clusters meet minimum size requirement")
            return
        }

        const existingSuperClusters = await SuperCluster.query()
            .where('accountHandle', account.handle)

        // ✅ FLEXIBLE: Use semantic threshold for better grouping
        const flexibleThreshold = await this.calculateFlexibleThreshold(validClusters)
        const superClusterGroups = await this.groupClustersBySemanticSimilarity(validClusters, flexibleThreshold)
        console.log(`🎯 Grouped ${validClusters.length} clusters into ${superClusterGroups.length} SuperCluster groups`)

        // 🐛 DEBUG: Show group sizes
        superClusterGroups.forEach((group, index) => {
            console.log(`   Group ${index + 1}: ${group.length} clusters - ${group.map(c => `"${c.tag}"`).join(', ')}`)
        })

        for (const group of superClusterGroups) {
            if (group.length === 1) {
                // Single cluster - try to match with existing SuperCluster
                const singleCluster = group[0]
                const matchedSuperCluster = await this.findBestSuperClusterMatch(singleCluster, existingSuperClusters)

                await Cluster.create({
                    tag: singleCluster.tag,
                    size: singleCluster.size,
                    superClusterId: matchedSuperCluster?.id || null,
                    handles: singleCluster.handles,
                    embeddings: singleCluster.embedding,
                    accountHandle: account.handle
                })

                if (matchedSuperCluster) {
                    // ✅ RECALCULATE cohesion after adding cluster
                    await this.validateAndRebalanceSuperCluster(matchedSuperCluster, account)
                } else {
                    console.log(`🏷️  Created standalone cluster: "${singleCluster.tag}"`)
                }
                continue
            }

            // ✅ RELAXED: Lower cohesion requirement for semantic clusters
            const groupCohesion = await this.calculateGroupCohesion(group)
            if (groupCohesion < 0.55) {
                console.log(`❌ Group rejected (low cohesion: ${groupCohesion.toFixed(3)}), creating standalone clusters`)
                for (const cluster of group) {
                    await Cluster.create({
                        tag: cluster.tag,
                        size: cluster.size,
                        superClusterId: null,
                        handles: cluster.handles,
                        embeddings: cluster.embedding,
                        accountHandle: account.handle
                    })
                }
                continue
            }

            // Find largest cluster for SuperCluster matching
            const largestCluster = group.reduce((max, cluster) =>
                cluster.size > max.size ? cluster : max, group[0])

            const matchedSuperCluster = await this.findBestSuperClusterMatch(largestCluster, existingSuperClusters)

            let targetSuperCluster = matchedSuperCluster
            if (!matchedSuperCluster) {
                // Create new SuperCluster for cohesive group
                const totalSize = group.reduce((sum, cluster) => sum + cluster.size, 0)
                const groupEmbedding = this.calculateAverageEmbedding(group.map(c => c.embedding))
                const combinedHandles = group.flatMap(cluster => cluster.handles)

                targetSuperCluster = await SuperCluster.create({
                    tag: largestCluster.tag,
                    size: totalSize,
                    embeddings: groupEmbedding,
                    handles: combinedHandles,
                    accountHandle: account.handle
                })

                existingSuperClusters.push(targetSuperCluster)
                console.log(`✅ Created NEW SuperCluster: "${targetSuperCluster.tag}" (cohesion: ${groupCohesion.toFixed(3)})`)
            }

            // Create clusters in the SuperCluster
            for (const clusterData of group) {
                await Cluster.create({
                    tag: clusterData.tag,
                    size: clusterData.size,
                    superClusterId: targetSuperCluster!.id,
                    handles: clusterData.handles,
                    embeddings: clusterData.embedding,
                    accountHandle: account.handle
                })
            }

            // ✅ REVALIDATE cohesion after adding multiple clusters
            if (matchedSuperCluster) {
                await this.validateAndRebalanceSuperCluster(targetSuperCluster!, account)
            }
        }

        // Handle small clusters
        const smallClusters = clustersData.filter(cluster => cluster.size < 3)
        if (smallClusters.length > 0) {
            console.log(`🔧 Processing ${smallClusters.length} small clusters for potential merging`)
            await this.mergeSmallClusters(account, smallClusters, existingSuperClusters)
        }

        console.log("🎉 Cluster creation completed with IMPROVED semantic grouping & cohesion validation!")

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
            console.log(`   • Threshold too high (${flexibleThreshold.toFixed(3)})`)
            console.log(`   • All groups had length 1 (no similar clusters found)`)
            console.log(`   • Similarity calculations are failing`)
        }
    }

    /**
     * ✅ FIXED: Calculate or get cluster centroid for similarity calculations
     * This ensures we always have a single embedding vector for cluster comparison
     * This is the MAIN FIX for the centroid vs embedding confusion
     */
    private getClusterCentroid(clusterData: ClusterData): number[] {
        // If centroid is available, use it directly
        if (clusterData.centroid && clusterData.centroid.length > 0) {
            console.log(`✅ Using provided centroid for cluster "${clusterData.tag}"`)
            return clusterData.centroid
        }

        // If embedding is already a single vector (centroid), return it
        if (clusterData.embedding.length > 0 && typeof clusterData.embedding[0] === 'number') {
            return clusterData.embedding
        }

        // If embedding is an array of arrays (list of member embeddings), calculate centroid
        if (Array.isArray(clusterData.embedding) && clusterData.embedding.length > 0) {
            const embeddings = clusterData.embedding as any[]

            // Check if first element is an array (multiple embeddings)
            if (Array.isArray(embeddings[0])) {
                console.log(`🧮 Calculating centroid for cluster "${clusterData.tag}" from ${embeddings.length} member embeddings`)
                return this.calculateAverageEmbedding(embeddings as number[][])
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
     * ✅ FIXED: Calculate hybrid similarity using CENTROIDS
     * This is the main fix to ensure we always use centroids for cluster similarity
     */
    private async calculateHybridSimilarity(cluster1: ClusterData, cluster2: ClusterData): Promise<number> {
        try {
            // 1. Get centroids for both clusters (this is the FIX)
            const centroid1 = this.getClusterCentroid(cluster1)
            const centroid2 = this.getClusterCentroid(cluster2)

            // 2. Calculate embedding similarity using centroids
            const embeddingSimilarity = this.cosineSimilarityTF(centroid1, centroid2)

            // 3. Calculate tag semantic similarity 
            const tagSimilarity = await this.calculateTagSimilarity(cluster1.tag, cluster2.tag)

            // 4. Check if centroids are valid
            const hasValidCentroids = centroid1.length > 0 && centroid2.length > 0

            let hybridScore: number
            let calculationMethod: string

            if (!hasValidCentroids) {
                // When centroids are missing, use pure tag similarity
                hybridScore = tagSimilarity
                calculationMethod = "TAGS_ONLY"
                console.log(`⚠️  Missing centroids - using TAG-ONLY similarity`)
            } else {
                // Normal hybrid calculation: 80% centroids + 20% tag semantics
                hybridScore = (0.8 * embeddingSimilarity) + (0.2 * tagSimilarity)
                calculationMethod = "HYBRID_CENTROIDS"
            }

            console.log(`🔍 ${calculationMethod} similarity "${cluster1.tag}" ↔ "${cluster2.tag}": centroids=${embeddingSimilarity.toFixed(3)}, tags=${tagSimilarity.toFixed(3)}, final=${hybridScore.toFixed(3)}`)

            return Math.min(1.0, Math.max(0.0, hybridScore))
        } catch (error) {
            console.error('Error calculating hybrid similarity:', error)
            return 0
        }
    }

    /**
     * ✅ NEW: Enhanced similarity calculation with tech-specific synonyms
     */
    private async calculateEnhancedSimilarity(cluster1: ClusterData, cluster2: ClusterData): Promise<number> {
        // Base hybrid similarity using centroids
        const baseSimilarity = await this.calculateHybridSimilarity(cluster1, cluster2)

        // Enhanced tag similarity with tech synonyms
        const tagSimilarity = await this.calculateTagSimilarity(cluster1.tag, cluster2.tag)

        // Weighted combination: 70% base + 30% tag enhancement
        const enhancedSimilarity = (baseSimilarity * 0.7) + (tagSimilarity * 0.3)

        return enhancedSimilarity
    }

    /**
     * Calculate semantic similarity between tags using AI service
     */
    private async calculateTagSimilarity(tag1: string, tag2: string): Promise<number> {
        try {
            // Use the AI service for true semantic similarity
            const semanticSimilarity = await this.targetAudienceService.getSemanticSimilarity(tag1, tag2)

            // If AI service fails, fallback to basic lexical similarity
            if (semanticSimilarity > 0) {
                return semanticSimilarity
            }
        } catch (error) {
            console.warn(`AI semantic similarity failed for "${tag1}" vs "${tag2}": ${error}`)
        }

        // Fallback to basic lexical similarity
        return this.calculateLexicalSimilarity(tag1, tag2)
    }

    /**
     * ✅ NEW: Basic lexical similarity calculation
     */
    private calculateLexicalSimilarity(str1: string, str2: string): number {
        const longer = str1.length > str2.length ? str1 : str2
        const shorter = str1.length > str2.length ? str2 : str1

        if (longer.length === 0) return 1.0

        const distance = this.calculateLevenshteinDistance(longer, shorter)
        return (longer.length - distance) / longer.length
    }

    /**
     * ✅ NEW: Levenshtein distance calculation
     */
    private calculateLevenshteinDistance(str1: string, str2: string): number {
        const matrix = []

        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i]
        }

        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j
        }

        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1]
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    )
                }
            }
        }

        return matrix[str2.length][str1.length]
    }

    /**
     * Calculate internal cohesion of a group of clusters
     */
    private async calculateGroupCohesion(group: ClusterData[]): Promise<number> {
        if (group.length < 2) return 1.0

        const similarities: number[] = []
        for (let i = 0; i < group.length; i++) {
            for (let j = i + 1; j < group.length; j++) {
                const similarity = await this.calculateHybridSimilarity(group[i], group[j])
                similarities.push(similarity)
            }
        }

        const averageSimilarity = similarities.reduce((sum, sim) => sum + sim, 0) / similarities.length
        return averageSimilarity
    }

    /**
     * ✅ NEW: Calculate flexible threshold using 60th percentile for better grouping
     */
    private async calculateFlexibleThreshold(clusters: ClusterData[]): Promise<number> {
        if (clusters.length < 2) return 0.6 // Lower default threshold

        const similarities: number[] = []
        for (let i = 0; i < clusters.length; i++) {
            for (let j = i + 1; j < clusters.length; j++) {
                const similarity = await this.calculateHybridSimilarity(clusters[i], clusters[j])
                similarities.push(similarity)
            }
        }

        const sortedSimilarities = similarities.sort((a, b) => b - a)

        // ✅ Use 60th percentile instead of 75th for more grouping
        const percentile60Index = Math.floor(sortedSimilarities.length * 0.4)
        const flexibleThreshold = Math.max(0.55, sortedSimilarities[percentile60Index] || 0.55)

        console.log(`📊 Using FLEXIBLE threshold: ${flexibleThreshold.toFixed(3)} (60th percentile)`)
        return flexibleThreshold
    }

    /**
     * ✅ NEW: More flexible similarity grouping for semantic clustering
     */
    private async groupClustersBySemanticSimilarity(
        clusters: ClusterData[],
        threshold: number
    ): Promise<ClusterData[][]> {
        const groups: ClusterData[][] = []
        const used = new Set<number>()

        console.log(`🎯 Grouping with SEMANTIC threshold ${threshold.toFixed(3)}`)

        for (let i = 0; i < clusters.length; i++) {
            if (used.has(i)) continue

            const potentialGroup: ClusterData[] = [clusters[i]]
            used.add(i)

            // ✅ IMPROVED: More flexible approach - similarity with majority of group members
            for (let j = i + 1; j < clusters.length; j++) {
                if (used.has(j)) continue

                // Check similarity with existing group members
                let similarityCount = 0
                let totalSimilarity = 0

                for (const groupMember of potentialGroup) {
                    const similarity = await this.calculateEnhancedSimilarity(clusters[j], groupMember)
                    if (similarity > threshold) {
                        similarityCount++
                    }
                    totalSimilarity += similarity
                }

                // ✅ FLEXIBLE: Accept if similar to majority (≥60%) OR high average similarity (≥70%)
                const majorityThreshold = Math.ceil(potentialGroup.length * 0.6)
                const averageSimilarity = totalSimilarity / potentialGroup.length

                if (similarityCount >= majorityThreshold || averageSimilarity >= 0.7) {
                    potentialGroup.push(clusters[j])
                    used.add(j)
                    console.log(`🔗 Added "${clusters[j].tag}" to group (similar to ${similarityCount}/${potentialGroup.length - 1} members, avg: ${averageSimilarity.toFixed(3)})`)
                }
            }

            groups.push(potentialGroup)
        }

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

    /**
     * ✅ FIXED: Find best SuperCluster match using CENTROIDS
     */
    private async findBestSuperClusterMatch(
        cluster: ClusterData,
        existingSuperClusters: SuperCluster[]
    ): Promise<SuperCluster | null> {
        let bestMatch: SuperCluster | null = null
        let bestScore = 0

        for (const superCluster of existingSuperClusters) {
            // ✅ ENHANCED: Use centroid-based similarity calculation
            const similarity = await this.calculateEnhancedSimilarity(
                cluster,
                {
                    tag: superCluster.tag,
                    embedding: superCluster.embeddings, // This should be the centroid
                    centroid: Array.isArray(superCluster.embeddings)
                        ? superCluster.embeddings
                        : JSON.parse(superCluster.embeddings || '[]'),
                    handles: [],
                    keywords: [],
                    size: 0,
                    cohesion: 0
                } as ClusterData
            )

            // ✅ STRICT: Require 75% similarity to match existing SuperCluster
            if (similarity > 0.75 && similarity > bestScore) {
                bestMatch = superCluster
                bestScore = similarity
            }
        }

        if (bestMatch) {
            console.log(`🔗 Matched existing SuperCluster: "${bestMatch.tag}" (similarity: ${bestScore.toFixed(3)})`)
        }

        return bestMatch
    }

    /**
     * ✅ NEW: Validate and rebalance SuperCluster after adding new clusters
     * Recalculates cohesion and removes problematic clusters if needed
     */
    private async validateAndRebalanceSuperCluster(superCluster: SuperCluster, account: Account): Promise<void> {
        console.log(`🔍 Validating cohesion of SuperCluster "${superCluster.tag}"...`)

        // Get all clusters in this SuperCluster
        const clustersInSuperCluster = await Cluster.query()
            .where('superClusterId', superCluster.id)
            .where('accountHandle', account.handle)

        if (clustersInSuperCluster.length < 2) {
            console.log(`✅ SuperCluster "${superCluster.tag}" has only ${clustersInSuperCluster.length} cluster(s) - no validation needed`)
            return
        }

        // Convert to ClusterData format for similarity calculations
        const clusterDataArray: ClusterData[] = clustersInSuperCluster.map(cluster => ({
            tag: cluster.tag,
            embedding: cluster.embeddings as number[],
            handles: cluster.handles as string[],
            keywords: [],
            size: cluster.size,
            cohesion: 0
        }))

        // Calculate current cohesion
        const currentCohesion = await this.calculateGroupCohesion(clusterDataArray)
        console.log(`📊 SuperCluster "${superCluster.tag}" current cohesion: ${currentCohesion.toFixed(3)}`)

        // If cohesion is acceptable, update SuperCluster and return
        if (currentCohesion >= 0.6) {
            console.log(`✅ SuperCluster "${superCluster.tag}" cohesion is acceptable (${currentCohesion.toFixed(3)} >= 0.60)`)

            // Update SuperCluster size and embedding
            const totalSize = clusterDataArray.reduce((sum, cluster) => sum + cluster.size, 0)
            const avgEmbedding = this.calculateAverageEmbedding(clusterDataArray.map(c => c.embedding))
            const combinedHandles = clusterDataArray.flatMap(c => c.handles)

            await SuperCluster.query()
                .where('id', superCluster.id)
                .update({
                    size: totalSize,
                    embeddings: avgEmbedding,
                    handles: combinedHandles
                })

            return
        }

        // Cohesion is too low - need to rebalance
        console.log(`⚠️ SuperCluster "${superCluster.tag}" cohesion too low (${currentCohesion.toFixed(3)} < 0.60) - rebalancing...`)

        // Find the most problematic clusters (those with lowest average similarity to others)
        const clusterProblematicScores: { cluster: ClusterData, avgSimilarity: number, dbCluster: Cluster }[] = []

        for (let i = 0; i < clusterDataArray.length; i++) {
            const currentCluster = clusterDataArray[i]
            const dbCluster = clustersInSuperCluster[i]

            let totalSimilarity = 0
            let comparisons = 0

            for (let j = 0; j < clusterDataArray.length; j++) {
                if (i !== j) {
                    const similarity = await this.calculateHybridSimilarity(currentCluster, clusterDataArray[j])
                    totalSimilarity += similarity
                    comparisons++
                }
            }

            const avgSimilarity = comparisons > 0 ? totalSimilarity / comparisons : 0
            clusterProblematicScores.push({
                cluster: currentCluster,
                avgSimilarity,
                dbCluster
            })
        }

        // Sort by average similarity (lowest first = most problematic)
        clusterProblematicScores.sort((a, b) => a.avgSimilarity - b.avgSimilarity)

        // Remove the most problematic clusters until cohesion improves or we have only 1 cluster
        let removedClusters: { cluster: ClusterData, dbCluster: Cluster }[] = []
        let remainingClusters = [...clusterProblematicScores]

        while (remainingClusters.length > 1) {
            // Remove the most problematic cluster
            const mostProblematic = remainingClusters.shift()!
            removedClusters.push(mostProblematic)

            console.log(`🗑️ Removing problematic cluster "${mostProblematic.cluster.tag}" (avg similarity: ${mostProblematic.avgSimilarity.toFixed(3)})`)

            // Recalculate cohesion without this cluster
            const remainingClusterData = remainingClusters.map(item => item.cluster)
            const newCohesion = await this.calculateGroupCohesion(remainingClusterData)

            console.log(`📊 New cohesion after removing "${mostProblematic.cluster.tag}": ${newCohesion.toFixed(3)}`)

            if (newCohesion >= 0.6) {
                console.log(`✅ Cohesion improved to acceptable level: ${newCohesion.toFixed(3)}`)
                break
            }
        }

        // Update database: remove problematic clusters from SuperCluster
        for (const removed of removedClusters) {
            await Cluster.query()
                .where('id', removed.dbCluster.id)
                .update({ superClusterId: null })

            console.log(`🏷️ Cluster "${removed.cluster.tag}" converted to standalone`)
        }

        // If we have remaining clusters, update the SuperCluster
        if (remainingClusters.length > 0) {
            const remainingClusterData = remainingClusters.map(item => item.cluster)
            const totalSize = remainingClusterData.reduce((sum, cluster) => sum + cluster.size, 0)
            const avgEmbedding = this.calculateAverageEmbedding(remainingClusterData.map(c => c.embedding))
            const combinedHandles = remainingClusterData.flatMap(c => c.handles)

            await SuperCluster.query()
                .where('id', superCluster.id)
                .update({
                    size: totalSize,
                    embeddings: avgEmbedding,
                    handles: combinedHandles
                })

            console.log(`✅ SuperCluster "${superCluster.tag}" rebalanced with ${remainingClusters.length} clusters`)
        } else {
            // No clusters left - delete the SuperCluster
            await SuperCluster.query().where('id', superCluster.id).delete()
            console.log(`🗑️ SuperCluster "${superCluster.tag}" deleted (no clusters remaining)`)
        }
    }
}

export type ClusterData = {
    tag: string,
    handles: string[],
    keywords: string[],
    embedding: number[]
    centroid?: number[]  // ✅ NEW: Explicit centroid field for clarity
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
