<!-- <script lang="ts">
  import type { MetricData } from '@/type'
  import { onDestroy, afterUpdate } from 'svelte'
  import {
    Chart,
    LineController,
    LineElement,
    PointElement,
    LinearScale,
    CategoryScale,
    Title,
  } from 'chart.js'
  Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Title)

  export let MetricData: MetricData | null = null
  let chart: Chart | null = null
  let canvas: HTMLCanvasElement
  let timeLabel: number[] = []
  function createChart() {
    if (canvas && MetricData) {
      chart = new Chart(canvas, {
        type: 'line',
        data: {
          labels: [],
          datasets: [
            {
              label: 'CPU Percentage',
              yAxisID: 'blue',
              data: [],
              borderColor: 'rgba(75, 192, 192, 1)',
              backgroundColor: 'rgba(75, 192, 192, 0.2)',
              fill: false,
            },
            {
              label: 'Memory Usage (MB)',
              data: [],
              borderColor: 'rgba(255, 99, 132, 1)',
              backgroundColor: 'rgba(255, 99, 132, 0.2)',
              fill: false,
            },
          ],
        },
        options: {
          responsive: true,
          scales: {
            x: {
              display: true,
              ticks: {
                color: 'white',
              },
            },
            y: {
              display: true,
              ticks: {
                color: 'white',
              },
            },
          },
          plugins: {
            title: {
              display: true,
              text: 'In blue CPU consumption in % and in red Memory used in MB',
            },
            legend: {
              display: true,
            },
          },
        },
      })
    }
  }

  async function updateChart() {
    if (chart && MetricData) {
      const currentTime = new Date().toLocaleTimeString()
      const currentTimestamp = Date.now()

      const usedMemory = getUsedMemory(MetricData)
      const percentageOfCPUUsed = getPercentageOfCPUUsed(MetricData)
      if (currentTimestamp - timeLabel[0] > 10000) {
        chart.data.labels?.shift()
        chart.data.datasets[0].data.shift()
        chart.data.datasets[1].data.shift()
      }

      chart.data.labels?.push(currentTime)
      chart.data.datasets[0].data.push(percentageOfCPUUsed)
      chart.data.datasets[1].data.push(usedMemory)
      timeLabel.push(currentTimestamp)

      chart.update()
    }
  }

  onDestroy(() => {
    if (chart) {
      chart.destroy()
      chart = null
    }
  })

  afterUpdate(() => {
    console.log(MetricData)
    if (MetricData) {
      if (!chart) {
        createChart()
      } else {
        updateChart()
      }
    }
  })
</script>

<div class="max-w-4xl mx-auto mt-8">
  {#if MetricData}
    <canvas bind:this={canvas} class="w-full h-64"></canvas>
  {:else}
    <p class="text-center text-gray-400">Aucune donnée disponible</p>
  {/if}
</div> -->
