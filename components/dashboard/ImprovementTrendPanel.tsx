"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, ChartSpline } from "lucide-react";
import { Area, AreaChart, CartesianGrid, Line, XAxis, YAxis } from "recharts";

import { getDisplayScore, getResultDateValue } from "@/components/dashboard/dashboardResultUtils";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { UserResultSummary } from "@/types/testLibrary";

type ImprovementTrendPanelProps = {
  results: UserResultSummary[];
};

type RangeOption = 15 | 30;

type ChartPoint = {
  dateKey: string;
  shortLabel: string;
  fullLabel: string;
  score: number | null;
};

const chartConfig = {
  score: {
    label: "Score",
    color: "var(--color-accent-2)",
  },
} satisfies ChartConfig;

export default function ImprovementTrendPanel({ results }: ImprovementTrendPanelProps) {
  const [range, setRange] = useState<RangeOption>(15);
  const rangeSummary = useMemo(() => buildRangeSummary(results, range), [range, results]);

  return (
    <section className="workbook-panel overflow-hidden">
      <div className="border-b-4 border-ink-fg bg-paper-bg px-5 py-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="workbook-sticker bg-accent-2 text-white">Improvement Graph</div>
            <h2 className="mt-4 font-display text-3xl font-black uppercase tracking-tight text-ink-fg">
              Progress over the last {range === 15 ? "15 days" : "month"}.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-fg/75">
              Daily best score trend from your recent practice history, themed from the shadcn chart base into the workbook system.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 md:justify-end">
            {[15, 30].map((option) => {
              const isActive = range === option;

              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setRange(option as RangeOption)}
                  className={[
                    "min-w-[8rem] rounded-2xl border-2 border-ink-fg px-5 py-3 text-center text-xs font-black uppercase tracking-[0.16em] workbook-press brutal-shadow-sm",
                    isActive ? "bg-primary text-ink-fg" : "bg-paper-bg text-ink-fg/75 hover:bg-surface-white",
                  ].join(" ")}
                >
                  {option === 15 ? "15 Days" : "Month"}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-4 border-b-2 border-ink-fg bg-surface-white px-5 py-4 sm:grid-cols-3">
        <MetricCard label="Score Change" value={rangeSummary.scoreChangeLabel} accentClassName={rangeSummary.scoreChange >= 0 ? "bg-primary" : "bg-accent-3 text-white"} />
        <MetricCard label="Latest Score" value={rangeSummary.latestScoreLabel} accentClassName="bg-accent-2 text-white" />
        <MetricCard label="Full Tests" value={String(rangeSummary.tests)} accentClassName="bg-accent-1" />
      </div>

      <div className="bg-surface-white px-4 py-5 sm:px-5">
        {rangeSummary.hasData ? (
          <ChartContainer config={chartConfig} className="min-h-[260px] w-full">
            <AreaChart accessibilityLayer data={rangeSummary.chartData} margin={{ top: 18, right: 16, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="score-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-score)" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="var(--color-score)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="shortLabel" tickLine={false} axisLine={false} tickMargin={10} minTickGap={20} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={52}
                domain={rangeSummary.domain}
                ticks={rangeSummary.ticks}
                tickFormatter={(value) => String(value)}
              />
              <ChartTooltip
                cursor={{ stroke: "var(--color-ink-fg)", strokeDasharray: "4 4", strokeOpacity: 0.35 }}
                content={
                  <ChartTooltipContent
                    indicator="line"
                    labelFormatter={(_, payload) => {
                      const point = payload?.[0]?.payload as ChartPoint | undefined;
                      return point?.fullLabel ?? "";
                    }}
                    formatter={(value) => (
                      <div className="flex w-full items-center justify-between gap-4">
                        <span className="text-xs font-medium uppercase tracking-[0.14em] text-ink-fg/75">Best Score</span>
                        <span className="font-display text-lg font-black tracking-tight text-ink-fg">{value}</span>
                      </div>
                    )}
                  />
                }
              />
              <Area
                dataKey="score"
                type="monotone"
                connectNulls={false}
                stroke="var(--color-score)"
                strokeWidth={3}
                fill="url(#score-fill)"
                activeDot={{ r: 5, fill: "var(--color-primary)", stroke: "var(--color-ink-fg)", strokeWidth: 2 }}
              />
              <Line
                dataKey="score"
                type="monotone"
                connectNulls={false}
                stroke="var(--color-score)"
                strokeWidth={3}
                dot={{ r: 3, fill: "var(--color-surface-white)", stroke: "var(--color-ink-fg)", strokeWidth: 2 }}
                activeDot={{ r: 5, fill: "var(--color-primary)", stroke: "var(--color-ink-fg)", strokeWidth: 2 }}
              />
            </AreaChart>
          </ChartContainer>
        ) : (
          <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-ink-fg bg-paper-bg px-6 py-10 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl border-2 border-ink-fg bg-primary brutal-shadow-sm">
              <ChartSpline className="h-6 w-6 text-ink-fg" />
            </div>
            <p className="mt-5 font-display text-2xl font-black uppercase tracking-tight text-ink-fg">
              Your graph appears after the first score lands.
            </p>
            <p className="mt-2 max-w-md text-sm leading-6 text-ink-fg/70">
              Complete a practice test to start tracking improvement across the last 15 days and the full month.
            </p>
          </div>
        )}
      </div>

      <div className="border-t-2 border-ink-fg bg-paper-bg px-5 py-4 text-sm text-ink-fg/75">
        <span className="inline-flex items-center gap-2 font-medium">
          <ArrowUpRight className="h-4 w-4" />
          {rangeSummary.footerText}
        </span>
      </div>
    </section>
  );
}

function MetricCard({ label, value, accentClassName }: { label: string; value: string; accentClassName: string }) {
  return (
    <div className="rounded-2xl border-2 border-ink-fg bg-paper-bg p-4">
      <div className={["inline-flex rounded-full border-2 border-ink-fg px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] brutal-shadow-sm", accentClassName].join(" ")}>
        {label}
      </div>
      <p className="mt-3 font-display text-3xl font-black tracking-tight text-ink-fg">{value}</p>
    </div>
  );
}

function buildRangeSummary(results: UserResultSummary[], range: RangeOption) {
  const end = new Date();
  end.setHours(0, 0, 0, 0);

  const start = new Date(end);
  start.setDate(start.getDate() - (range - 1));

  const bestScoresByDate = new Map<string, number>();
  let tests = 0;

  for (const result of results) {
    if (result.isSectional) {
      continue;
    }

    const rawDate = getResultDateValue(result);

    if (!rawDate) {
      continue;
    }

    const resultDate = new Date(rawDate);
    resultDate.setHours(0, 0, 0, 0);

    if (resultDate < start || resultDate > end) {
      continue;
    }

    tests += 1;

    const dateKey = resultDate.toISOString().split("T")[0];
    const score = getDisplayScore(result);
    const currentBest = bestScoresByDate.get(dateKey);

    if (typeof currentBest !== "number" || score > currentBest) {
      bestScoresByDate.set(dateKey, score);
    }
  }

  const chartData: ChartPoint[] = [];

  for (let index = 0; index < range; index += 1) {
    const currentDate = new Date(start);
    currentDate.setDate(start.getDate() + index);

    const dateKey = currentDate.toISOString().split("T")[0];

    chartData.push({
      dateKey,
      shortLabel: currentDate.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      fullLabel: currentDate.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }),
      score: bestScoresByDate.get(dateKey) ?? null,
    });
  }

  const completedPoints = chartData.filter((point) => typeof point.score === "number");
  const latestScore = completedPoints.at(-1)?.score ?? null;
  const firstScore = completedPoints[0]?.score ?? null;
  const scoreChange = latestScore != null && firstScore != null ? latestScore - firstScore : 0;
  const numericScores = completedPoints.map((point) => point.score as number);
  const minScore = numericScores.length ? Math.min(...numericScores) : 400;
  const maxScore = numericScores.length ? Math.max(...numericScores) : 1600;
  const paddedMin = Math.max(0, Math.floor((minScore - 40) / 10) * 10);
  const paddedMax = Math.ceil((maxScore + 40) / 10) * 10;
  const midPoint = Math.round((paddedMin + paddedMax) / 2 / 10) * 10;

  return {
    chartData,
    domain: [paddedMin, paddedMax] as [number, number],
    ticks: Array.from(new Set([paddedMin, midPoint, paddedMax])).sort((left, right) => left - right),
    hasData: completedPoints.length > 0,
    latestScoreLabel: latestScore != null ? String(latestScore) : "—",
    scoreChange,
    scoreChangeLabel: completedPoints.length > 1 ? `${scoreChange > 0 ? "+" : ""}${scoreChange}` : "—",
    tests,
    footerText:
      completedPoints.length > 1
        ? `${scoreChange >= 0 ? "Up" : "Down"} ${Math.abs(scoreChange)} points from your first tracked score in this window.`
        : "Add a few more attempts in this window to surface a clearer trend line.",
  };
}
