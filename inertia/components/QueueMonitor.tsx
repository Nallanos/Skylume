import { useState, useEffect } from 'react'
import { RefreshCw, Clock, CheckCircle, XCircle, Play } from 'lucide-react'

interface QueueStats {
  waiting: number
  active: number
  completed: number
  failed: number
}

export default function QueueMonitor() {
  const [stats, setStats] = useState<QueueStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchStats = async () => {
    setLoading(true)
    try {
      const response = await fetch('/schedule/queue/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
        setLastUpdated(new Date())
      }
    } catch (error) {
      console.error('Error fetching queue stats:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    // Rafraîchir les stats toutes les 30 secondes
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [])

  if (!stats) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Play className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Queue Status</h3>
        </div>
        <div className="text-center py-4">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
          <p className="text-sm text-gray-500 mt-2">Loading queue statistics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Play className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Queue Status</h3>
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="p-1 hover:bg-gray-100 rounded-md disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      {lastUpdated && (
        <p className="text-xs text-gray-500 mb-4">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </p>
      )}
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-yellow-500" />
            <span className="px-2 py-1 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-md text-xs font-medium">
              Waiting
            </span>
          </div>
          <div className="text-2xl font-bold text-yellow-600">{stats.waiting}</div>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Play className="h-4 w-4 text-blue-500" />
            <span className="px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-xs font-medium">
              Active
            </span>
          </div>
          <div className="text-2xl font-bold text-blue-600">{stats.active}</div>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="px-2 py-1 bg-green-50 text-green-700 border border-green-200 rounded-md text-xs font-medium">
              Completed
            </span>
          </div>
          <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <XCircle className="h-4 w-4 text-red-500" />
            <span className="px-2 py-1 bg-red-50 text-red-700 border border-red-200 rounded-md text-xs font-medium">
              Failed
            </span>
          </div>
          <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
        </div>
      </div>
      
      {(stats.waiting + stats.active + stats.completed + stats.failed) === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Play className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No jobs in queue</p>
        </div>
      )}
    </div>
  )
}
