import type { UserStatsSummary } from "@/types/testLibrary";

export type DashboardActivityDay = {
  dateKey: string;
  count: number;
};

export type DashboardRecentResult = {
  _id: string;
  createdAt: string;
  score?: number;
  totalScore?: number;
  readingScore?: number;
  mathScore?: number;
  isSectional?: boolean;
  sectionalSubject?: string;
  sectionalModule?: number;
};

export type DashboardTrendPoint = {
  dateKey: string;
  score: number;
  tests: number;
};

export type DashboardOverview = {
  userStats: UserStatsSummary;
  activity: DashboardActivityDay[];
  recentResults: DashboardRecentResult[];
  trend: DashboardTrendPoint[];
};
