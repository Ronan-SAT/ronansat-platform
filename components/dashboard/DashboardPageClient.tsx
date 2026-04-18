"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import InitialTabBootReady from "@/components/InitialTabBootReady";
import LeaderboardTable from "@/components/dashboard/LeaderboardTable";
import ImprovementTrendPanel from "@/components/dashboard/ImprovementTrendPanel";
import RecentResultsList from "@/components/dashboard/RecentResultsList";
import UserStatsPanel from "@/components/dashboard/UserStatsPanel";
import Loading from "@/components/Loading";
import { fetchDashboardUserResults, fetchDashboardUserStats, fetchLeaderboard } from "@/lib/services/dashboardService";
import { getClientCache, setClientCache } from "@/lib/clientCache";
import { preloadInitialAppData } from "@/lib/startupPreload";
import type { LeaderboardEntry, UserResultSummary, UserStatsSummary } from "@/types/testLibrary";

const CACHE_STATS = "dashboard:stats";
const CACHE_RESULTS = "dashboard:results:30";
const CACHE_LEADERBOARD = "dashboard:leaderboard";
const API_CACHE_STATS = "api:dashboard:stats";
const API_CACHE_RESULTS = "api:dashboard:results:30";
const API_CACHE_LEADERBOARD = "api:dashboard:leaderboard";

export default function DashboardPageClient() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [userStats, setUserStats] = useState<UserStatsSummary>({ testsTaken: 0, highestScore: 0 });
  const [userResults, setUserResults] = useState<UserResultSummary[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth");
      return;
    }

    if (status !== "authenticated" || !session?.user?.role) {
      return;
    }

    if (session.user.role === "PARENT") {
      router.replace("/parent/dashboard");
      return;
    }

    if (!session.user.hasCompletedProfile) {
      router.replace("/welcome");
      return;
    }

    let cancelled = false;

    const loadDashboard = async () => {
      setLoading(true);

      await preloadInitialAppData({
        role: session.user.role,
        userId: session.user.id,
      });

      if (cancelled) {
        return;
      }

      const cachedStats = getClientCache<UserStatsSummary>(CACHE_STATS) ?? getClientCache<UserStatsSummary>(API_CACHE_STATS);
      const cachedResults =
        getClientCache<UserResultSummary[]>(CACHE_RESULTS) ?? getClientCache<UserResultSummary[]>(API_CACHE_RESULTS);
      const cachedLeaderboard =
        getClientCache<LeaderboardEntry[]>(CACHE_LEADERBOARD) ?? getClientCache<LeaderboardEntry[]>(API_CACHE_LEADERBOARD);

      if (cachedStats !== undefined && cachedResults !== undefined && cachedLeaderboard !== undefined) {
        if (!cancelled) {
          setClientCache(CACHE_STATS, cachedStats);
          setClientCache(CACHE_RESULTS, cachedResults);
          setClientCache(CACHE_LEADERBOARD, cachedLeaderboard);
          setUserStats(cachedStats);
          setUserResults(cachedResults);
          setLeaderboard(cachedLeaderboard);
          setLoading(false);
        }
        return;
      }

      try {
        const [stats, results, board] = await Promise.all([
          fetchDashboardUserStats(),
          fetchDashboardUserResults(30),
          fetchLeaderboard(),
        ]);

        if (cancelled) {
          return;
        }

        setClientCache(CACHE_STATS, stats);
        setClientCache(CACHE_RESULTS, results);
        setClientCache(CACHE_LEADERBOARD, board);

        setUserStats(stats);
        setUserResults(results);
        setLeaderboard(board);
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load student dashboard", error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [router, session?.user?.hasCompletedProfile, session?.user?.role, status]);

  if (status === "loading" || loading) {
    return <Loading showQuote={false} />;
  }

  if (status === "unauthenticated") {
    return null;
  }

  if (!session?.user?.hasCompletedProfile) {
    return null;
  }

  if (session?.user.role === "PARENT") {
    return null;
  }

  return (
    <div className="min-h-screen bg-paper-bg pb-12">
      <InitialTabBootReady />
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
          <UserStatsPanel userStats={userStats} userResults={userResults} />
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
            <ImprovementTrendPanel results={userResults} />
            <RecentResultsList results={userResults} />
          </div>
          <LeaderboardTable leaderboard={leaderboard} />
        </div>
      </main>
    </div>
  );
}
