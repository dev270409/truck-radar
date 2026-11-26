// bklit UI — official shadcn-install barrel
// Source: github.com/bklit/bklit-ui registry/examples/line-chart-index.ts (MIT, © 2026 uixmat)
// Lets consumers import from "@/components/charts".
// biome-ignore-all lint/performance/noBarrelFile: v0 registry example barrel for shadcn install
export { LineChart } from "./line-chart";
export { Line } from "./line";
export { Grid } from "./grid";
export { XAxis } from "./x-axis";
export { ChartTooltip } from "./tooltip";

// Also present in this closure, export on demand (same pattern):
//   Background (background.tsx), Band (band.tsx), ProjectionLine (projection-line.tsx),
//   LineBackdrop (line-backdrop.tsx), LineChartLoading (line-chart-loading.tsx),
//   buildProjectionPath (projection-utils.ts).
// NOT included (separate registry items, fetch if needed):
//   YAxis, TrendLine, ChartBrush, ChartMarkers.
