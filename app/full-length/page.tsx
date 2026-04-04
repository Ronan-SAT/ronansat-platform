"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { API_PATHS } from "@/lib/apiPaths";

import UserStatsPanel from "@/components/dashboard/UserStatsPanel";
import LeaderboardTable from "@/components/dashboard/LeaderboardTable";
import TestLibrary from "@/components/dashboard/TestLibrary";
import UserStatsPanelSkeleton from "@/components/dashboard/UserStatsPanelSkeleton";
import LeaderboardTableSkeleton from "@/components/dashboard/LeaderboardTableSkeleton";

export default function FullLengthDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tests, setTests] = useState<any[]>([]);
  const [testsLoading, setTestsLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [userStats, setUserStats] = useState({ testsTaken: 0, highestScore: 0 });
  const [userResults, setUserResults] = useState([]);
  const [sortOption, setSortOption] = useState("newest");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 6;
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState("All");

  const uniquePeriods = ["All", ...Array.from(new Set(tests.map(t => {
      const parts = t.title.split(" ");
      if (parts.length >= 2) return `${parts[0]} ${parts[1]}`;
      return "Other";
  })))];

  const filteredTests = tests.filter(t => {
    if (selectedPeriod === "All") return true;
    if (selectedPeriod === "Other") return t.title.split(" ").length < 2;
    return t.title.startsWith(selectedPeriod);
  });

  useEffect(() => {
      if (status === "unauthenticated") {
          router.push("/");
      }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      const fetchUserStats = async () => {
        setStatsLoading(true);
        try {
          const statsRes = await api.get(`${API_PATHS.RESULTS}?days=30`);
          if (statsRes.data.results) setUserResults(statsRes.data.results);
          const userRes = await api.get("/api/user/stats");
          if (userRes.data) {
            setUserStats({
              testsTaken: userRes.data.testsTaken || 0,
              highestScore: userRes.data.highestScore || 0,
            });
          }
        } catch (e) {
          console.error("Failed to load user stats", e);
        } finally {
          setStatsLoading(false);
        }
      };

      const fetchLeaderboard = async () => {
        setLeaderboardLoading(true);
        try {
          const res = await api.get("/api/leaderboard");
          setLeaderboard(res.data.leaderboard || []);
        } catch (e) {
          console.error("Failed to load leaderboard", e);
        } finally {
          setLeaderboardLoading(false);
        }
      };

      fetchUserStats();
      fetchLeaderboard();
    }
  }, [session]);

  useEffect(() => {
    const fetchTests = async () => {
      setTestsLoading(true);
      try {
        let sortBy = "createdAt";
        let sortOrder = "desc";

        if (sortOption === "oldest") sortOrder = "asc";
        else if (sortOption === "title_asc") {
          sortBy = "title";
          sortOrder = "asc";
        } else if (sortOption === "title_desc") {
          sortBy = "title";
          sortOrder = "desc";
        }

        const res = await api.get(`${API_PATHS.TESTS}?page=${page}&limit=${limit}&sortBy=${sortBy}&sortOrder=${sortOrder}`);
        setTests(res.data.tests || []);
        if (res.data.pagination) setTotalPages(res.data.pagination.totalPages);
      } catch (e) {
        console.error("Failed to fetch tests", e);
      } finally {
        setTestsLoading(false);
      }
    };

    fetchTests();
  }, [page, sortOption]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-slate-50 pb-12">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <UserStatsPanelSkeleton />
          <LeaderboardTableSkeleton />
          <TestLibrary
            uniquePeriods={["All", "March 2026", "May 2026"]}
            selectedPeriod="All"
            setSelectedPeriod={() => {}}
            sortOption="newest"
            setSortOption={() => {}}
            page={1}
            setPage={() => {}}
            loading={true}
            filteredTests={[]}
            totalPages={1}
          />
        </main>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {statsLoading ? (
          <UserStatsPanelSkeleton />
        ) : (
          <UserStatsPanel userStats={userStats} userResults={userResults} />
        )}
        {leaderboardLoading ? (
          <LeaderboardTableSkeleton />
        ) : (
          <LeaderboardTable leaderboard={leaderboard} />
        )}
        <TestLibrary
          uniquePeriods={uniquePeriods}
          selectedPeriod={selectedPeriod}
          setSelectedPeriod={setSelectedPeriod}
          sortOption={sortOption}
          setSortOption={setSortOption}
          page={page}
          setPage={setPage}
          loading={testsLoading}
          filteredTests={filteredTests}
          totalPages={totalPages}
        />
      </main>
    </div>
  );
}
