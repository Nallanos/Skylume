<script lang="ts">
  import { Line } from 'svelte-chartjs'
  import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shadcn-ui/card'

  // Import Chart.js components
  import {
    Chart as ChartJS,
    Title,
    Tooltip,
    Legend,
    LineElement,
    LinearScale,
    PointElement,
    CategoryScale,
  } from 'chart.js'

  // Register Chart.js components
  ChartJS.register(Title, Tooltip, Legend, LineElement, LinearScale, PointElement, CategoryScale)

  // Props
  export let followers_history: { date: string; count: number }[] = []

  // Helper function to format dates
  function formatDate(dateString: string) {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short' })
  }

  // Prepare Chart.js data
  $: followerChartData = {
    labels: followers_history.map((entry) => formatDate(entry.date)),
    datasets: [
      {
        label: 'Followers',
        data: followers_history.map((entry) => entry.count),
        borderColor: 'rgba(56, 189, 248, 1)', // light blue
        backgroundColor: 'rgba(56, 189, 248, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
      },
    ],
  }

  // Chart.js options
  $: followerChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#94a3b8',
        },
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        grid: {
          color: 'rgba(148, 163, 184, 0.1)',
        },
        ticks: {
          color: '#94a3b8',
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#94a3b8',
        },
      },
    },
  }
</script>

<Card>
  <CardHeader>
    <CardTitle>Followers Growth</CardTitle>
    <CardDescription>Progress of follower count over the last 30 days</CardDescription>
  </CardHeader>
  <CardContent>
    <div class="h-80 w-full">
      <Line data={followerChartData} options={followerChartOptions} />
    </div>
  </CardContent>
</Card>
