"use client";

import { useMemo } from "react";
import { LineChart, Line, Grid, XAxis, ChartTooltip } from "@/components/charts";

/**
 * Chart mensile dei ricavi basato sul LineChart di bklit UI (MIT © 2026 uixmat).
 * Composable: Grid, XAxis, Line e ChartTooltip sono componenti figli del
 * LineChart root. I dati sono [{label: string, value: number}] e vengono
 * convertiti nel formato Date-richiesto dal chart.
 */
interface ChartPoint {
  label: string;
  value: number;
}

interface RevenueChartProps {
  data: ChartPoint[];
  height?: number;
  formatValue?: (value: number) => string;
  title: string;
  subtitle?: string;
}

export function RevenueLineChart({
  data,
  height = 200,
  title,
  subtitle,
}: RevenueChartProps) {
  const chartData = useMemo(() => {
    if (data.length === 0) return [];
    const now = new Date();
    return data.map((d, i) => ({
      date: new Date(now.getFullYear(), now.getMonth() - (data.length - 1 - i), 1),
      value: d.value,
    }));
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="ops-card p-4 md:p-5">
        <h3 className="font-display text-[15px] font-semibold" style={{ color: "var(--text)" }}>{title}</h3>
        {subtitle && <p className="mt-1 text-xs" style={{ color: "var(--text-label)" }}>{subtitle}</p>}
        <div className="flex h-[180px] items-center justify-center text-sm" style={{ color: "var(--text-label)" }}>
          Nessun dato disponibile per il periodo.
        </div>
      </div>
    );
  }

  return (
    <div className="ops-card p-4 md:p-5">
      <h3 className="font-display text-[15px] font-semibold" style={{ color: "var(--text)" }}>{title}</h3>
      {subtitle && <p className="mt-1 text-xs" style={{ color: "var(--text-label)" }}>{subtitle}</p>}

      <div className="mt-4" style={{ height }}>
        <LineChart data={chartData} xDataKey="date" className="h-full w-full" aspectRatio="" margin={{ top: 12, right: 16, bottom: 24, left: 48 }}>
          <Grid horizontal />
          <XAxis />
          <Line dataKey="value" stroke="var(--chart-line-primary)" strokeWidth={2.5} />
          <ChartTooltip />
        </LineChart>
      </div>
    </div>
  );
}
