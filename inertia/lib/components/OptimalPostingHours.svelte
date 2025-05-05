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
</script>

<Card>
  <CardHeader>
    <CardTitle>Heures optimales de publication</CardTitle>
    <CardDescription>Analyse des horaires générant le plus d'engagement</CardDescription>
  </CardHeader>
  <CardContent>
    <div class="h-60">
      <Line
        data={{
          labels: [
            '9h',
            '10h',
            '11h',
            '12h',
            '13h',
            '14h',
            '15h',
            '16h',
            '17h',
            '18h',
            '19h',
            '20h',
            '21h',
          ],
          datasets: [
            {
              label: "Taux d'engagement",
              data: [5.2, 6.8, 8.3, 9.7, 8.5, 7.2, 6.9, 7.5, 8.4, 10.6, 12.8, 11.7, 9.2],
              borderColor: 'rgba(56, 189, 248, 1)',
              backgroundColor: 'rgba(56, 189, 248, 0.1)',
              borderWidth: 2,
              tension: 0.4,
              fill: true,
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
