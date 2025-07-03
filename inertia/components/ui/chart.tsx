'use client'

import * as React from 'react'
import { ResponsiveContainer } from 'recharts'

import { cn } from '../../lib/utils'

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'> & {
    config: Record<string, any>
    children: React.ComponentProps<typeof ResponsiveContainer>['children']
  }
>(({ id, className, children, config, ...props }, ref) => {
  const uniqueId = React.useId()
  const chartId = `chart-${id || uniqueId.replace(/:/g, '')}`

  return (
    <div
      data-chart={chartId}
      ref={ref}
      className={cn(
        "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/20 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none",
        className
      )}
      {...props}
    >
      <ChartStyle id={chartId} config={config} />
      <ResponsiveContainer>{children}</ResponsiveContainer>
    </div>
  )
})
ChartContainer.displayName = 'ChartContainer'

const ChartStyle = ({ id, config }: { id: string; config: Record<string, any> }) => {
  const colorConfig = Object.entries(config).filter(([_, config]) => config.theme || config.color)

  if (!colorConfig.length) {
    return null
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: [
          `[data-chart=${id}] {`,
          ...colorConfig
            .map(([key, itemConfig]) => {
              const color =
                itemConfig.theme?.[
                  typeof document !== 'undefined' &&
                  document.documentElement.classList.contains('dark')
                    ? 'dark'
                    : 'light'
                ] || itemConfig.color
              return color ? `  --color-${key}: ${color};` : null
            })
            .filter(Boolean),
          `}`,
        ].join('\n'),
      }}
    />
  )
}

const ChartTooltip = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'> & {
    active?: boolean
    payload?: Array<{
      color: string
      dataKey: string
      name: string
      value: number | string | Array<number | string>
    }>
    label?: string
    indicator?: 'line' | 'dot' | 'dashed'
    hideLabel?: boolean
    hideIndicator?: boolean
    labelFormatter?: (value: any, payload: any[]) => React.ReactNode
    formatter?: (value: any, name: any, props: any) => React.ReactNode
  }
>(
  (
    {
      active,
      payload,
      label,
      labelFormatter,
      formatter,
      indicator = 'dot',
      hideLabel = false,
      hideIndicator = false,
      className,
      ...props
    },
    ref
  ) => {
    const tooltipLabel = React.useMemo(() => {
      if (hideLabel || !payload?.length) {
        return null
      }

      const [item] = payload
      const key = `${label || item.dataKey || item.name || 'value'}`
      const formattedLabel = labelFormatter ? labelFormatter(label, payload) : key

      return formattedLabel
    }, [label, labelFormatter, payload, hideLabel])

    if (!active || !payload?.length) {
      return null
    }

    return (
      <div
        ref={ref}
        className={cn('rounded-lg border bg-background p-2 text-sm shadow-md', className)}
        {...props}
      >
        {tooltipLabel && <div className="font-medium text-foreground">{tooltipLabel}</div>}
        <div className="grid gap-1">
          {payload.map((item, index) => {
            const indicatorColor = item.color

            return (
              <div key={item.dataKey || index} className="flex items-center gap-2 text-xs">
                {!hideIndicator && (
                  <div
                    className={cn('h-2 w-2 shrink-0 rounded-[2px]', {
                      'rounded-full': indicator === 'dot',
                      'border border-dashed bg-transparent': indicator === 'dashed',
                    })}
                    style={{
                      backgroundColor: indicator === 'dashed' ? 'transparent' : indicatorColor,
                      borderColor: indicator === 'dashed' ? indicatorColor : undefined,
                    }}
                  />
                )}
                <div className="flex flex-1 justify-between">
                  <span className="text-muted-foreground">{item.name}</span>
                  <span className="font-mono font-medium text-foreground">
                    {formatter
                      ? formatter(item.value, item.name, item)
                      : item.value?.toLocaleString()}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }
)
ChartTooltip.displayName = 'ChartTooltip'

const ChartTooltipContent = ChartTooltip

export { ChartContainer, ChartTooltip, ChartTooltipContent }
