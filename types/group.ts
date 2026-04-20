export type GroupPermissionCode = "create_remove_groups" | "edit_groups" | "manage_students" | "group_stat_view";

export type GroupMember = {
  userId: string;
  email: string | null;
  displayName: string | null;
  username: string | null;
  joinedAt: string;
};

export type GroupSummary = {
  id: string;
  name: string;
  ownerUserId: string;
  ownerEmail: string | null;
  ownerDisplayName: string | null;
  ownerUsername: string | null;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  canRename: boolean;
  canManageStudents: boolean;
  canDelete: boolean;
  canViewStats: boolean;
  isOwner: boolean;
  members: GroupMember[];
};

export type GroupStatsOverview = {
  memberCount: number;
  activeMembers: number;
  totalAttempts: number;
  fullAttempts: number;
  sectionalAttempts: number;
  averageScore: number | null;
  highestScore: number | null;
  lastTakenAt: string | null;
};

export type GroupMemberStat = {
  userId: string;
  joinedAt: string;
  testsTaken: number;
  fullTestsTaken: number;
  sectionalTestsTaken: number;
  lastTakenAt: string | null;
  latestScore: number | null;
  latestTestTitle: string | null;
  latestMode: "full" | "sectional" | null;
  bestScore: number | null;
  averageScore: number | null;
};

export type GroupStats = {
  overview: GroupStatsOverview;
  members: GroupMemberStat[];
};

export type GroupDetail = {
  group: GroupSummary;
  stats: GroupStats | null;
};

export type GroupDirectory = {
  groups: GroupSummary[];
  capabilities: {
    canCreateGroup: boolean;
    canManageAnyGroup: boolean;
  };
};

export type GroupInviteResult = {
  email: string;
  success: boolean;
  message: string;
  userId?: string;
};

export type GroupAccessTokenStatus = {
  hasToken: boolean;
  preview: string | null;
  generatedAt: string | null;
  rotatedAt: string | null;
};

export type GroupAccessTokenResponse = GroupAccessTokenStatus & {
  token?: string;
};
