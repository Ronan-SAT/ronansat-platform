export type ParentOverview = {
  highestScore: number;
  testsCompleted: number;
  activityLast30Days: number;
  lastActiveAt: string | null;
};

export type ParentScoreHistoryPoint = {
  id: string;
  dateKey: string;
  label: string;
  total: number;
  math: number;
  rw: number;
  takenAt: string;
};

export type ParentTestsPerDayPoint = {
  dateKey: string;
  label: string;
  tests: number;
};

export type ParentTimeSpentPerDayPoint = {
  dateKey: string;
  label: string;
  minutes: number;
};

export type ParentRecentTestItem = {
  id: string;
  testName: string;
  takenAt: string;
  dateLabel: string;
  timeLabel: string;
  readingWritingScore: number;
  mathScore: number;
  totalScore: number;
};

export type ParentDashboardResponse = {
  hasChildren: boolean;
  child: {
    id: string;
    name: string;
    email: string;
  } | null;
  overview: ParentOverview;
  timeSpentByWindow: Record<string, number>;
  scoreHistory: ParentScoreHistoryPoint[];
  testsPerDay: Record<string, ParentTestsPerDayPoint[]>;
  timeSpentPerDay: Record<string, ParentTimeSpentPerDayPoint[]>;
  recentTests: ParentRecentTestItem[];
  error?: string;
};
