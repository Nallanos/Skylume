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
</script>

<Card>
  <CardHeader>
    <CardTitle>Jours optimaux de publication</CardTitle>
    <CardDescription>Analyse des jours générant le plus d'engagement</CardDescription>
  </CardHeader>
  <CardContent>
    <div class="h-60">
      <Bar
        data={{
          labels: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
          datasets: [
            {
              label: 'Engagement moyen',
              data: [7.2, 6.8, 8.5, 9.1, 10.2, 12.4, 11.8],
              backgroundColor: 'rgba(56, 189, 248, 0.7)',
              borderWidth: 0,
            },
          ],
        }}
        options={{
          responsive: true,
          plugins: {
            legend: {
              display: false,
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
