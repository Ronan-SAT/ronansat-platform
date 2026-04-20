import Link from "next/link";

import type { DashboardRecentResult } from "@/types/dashboard";

type RecentResultsListProps = {
  results: DashboardRecentResult[];
};

function getDisplayDate(result: DashboardRecentResult) {
  return new Date(result.createdAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getDisplayScore(result: DashboardRecentResult) {
  if (result.isSectional) {
    return result.score || result.totalScore || 0;
  }

  return Math.max(400, result.totalScore || result.score || 0);
}

export default function RecentResultsList({ results }: RecentResultsListProps) {
  const recentResults = results;

  return (
    <section className="workbook-panel overflow-hidden">
      <div className="border-b-4 border-ink-fg bg-paper-bg px-5 py-4">
        <div className="workbook-sticker bg-accent-1 text-ink-fg">Recent Work</div>
        <h2 className="mt-4 font-display text-3xl font-black uppercase tracking-tight text-ink-fg">
          Latest score trail.
        </h2>
      </div>

      <div className="p-4">
        {recentResults.length === 0 ? (
          <div className="rounded-2xl border-2 border-ink-fg bg-paper-bg px-4 py-8 text-center text-sm leading-6 text-ink-fg">
            Complete your first test to start a visible result trail.
          </div>
        ) : (
          <div className="space-y-3">
            {recentResults.map((result) => {
              const href = result._id
                ? `/review?mode=${result.isSectional ? "sectional" : "full"}&resultId=${result._id}`
                : "/review";

              return (
                <Link
                  key={result._id}
                  href={href}
                  className="flex items-center justify-between gap-4 rounded-2xl border-2 border-ink-fg bg-surface-white px-4 py-4 brutal-shadow-sm workbook-press"
                >
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink-fg/70">
                      {result.isSectional ? result.sectionalSubject || "Sectional" : "Full-Length"}
                    </p>
                    <p className="mt-1 text-sm font-medium text-ink-fg">{getDisplayDate(result)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink-fg/70">Score</p>
                    <p className="mt-1 font-display text-3xl font-black tracking-tight text-ink-fg">
                      {getDisplayScore(result)}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
