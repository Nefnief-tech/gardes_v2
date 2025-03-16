"use client"

import { useMemo } from "react"
import type { Grade } from "../types/grades"
import { Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine, Scatter } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

interface GradeHistoryChartProps {
  grades: Grade[]
  height?: number
  showGrid?: boolean
  showAxis?: boolean
  className?: string
}

export function GradeHistoryChart({
  grades,
  height = 200,
  showGrid = true,
  showAxis = true,
  className = "",
}: GradeHistoryChartProps) {
  // Sort grades by date and prepare data for the chart
  const chartData = useMemo(() => {
    if (!grades.length) return []

    return [...grades]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((grade, index) => ({
        index,
        date: grade.date,
        value: grade.value,
        type: grade.type,
        weight: grade.weight || 1.0, // Default to 1.0 if weight is not defined
      }))
  }, [grades])

  // If no grades, show empty state
  if (grades.length === 0) {
    return (
      <div className={`flex items-center justify-center h-full bg-muted/20 rounded-md ${className}`}>
        <p className="text-xs sm:text-sm text-muted-foreground">No grade data available</p>
      </div>
    )
  }

  // If only one grade, add a duplicate point to show a line
  if (grades.length === 1) {
    chartData.push({
      ...chartData[0],
      index: 1,
    })
  }

  // Calculate responsive dot sizes based on screen size
  const getBaseDotSize = () => {
    // Use a smaller base size for mobile
    if (typeof window !== "undefined") {
      return window.innerWidth < 640 ? 3 : 4
    }
    return 4 // Default size
  }

  return (
    <div className={`h-full w-full ${className}`}>
      <ChartContainer
        config={{
          grade: {
            label: "Grade",
            color: "hsl(var(--chart-1))",
          },
        }}
        className="h-full"
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{
              top: 5,
              right: 10,
              left: showAxis ? 20 : 0,
              bottom: showAxis ? 20 : 0,
            }}
          >
            {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />}

            {showAxis && (
              <>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  tickMargin={8}
                  stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(value) => {
                    // On small screens, show shorter date format
                    if (typeof window !== "undefined" && window.innerWidth < 640) {
                      const parts = value.split("-")
                      return parts.length === 3 ? `${parts[1]}/${parts[2]}` : value
                    }
                    return value
                  }}
                />
                <YAxis
                  domain={[1, 6]}
                  tick={{ fontSize: 10 }}
                  tickMargin={8}
                  stroke="hsl(var(--muted-foreground))"
                  reversed // Reverse the axis so 1 (best) is at the top
                />
              </>
            )}

            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="bg-card border-border shadow-lg"
                  content={({ payload }) => {
                    if (payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <div className="space-y-1 p-1">
                          <p className="text-xs sm:text-sm font-medium">{data.date}</p>
                          <p className="text-xs text-muted-foreground">{data.type}</p>
                          <p className="text-xs sm:text-sm font-bold">Grade: {data.value}</p>
                          <p className="text-xs text-muted-foreground">Weight: {data.weight}x</p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
              }
            />

            {/* Reference lines for grade thresholds */}
            <ReferenceLine y={1.5} stroke="hsl(var(--success))" strokeDasharray="3 3" />
            <ReferenceLine y={3.5} stroke="hsl(var(--warning))" strokeDasharray="3 3" />
            <ReferenceLine y={4.5} stroke="hsl(var(--destructive))" strokeDasharray="3 3" />

            <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />

            {/* Scatter plot for dots with size based on weight */}
            <Scatter
              data={chartData}
              fill="hsl(var(--primary))"
              line={false}
              shape={(props: any) => {
                const { cx, cy, payload } = props
                const baseSize = getBaseDotSize()
                const size = (payload.weight || 1) * baseSize // Base size on weight

                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={size}
                    fill="hsl(var(--background))"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                  />
                )
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  )
}

