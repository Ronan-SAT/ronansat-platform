// Dashboard - ronansat.com/suite

"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Loading from "@/components/Loading";
import api from "@/lib/axios";
import { API_PATHS } from "@/lib/apiPaths";

// Import dashboard components
import UserStatsPanel from "@/components/dashboard/UserStatsPanel";
import LeaderboardTable from "@/components/dashboard/LeaderboardTable";
import TestLibrary from "@/components/dashboard/TestLibrary";

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tests, setTests] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState({ 
    testsTaken: 0,
    highestScore: 0,
  });
  const [userResults, setUserResults] = useState([]);
  const [sortOption, setSortOption] = useState("newest");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 6;

  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  const [selectedPeriod, setSelectedPeriod] = useState("All");

  const uniquePeriods = ["All", ...Array.from(new Set(tests.map(t => {
      const parts = t.title.split(' ');
      if (parts.length >= 2) return `${parts[0]} ${parts[1]}`;
      return "Other";
  })))];

  const filteredTests = tests.filter(t => {
    if (selectedPeriod === "All") return true;
    if (selectedPeriod === "Other") return t.title.split(' ').length < 2;
    return t.title.startsWith(selectedPeriod);
  });

  // Redirect to landing if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      const fetchUserStats = async () => {
        try {
          const statsRes = await api.get(`${API_PATHS.RESULTS}?days=30`);
          const statsData = statsRes.data;
          if (statsData.results) { 
            setUserResults(statsData.results);
          }

          const userRes = await api.get('/api/user/stats');
          const userData = userRes.data;
          if (userData) {
            setUserStats({
              testsTaken: userData.testsTaken || 0,
              highestScore: userData.highestScore || 0,
            });
          }

        } catch (e) {
          console.error("Failed to load user stats", e);
        }
      };

      const fetchLeaderboard = async () => {
        try {
          const res = await api.get('/api/leaderboard');
          setLeaderboard(res.data.leaderboard || []);
        } catch (e) {
          console.error("Failed to load leaderboard", e);
        }
      };

      fetchUserStats();
      fetchLeaderboard();
    }
  }, [session]);

  useEffect(() => {
    const fetchTests = async () => {
      setLoading(true);
      try {
        let sortBy = "createdAt";
        let sortOrder = "desc";

        if (sortOption === "oldest") {
          sortOrder = "asc";
        } else if (sortOption === "title_asc") {
          sortBy = "title";
          sortOrder = "asc";
        } else if (sortOption === "title_desc") {
          sortBy = "title";
          sortOrder = "desc";
        }

        const res = await api.get(`${API_PATHS.TESTS}?page=${page}&limit=${limit}&sortBy=${sortBy}&sortOrder=${sortOrder}`);
        setTests(res.data.tests || []);
        if (res.data.pagination) {
          setTotalPages(res.data.pagination.totalPages);
        }
      } catch (e) {
        console.error("Failed to fetch tests", e);
      } finally {
        setLoading(false);
      }
    }

    fetchTests();
  }, [page, sortOption]);

  if (status === "loading") {
    return <Loading />;
  }

  if (status === "unauthenticated" || !session) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
        <UserStatsPanel userStats={userStats} userResults={userResults} />
        <LeaderboardTable leaderboard={leaderboard} />
        <TestLibrary 
          uniquePeriods={uniquePeriods}
          selectedPeriod={selectedPeriod}
          setSelectedPeriod={setSelectedPeriod}
          sortOption={sortOption}
          setSortOption={setSortOption}
          page={page}
          setPage={setPage}
          loading={loading}
          filteredTests={filteredTests}
          totalPages={totalPages}
        />

      </main>
    </div>
  );
}
