"use client";

import { useEffect, useState } from "react";

import LeaderboardTable from "@/components/dashboard/LeaderboardTable";
import LeaderboardTableSkeleton from "@/components/dashboard/LeaderboardTableSkeleton";
import ImprovementTrendPanel from "@/components/dashboard/ImprovementTrendPanel";
import RecentResultsList from "@/components/dashboard/RecentResultsList";
import UserStatsPanel from "@/components/dashboard/UserStatsPanel";
import UserStatsPanelSkeleton from "@/components/dashboard/UserStatsPanelSkeleton";
import { fetchDashboardUserResults, fetchDashboardUserStats, fetchLeaderboard } from "@/lib/services/dashboardService";
import type { LeaderboardEntry, UserResultSummary, UserStatsSummary } from "@/types/testLibrary";

export default function DashboardPageClient() {
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState<UserStatsSummary | null>(null);
  const [userResults, setUserResults] = useState<UserResultSummary[] | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboardData() {
      try {
        const [statsResult, resultsResult, leaderboardResult] = await Promise.all([
          fetchDashboardUserStats(),
          fetchDashboardUserResults(30),
          fetchLeaderboard(),
        ]);

        if (cancelled) return;

        setUserStats(statsResult);
        setUserResults(resultsResult);
        setLeaderboard(leaderboardResult);
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDashboardData();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-paper-bg pb-12">
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="workbook-panel-muted mb-6 overflow-hidden">
          <div className="border-b-4 border-ink-fg bg-paper-bg px-6 py-5">
            <div className="workbook-sticker bg-primary text-ink-fg">Student Dashboard</div>
            <h1 className="mt-4 font-display text-4xl font-black uppercase tracking-tight text-ink-fg md:text-5xl">
              Keep the whole workbook moving.
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-fg md:text-base">
              Check your latest score signals and keep review momentum visible without leaving the dashboard.
            </p>
          </div>
        </section>

        <div className="space-y-8">
          {loading || !userStats || !userResults ? (
            <UserStatsPanelSkeleton />
          ) : (
            <UserStatsPanel userStats={userStats} userResults={userResults} />
          )}

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
            {loading || !userResults ? (
              <>
                <div className="workbook-panel p-6 min-h-[300px] animate-pulse bg-surface-white" />
                <div className="workbook-panel p-6 min-h-[300px] animate-pulse bg-surface-white" />
              </>
            ) : (
              <>
                <ImprovementTrendPanel results={userResults} />
                <RecentResultsList results={userResults} />
              </>
            )}
          </div>

          {loading || !leaderboard ? (
            <LeaderboardTableSkeleton />
          ) : (
            <LeaderboardTable leaderboard={leaderboard} />
          )}
        </div>
      </main>
    </div>
  );
}
