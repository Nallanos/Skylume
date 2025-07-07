import { useMemo } from 'react'
import { Card } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Target, Users } from 'lucide-react'

interface SuperCluster {
  id: number
  tag: string
  size: number
  handles: string[]
}

interface Cluster {
  id: number
  tag: string
  size: number
  handles: string[]
  superClusterId: number | null
}

interface Account {
  handle: string
  followersCount: number
}

interface AudienceFlowChartProps {
  superClusters?: SuperCluster[]
  clusters?: Cluster[]
  account: Account
  isMinimized?: boolean
  showAllClusters?: boolean
}

export default function AudienceFlowChart({
  superClusters,
  clusters,
  account,
  isMinimized = false,
  showAllClusters = false,
}: AudienceFlowChartProps) {
  // Helper function to calculate percentage based on size
  const calculatePercentage = (size: number) => {
    const totalFollowers = account.followersCount || 1
    return (size / totalFollowers) * 100
  }

  // DONNÉES DE TEST - à supprimer en production
  const testMode = !superClusters?.length && !clusters?.length && account.followersCount > 1000

  const testData = useMemo(() => {
    if (!testMode) return { testSuperClusters: [], testClusters: [] }

    let testSuperClusters: any[] = []
    let testClusters: any[] = []

    // Génération de données de test pour simulation
    const followerCount = account.followersCount
    const numClusters = Math.floor(followerCount / 20) // ~5 clusters pour 100 followers
    const numSuperClusters = Math.max(3, Math.floor(numClusters / 8)) // regroupement logique

    console.log(
      `Generating test data: ${numClusters} clusters, ${numSuperClusters} super clusters for ${followerCount} followers`
    )

    // Créer des super clusters
    for (let i = 0; i < numSuperClusters; i++) {
      const superClusterSize = Math.floor(followerCount * (0.05 + Math.random() * 0.15)) // 5-20% des followers
      testSuperClusters.push({
        id: i + 1,
        tag:
          [
            'Tech Enthusiasts',
            'Creative Community',
            'Business Network',
            'Open Source Devs',
            'Design Community',
            'Marketing Professionals',
            'Content Creators',
          ][i] || `Interest Group ${i + 1}`,
        size: superClusterSize,
        handles: Array.from(
          { length: Math.floor(superClusterSize / 10) },
          (_, j) => `user${i}_${j}`
        ),
        percentage: calculatePercentage(superClusterSize),
        children: [],
        accountHandle: account.handle,
      })
    }

    // Créer des sous-clusters
    let clusterId = 1
    testSuperClusters.forEach((superCluster, superIndex) => {
      // Ajouter 3-6 sous-clusters par super cluster
      const numSubClusters = 3 + Math.floor(Math.random() * 4)
      for (let j = 0; j < numSubClusters; j++) {
        const clusterSize = Math.floor(superCluster.size * (0.1 + Math.random() * 0.3))
        const subCluster = {
          id: clusterId++,
          tag: [
            'JavaScript Devs',
            'React Community',
            'Vue.js Users',
            'Node.js Experts',
            'TypeScript Fans',
            'UI/UX Designers',
            'Graphic Artists',
            'Brand Designers',
            'Illustrators',
            'Motion Graphics',
            'Startup Founders',
            'Product Managers',
            'Marketing Experts',
            'Sales Professionals',
            'Growth Hackers',
            'Linux Users',
            'Docker Enthusiasts',
            'Kubernetes Experts',
            'DevOps Engineers',
            'Cloud Architects',
            'Web3 Builders',
            'Crypto Traders',
            'NFT Creators',
            'Blockchain Devs',
            'DeFi Experts',
            'Content Writers',
            'Video Creators',
            'Podcast Hosts',
            'Influencers',
            'Social Media Managers',
          ][Math.floor(Math.random() * 30)],
          size: clusterSize,
          handles: Array.from(
            { length: Math.floor(clusterSize / 15) },
            (_, k) => `user${superIndex}_${j}_${k}`
          ),
          percentage: calculatePercentage(clusterSize),
          superClusterId: superCluster.id,
          accountHandle: account.handle,
        }
        superCluster.children.push(subCluster)
        testClusters.push(subCluster)
      }
    })

    // Ajouter des clusters orphelins (indépendants)
    const numOrphanClusters = Math.floor(numClusters * 0.4) // 40% de clusters indépendants
    for (let i = 0; i < numOrphanClusters; i++) {
      const clusterSize = Math.floor(followerCount * (0.01 + Math.random() * 0.06)) // 1-7% des followers
      testClusters.push({
        id: clusterId++,
        tag: [
          'Photography',
          'Travel Bloggers',
          'Food Enthusiasts',
          'Fitness Community',
          'Music Lovers',
          'Book Club',
          'Gaming Community',
          'Film Critics',
          'Science Fans',
          'History Buffs',
          'Art Collectors',
          'Fashion Icons',
          'Sports Fans',
          'News Junkies',
          'Tech News',
          'Cryptocurrency',
          'Sustainability',
          'Mental Health',
          'Education',
          'Parenting',
        ][i % 20],
        size: clusterSize,
        handles: Array.from({ length: Math.floor(clusterSize / 20) }, (_, j) => `orphan_${i}_${j}`),
        percentage: calculatePercentage(clusterSize),
        superClusterId: null,
        accountHandle: account.handle,
      })
    }

    return { testSuperClusters, testClusters }
  }, [testMode, account.followersCount, calculatePercentage])

  // Process data for visualization
  const visualizationData = useMemo(() => {
    // Utiliser les données de test si disponibles, sinon les vraies données
    const useSuperClusters = testMode ? testData.testSuperClusters : superClusters || []
    const useClusters = testMode ? testData.testClusters : clusters || []

    if (!account || (!useSuperClusters.length && !useClusters.length)) {
      return { superClusters: [], orphanedClusters: [] }
    }

    const processedSuperClusters = useSuperClusters.map((superCluster) => {
      // En mode test, les enfants sont déjà dans superCluster.children
      const children = testMode
        ? superCluster.children || []
        : useClusters.filter((c) => c.superClusterId === superCluster.id)

      return {
        ...superCluster,
        accountHandle: account.handle,
        percentage: superCluster.percentage || calculatePercentage(superCluster.size),
        children: children.map((child: any) => ({
          ...child,
          accountHandle: account.handle,
          percentage: child.percentage || calculatePercentage(child.size),
        })),
      }
    })

    const orphanedClusters = useClusters
      .filter((c) => !c.superClusterId)
      .map((cluster) => ({
        ...cluster,
        accountHandle: account.handle,
        percentage: cluster.percentage || calculatePercentage(cluster.size),
      }))

    return { superClusters: processedSuperClusters, orphanedClusters }
  }, [superClusters, clusters, account, testMode, testData, calculatePercentage])

  if (
    (!superClusters || superClusters.length === 0) &&
    (!clusters || clusters.length === 0) &&
    !testMode
  ) {
    return (
      <Card className="p-12 text-center">
        <div className="max-w-md mx-auto space-y-4">
          <div className="p-4 bg-muted rounded-full w-fit mx-auto">
            <Target className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">No Semantic Clusters to Visualize</h3>
            <p className="text-muted-foreground">
              Start an audience analysis to discover hierarchical interest groups and see how topics
              cluster in your audience.
            </p>
          </div>
        </div>
      </Card>
    )
  }

  const totalClusters = testMode ? testData.testClusters.length : clusters?.length || 0
  const totalSuperClusters = testMode
    ? testData.testSuperClusters.length
    : superClusters?.length || 0

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="text-center flex-1 mb-4">
          <h3 className="text-lg font-semibold mb-2">Audience Cluster Visualization</h3>
          <p className="text-sm text-muted-foreground">
            {totalSuperClusters} super clusters containing {totalClusters} total clusters
            {testMode && (
              <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                Test Data Generated
              </span>
            )}
          </p>
        </div>

        {totalClusters > 50 && !isMinimized && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 text-center">
            ⚡ Large dataset detected - showing most significant clusters for optimal performance
          </p>
        )}
      </div>

      {/* Central Account */}
      <div className="flex justify-center mb-12">
        <div className="relative bg-blue-500 text-white rounded-xl shadow-xl border border-blue-400 p-8 min-w-[250px]">
          <div className="text-center space-y-3">
            <div className="p-3 bg-blue-500/10 rounded-xl w-fit mx-auto">
              <Target className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <h2 className="font-bold text-xl">{account.handle}</h2>
              <p className="text-sm opacity-90">Your Account</p>
            </div>
            <div className="bg-white/15 rounded-xl p-4 mt-4 border border-white/20">
              <p className="text-xl font-bold">{(account.followersCount || 0).toLocaleString()}</p>
              <p className="text-sm opacity-90">Total Followers</p>
            </div>
          </div>
          {/* Connection lines indicator */}
          <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 w-1 h-6 bg-gradient-to-b from-blue-400 to-transparent"></div>
        </div>
      </div>

      {/* Minimized State - Show only summary */}
      {isMinimized && (
        <div className="text-center py-8 bg-muted/20 rounded-lg">
          <div className="space-y-2">
            <div className="text-2xl font-bold text-blue-600">
              {totalSuperClusters + visualizationData.orphanedClusters.length}
            </div>
            <p className="text-sm text-muted-foreground">Total audience clusters identified</p>
            <p className="text-xs text-muted-foreground">
              Click "Expand" to see detailed visualization
            </p>
          </div>
        </div>
      )}

      {/* Full Visualization - Show when not minimized */}
      {!isMinimized && (
        <>
          {/* Super Clusters Grid */}
          {visualizationData.superClusters.length > 0 && (
            <div className="mb-12 relative">
              <h4 className="text-lg font-semibold mb-6 text-center text-slate-800 dark:text-slate-200">
                Super Clusters
              </h4>

              {/* Connection lines from center */}
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-1 h-6 bg-gradient-to-b from-transparent to-blue-400"></div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative">
                {/* Horizontal connection line */}
                {visualizationData.superClusters.length > 1 && (
                  <div className="absolute top-16 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-transparent via-blue-300 to-transparent"></div>
                )}

                {(showAllClusters
                  ? visualizationData.superClusters
                  : visualizationData.superClusters.slice(0, 12)
                ) // Augmenter la limite pour la vue compacte
                  .map((superCluster) => (
                    <div key={superCluster.id} className="relative">
                      {/* Vertical connection to horizontal line */}
                      {visualizationData.superClusters.length > 1 && (
                        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-0.5 h-16 bg-blue-300"></div>
                      )}
                      <SuperClusterCard superCluster={superCluster} />
                    </div>
                  ))}
              </div>

              {/* Show more indicator for super clusters */}
              {!showAllClusters && visualizationData.superClusters.length > 12 && (
                <div className="mt-6 text-center">
                  <div className="inline-flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-4 py-2 rounded-lg">
                    <Target className="h-4 w-4" />+{visualizationData.superClusters.length - 12}{' '}
                    more super clusters
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Orphaned Clusters */}
          {visualizationData.orphanedClusters.length > 0 && (
            <div className="relative">
              <h4 className="text-lg font-semibold mb-6 text-center text-slate-800 dark:text-slate-200">
                Independent Clusters
                {!showAllClusters && visualizationData.orphanedClusters.length > 12 && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    (showing top 12 by size)
                  </span>
                )}
              </h4>

              {/* Connection line from center if no super clusters */}
              {visualizationData.superClusters.length === 0 && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-1 h-6 bg-gradient-to-b from-transparent to-blue-400"></div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {visualizationData.orphanedClusters
                  .sort((a, b) => (b.size || 0) - (a.size || 0)) // Trier par taille
                  .slice(0, showAllClusters ? undefined : 20) // Augmenter la limite pour la vue compacte
                  .map((cluster) => (
                    <ClusterCard key={cluster.id} cluster={cluster} />
                  ))}
              </div>

              {/* Indicateur s'il y a plus de clusters */}
              {!showAllClusters && visualizationData.orphanedClusters.length > 20 && (
                <div className="mt-6 text-center">
                  <div className="inline-flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-4 py-2 rounded-lg">
                    <Users className="h-4 w-4" />+{visualizationData.orphanedClusters.length - 20}{' '}
                    additional smaller clusters
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Legend */}
          <div className="mt-12 p-6 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-800">
            <h4 className="font-semibold text-base mb-4 text-blue-900 dark:text-blue-100 flex items-center gap-2">
              <Target className="h-5 w-5" />
              Visualization Guide
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-blue-500 rounded-lg border border-blue-400"></div>
                <span>
                  <strong className="text-blue-800 dark:text-blue-200">Central Node:</strong>{' '}
                  <span className="text-slate-600 dark:text-slate-400">Your main account</span>
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-blue-400 rounded-lg border border-blue-300"></div>
                <span>
                  <strong className="text-blue-800 dark:text-blue-200">Super Clusters:</strong>{' '}
                  <span className="text-slate-600 dark:text-slate-400">Major interest groups</span>
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-gray-100 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600"></div>
                <span>
                  <strong className="text-blue-800 dark:text-blue-200">Sub-Clusters:</strong>{' '}
                  <span className="text-slate-600 dark:text-slate-400">Specific communities</span>
                </span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-700">
              <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                <div className="w-12 h-0.5 bg-gradient-to-r from-blue-400 to-transparent"></div>
                <span>Connection lines show hierarchical relationships</span>
              </div>
            </div>
          </div>
        </>
      )}
    </Card>
  )
}

// Super Cluster Card Component
function SuperClusterCard({ superCluster }: { superCluster: any }) {
  const getBackgroundColor = (percentage: number) => {
    if (percentage >= 20) return 'bg-blue-600'
    if (percentage >= 10) return 'bg-blue-500'
    if (percentage >= 5) return 'bg-blue-400'
    return 'bg-blue-300'
  }

  const getTextColor = (percentage: number) => {
    return percentage >= 5 ? 'text-white' : 'text-blue-900'
  }

  const getBorderColor = (percentage: number) => {
    if (percentage >= 20) return 'border-blue-500'
    if (percentage >= 10) return 'border-blue-400'
    if (percentage >= 5) return 'border-blue-300'
    return 'border-blue-200'
  }

  return (
    <div className="space-y-6 relative">
      {/* Super Cluster */}
      <div
        className={`relative ${getBackgroundColor(superCluster.percentage || 0)} rounded-lg shadow-md border-2 ${getBorderColor(superCluster.percentage || 0)} p-4 transform hover:scale-102 transition-transform duration-200`}
      >
        <div className={`space-y-3 ${getTextColor(superCluster.percentage || 0)}`}>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/30 rounded border border-white/40">
                <Target className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-semibold text-sm leading-tight">
                  {superCluster.tag || 'Unnamed Super Cluster'}
                </h3>
                <p className="text-xs opacity-90">Super Cluster</p>
              </div>
            </div>{' '}
            <Badge
              variant="secondary"
              className="bg-white/30 text-inherit border-white/40 text-sm px-2 py-1"
            >
              {(superCluster.percentage || 0).toFixed(1)}%
            </Badge>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 bg-white/20 rounded p-2 border border-white/30">
              <Users className="h-3 w-3" />
              <div>
                <p className="font-semibold text-xs">{(superCluster.size || 0).toLocaleString()}</p>
                <p className="text-[10px] opacity-90">Followers</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white/20 rounded p-2 border border-white/30">
              <Target className="h-3 w-3" />
              <div>
                <p className="font-semibold text-xs">{superCluster.children?.length || 0}</p>
                <p className="text-[10px] opacity-90">Sub-clusters</p>
              </div>
            </div>
          </div>
        </div>

        {/* Connection line to children */}
        {superCluster.children && superCluster.children.length > 0 && (
          <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 w-1 h-6 bg-gradient-to-b from-blue-400 to-transparent"></div>
        )}
      </div>

      {/* Child Clusters */}
      {superCluster.children && superCluster.children.length > 0 && (
        <div className="relative">
          {/* Horizontal distribution line */}
          {superCluster.children.length > 1 && (
            <div className="absolute top-3 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent"></div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {superCluster.children.map((cluster: any) => (
              <div key={cluster.id} className="relative">
                {/* Vertical connection line */}
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-0.5 h-3 bg-gray-300 dark:bg-gray-600"></div>
                <ClusterCard cluster={cluster} isChild={true} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Cluster Card Component
function ClusterCard({ cluster, isChild = false }: { cluster: any; isChild?: boolean }) {
  const getBackgroundColor = (percentage: number, isChild: boolean) => {
    if (isChild) {
      // Sous-clusters : variantes bleues plus claires et sobres
      if (percentage >= 15) return 'bg-blue-100 dark:bg-blue-900/30'
      if (percentage >= 8) return 'bg-blue-50 dark:bg-blue-900/20'
      if (percentage >= 4) return 'bg-gray-50 dark:bg-gray-800/50'
      return 'bg-gray-25 dark:bg-gray-800/30'
    } else {
      // Clusters indépendants : bleu standard
      if (percentage >= 15) return 'bg-blue-500'
      if (percentage >= 8) return 'bg-blue-400'
      if (percentage >= 4) return 'bg-blue-300'
      return 'bg-blue-200'
    }
  }

  const getTextColor = (percentage: number, isChild: boolean) => {
    if (isChild) {
      // Texte sombre pour les sous-clusters sobres
      return 'text-gray-800 dark:text-gray-200'
    } else {
      return percentage >= 4 ? 'text-white' : 'text-blue-900'
    }
  }

  const getBorderColor = (percentage: number, isChild: boolean) => {
    if (isChild) {
      // Bordures sobres pour les sous-clusters
      return 'border-gray-200 dark:border-gray-700'
    } else {
      if (percentage >= 8) return 'border-blue-400'
      return 'border-blue-300'
    }
  }

  return (
    <div
      className={`relative ${getBackgroundColor(cluster.percentage || 0, isChild)} rounded-lg shadow-md border-2 ${getBorderColor(cluster.percentage || 0, isChild)} p-4 hover:shadow-lg transition-all duration-200`}
    >
      <div className={`space-y-3 ${getTextColor(cluster.percentage || 0, isChild)}`}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-white/30 rounded border border-white/40">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <h4 className="font-semibold text-sm leading-tight">
                {cluster.tag || 'Unnamed Cluster'}
              </h4>
              <p className="text-xs opacity-90">
                {isChild ? 'Sub-cluster' : 'Independent Cluster'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className="bg-white/30 text-inherit border-white/40 text-xs px-2 py-1"
            >
              {(cluster.percentage || 0).toFixed(1)}%
            </Badge>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 bg-white/20 rounded p-2 border border-white/30">
            <Users className="h-3 w-3" />
            <div>
              <p className="font-semibold text-xs">{(cluster.size || 0).toLocaleString()}</p>
              <p className="opacity-90 text-[10px]">followers</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white/20 rounded p-2 border border-white/30">
            <Target className="h-3 w-3" />
            <div>
              <p className="font-semibold text-xs">{cluster.handles?.length || 0}</p>
              <p className="opacity-90 text-[10px]">accounts</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
