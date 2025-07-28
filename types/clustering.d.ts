// Types for clustering data structures

interface ClusterData {
    tag: string
    size: number
    handles: string[]
    keywords?: string[]
    embedding?: number[] | number[][]
    centroid?: number[]
    cohesion?: number | null
    persistence?: number | null
    // Robustness metadata from graduated pipeline
    robustnessLevel?: 'strong' | 'thematic' | 'forced' | 'cannot_determine' | null
    robustnessTag?: string | null
    pipelineStep?: number | null
    clusteringMethod?: string | null
    skipTagging?: boolean
    processingStatus?: 'processed' | 'skipped' | string
}

// Extended interface for analysis results
interface AnalysisResult {
    clustersData: ClusterData[]
    clusterStats?: {
        totalClusters: number
        semanticClusters: number
        noiseClusters: number
        totalProfilesClustered: number
        averageCohesion: number
        tagsFrequency: Record<string, number>
    }
    analysisQuality?: {
        profilesWithBio: number
        profilesWithoutBio: number
        bioQualityRatio: number
        clusteringEfficiency: number
    }
}
