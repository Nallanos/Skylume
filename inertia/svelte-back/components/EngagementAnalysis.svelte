<script lang="ts">
  import { Bar } from 'svelte-chartjs'
  import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shadcn-ui/card'

  // Import Chart.js components
  import {
    Chart as ChartJS,
    Title,
    Tooltip,
    Legend,
    BarElement,
    CategoryScale,
    LinearScale,
  } from 'chart.js'

  // Register Chart.js components
  ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

  // Props
  export let top_posts: {
    text: string
    likes: number
    reposts: number
    replies: number
    date: string
    url: string
    engagement_rate: number
  }[] = []
</script>

<Card>
  <CardHeader>
    <CardTitle>Analyse d'engagement</CardTitle>
    <CardDescription>Répartition des différents types d'engagement</CardDescription>
  </CardHeader>
  <CardContent>
    <div class="h-80">
      <Bar
        data={{
          labels: ['Likes', 'Reposts', 'Réponses', 'Clics', 'Partages'],
          datasets: [
            {
              label: 'Engagement',
              data: [
                top_posts.reduce((acc, post) => acc + post.likes, 0),
                top_posts.reduce((acc, post) => acc + post.reposts, 0),
                top_posts.reduce((acc, post) => acc + post.replies, 0),
                Math.floor(Math.random() * 1000) + 500, // Données fictives pour "Clics"
                Math.floor(Math.random() * 300) + 100, // Données fictives pour "Partages"
              ],
              backgroundColor: [
                'rgba(239, 68, 68, 0.7)',
                'rgba(34, 197, 94, 0.7)',
                'rgba(59, 130, 246, 0.7)',
                'rgba(168, 85, 247, 0.7)',
                'rgba(251, 146, 60, 0.7)',
              ],
              borderWidth: 0,
            },
          ],
        }}
        options={{
          responsive: true,
          plugins: {
            legend: {
              position: 'top',
              labels: {
                color: '#94a3b8',
              },
            },
          },
          scales: {
            y: {
              beginAtZero: true,
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
        }}
      />
    </div>
  </CardContent>
</Card>
