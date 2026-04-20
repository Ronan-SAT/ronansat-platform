import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  generateGroupAccessToken,
  getGroupAccessTokenHash,
  getGroupAccessTokenPreview,
  isGroupAccessTokenFormat,
  verifyGroupAccessToken,
} from "@/lib/groupAccessToken";
import type { AddGroupMembersInput, CreateGroupInput, InviteGroupMemberRowInput, UpdateGroupInput } from "@/lib/schema/group";
import type {
  GroupAccessTokenResponse,
  GroupAccessTokenStatus,
  GroupDetail,
  GroupDirectory,
  GroupInviteResult,
  GroupMember,
  GroupStats,
  GroupSummary,
} from "@/types/group";

type GroupRow = {
  id: string;
  name: string;
  owner_user_id: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

type GroupMembershipRow = {
  group_id: string;
  student_user_id: string;
  created_at: string;
};

type ProfileRow = {
  id: string;
  username: string | null;
  display_name: string | null;
};

type UserRoleRow = {
  user_id: string;
  roles: {
    code: string;
    role_permissions?: Array<{
      permissions?: {
        code?: string | null;
      } | Array<{ code?: string | null }> | null;
    }> | null;
  } | Array<{
    code: string;
    role_permissions?: Array<{
      permissions?: {
        code?: string | null;
      } | Array<{ code?: string | null }> | null;
    }> | null;
  }> | null;
};

type UserSettingsTokenRow = {
  user_id: string;
  group_access_token_hash: string | null;
  group_access_token_prefix: string | null;
  group_access_token_generated_at: string | null;
  group_access_token_rotated_at: string | null;
};

type ActorAccess = {
  userId: string;
  roleCodes: string[];
  permissionCodes: string[];
  isAdmin: boolean;
  canCreateGroup: boolean;
  canRenameAnyGroup: boolean;
  canManageStudentsInGroups: boolean;
  canManageAnyGroup: boolean;
  canViewJoinedGroupStats: boolean;
};

type GroupStatsRpcResponse = GroupStats;

function readRolesValue(value: UserRoleRow["roles"]) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function readPermissionCode(
  value: { code?: string | null } | Array<{ code?: string | null }> | null | undefined,
) {
  return Array.isArray(value) ? value[0]?.code ?? null : value?.code ?? null;
}

function getNormalizedEmail(value: string) {
  return value.trim().toLowerCase();
}

function getActorAccessFromUserRoles(userId: string, userRoles: UserRoleRow[]): ActorAccess {
  const roleCodes = new Set<string>();
  const permissionCodes = new Set<string>();

  for (const userRole of userRoles) {
    const role = readRolesValue(userRole.roles);

    if (!role?.code) {
      continue;
    }

    roleCodes.add(role.code);

    for (const rolePermission of role.role_permissions ?? []) {
      const code = readPermissionCode(rolePermission.permissions);

      if (code) {
        permissionCodes.add(code);
      }
    }
  }

  const roleCodeList = Array.from(roleCodes);
  const permissionCodeList = Array.from(permissionCodes).sort();
  const isAdmin = roleCodeList.includes("admin");
  const canCreateGroup = isAdmin || permissionCodes.has("create_remove_groups");
  const canRenameAnyGroup = isAdmin || permissionCodes.has("edit_groups");
  const canManageStudentsInGroups = isAdmin || permissionCodes.has("manage_students");
  const canManageAnyGroup = canRenameAnyGroup || canManageStudentsInGroups;
  const canViewJoinedGroupStats = isAdmin || permissionCodes.has("group_stat_view");

  return {
    userId,
    roleCodes: roleCodeList,
    permissionCodes: permissionCodeList,
    isAdmin,
    canCreateGroup,
    canRenameAnyGroup,
    canManageStudentsInGroups,
    canManageAnyGroup,
    canViewJoinedGroupStats,
  };
}

function ensureCanCreateGroup(actor: ActorAccess) {
  if (!actor.canCreateGroup) {
    throw new Error("You do not have permission to create groups.");
  }
}

function ensureCanRenameGroup(actor: ActorAccess) {
  if (actor.isAdmin || actor.permissionCodes.includes("edit_groups")) {
    return;
  }

  throw new Error("You do not have permission to rename this group.");
}

function ensureCanManageStudents(actor: ActorAccess) {
  if (actor.isAdmin || actor.permissionCodes.includes("manage_students")) {
    return;
  }

  throw new Error("You do not have permission to manage students in groups.");
}

function ensureCanDeleteGroup(actor: ActorAccess, group: GroupRow) {
  if (actor.isAdmin || (actor.permissionCodes.includes("create_remove_groups") && group.owner_user_id === actor.userId)) {
    return;
  }

  throw new Error("You do not have permission to remove this group.");
}

function buildTokenStatus(row: UserSettingsTokenRow | null | undefined): GroupAccessTokenStatus {
  return {
    hasToken: Boolean(row?.group_access_token_hash),
    preview: row?.group_access_token_prefix ?? null,
    generatedAt: row?.group_access_token_generated_at ?? null,
    rotatedAt: row?.group_access_token_rotated_at ?? null,
  };
}

async function listAllAuthUsers() {
  const supabase = createSupabaseAdminClient();
  const users: Array<{ id: string; email: string | null }> = [];
  const perPage = 1000;
  let page = 1;

  while (true) {
    const result = await supabase.auth.admin.listUsers({ page, perPage });

    if (result.error) {
      throw new Error("Failed to load auth users");
    }

    const currentUsers = result.data.users.map((user) => ({ id: user.id, email: user.email ?? null }));
    users.push(...currentUsers);

    if (currentUsers.length < perPage) {
      break;
    }

    page += 1;
  }

  return users;
}

async function loadAuthUsersByIds(userIds: string[]) {
  const supabase = createSupabaseAdminClient();
  const uniqueUserIds = Array.from(new Set(userIds));
  const results = await Promise.all(uniqueUserIds.map((id) => supabase.auth.admin.getUserById(id)));
  const emailByUserId = new Map<string, string | null>();

  for (const [index, result] of results.entries()) {
    if (result.error || !result.data.user) {
      throw new Error("Failed to load auth users");
    }

    emailByUserId.set(uniqueUserIds[index], result.data.user.email ?? null);
  }

  return emailByUserId;
}

async function loadActorAccess(userId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("user_roles")
    .select(
      `
        user_id,
        roles (
          code,
          role_permissions (
            permissions (
              code
            )
          )
        )
      `,
    )
    .eq("user_id", userId);

  if (error) {
    throw new Error("Failed to load permissions");
  }

  return getActorAccessFromUserRoles(userId, (data ?? []) as UserRoleRow[]);
}

async function loadGroup(groupId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("groups")
    .select("id, name, owner_user_id, created_at, updated_at, archived_at")
    .eq("id", groupId)
    .maybeSingle<GroupRow>();

  if (error || !data) {
    throw new Error("Group not found.");
  }

  return data;
}

function canActorReadGroup(actor: ActorAccess, group: GroupRow, memberships: GroupMembershipRow[]) {
  return (
    actor.canManageAnyGroup ||
    group.owner_user_id === actor.userId ||
    memberships.some((membership) => membership.student_user_id === actor.userId)
  );
}

function buildGroupSummary(params: {
  actor: ActorAccess;
  group: GroupRow;
  memberships: GroupMembershipRow[];
  profilesById: Map<string, ProfileRow>;
  emailByUserId: Map<string, string | null>;
}): GroupSummary {
  const { actor, group, memberships, profilesById, emailByUserId } = params;
  const ownerProfile = profilesById.get(group.owner_user_id);
  const isOwner = group.owner_user_id === actor.userId;
  const canRename = actor.isAdmin || actor.permissionCodes.includes("edit_groups");
  const canManageStudents = actor.isAdmin || actor.permissionCodes.includes("manage_students");
  const canDelete = actor.isAdmin || (actor.permissionCodes.includes("create_remove_groups") && isOwner);
  const canViewStats = actor.canViewJoinedGroupStats || isOwner;
  const members: GroupMember[] = memberships
    .filter((membership) => membership.group_id === group.id)
    .map((membership) => {
      const profile = profilesById.get(membership.student_user_id);

      return {
        userId: membership.student_user_id,
        email: emailByUserId.get(membership.student_user_id) ?? null,
        displayName: profile?.display_name ?? null,
        username: profile?.username ?? null,
        joinedAt: membership.created_at,
      };
    })
    .sort((left, right) => {
      const leftLabel = left.displayName ?? left.username ?? left.email ?? left.userId;
      const rightLabel = right.displayName ?? right.username ?? right.email ?? right.userId;
      return leftLabel.localeCompare(rightLabel);
    });

  return {
    id: group.id,
    name: group.name,
    ownerUserId: group.owner_user_id,
    ownerEmail: emailByUserId.get(group.owner_user_id) ?? null,
    ownerDisplayName: ownerProfile?.display_name ?? null,
    ownerUsername: ownerProfile?.username ?? null,
    memberCount: members.length,
    createdAt: group.created_at,
    updatedAt: group.updated_at,
    archivedAt: group.archived_at,
    canRename,
    canManageStudents,
    canDelete,
    canViewStats,
    isOwner,
    members,
  };
}

async function loadGroupSummaryForActor(actor: ActorAccess, groupId: string) {
  const supabase = createSupabaseAdminClient();
  const [groupResult, membershipsResult] = await Promise.all([
    supabase.from("groups").select("id, name, owner_user_id, created_at, updated_at, archived_at").eq("id", groupId).maybeSingle<GroupRow>(),
    supabase.from("group_memberships").select("group_id, student_user_id, created_at").eq("group_id", groupId),
  ]);

  if (groupResult.error || !groupResult.data || membershipsResult.error) {
    throw new Error("Group not found.");
  }

  const group = groupResult.data;
  const memberships = (membershipsResult.data ?? []) as GroupMembershipRow[];

  if (!canActorReadGroup(actor, group, memberships)) {
    throw new Error("Group not found.");
  }

  const visibleUserIds = Array.from(new Set([group.owner_user_id, ...memberships.map((membership) => membership.student_user_id)]));
  const [profilesResult, emailByUserId] = await Promise.all([
    supabase.from("profiles").select("id, username, display_name").in("id", visibleUserIds),
    loadAuthUsersByIds(visibleUserIds),
  ]);

  if (profilesResult.error) {
    throw new Error("Failed to load groups.");
  }

  const profilesById = new Map(((profilesResult.data ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]));

  return buildGroupSummary({
    actor,
    group,
    memberships,
    profilesById,
    emailByUserId,
  });
}

function parseInviteRows(input: AddGroupMembersInput) {
  const validRows: Array<InviteGroupMemberRowInput & { key: string }> = [];
  const results: GroupInviteResult[] = [];
  const seenEmails = new Set<string>();

  for (const row of input.rows) {
    const email = getNormalizedEmail(row.email);

    if (seenEmails.has(email)) {
      results.push({ email, success: false, message: "Duplicate email in this request." });
      continue;
    }

    seenEmails.add(email);
    validRows.push({ email, token: row.token.trim(), key: email });
  }

  for (const line of input.bulk.split(/\r?\n/)) {
    const trimmedLine = line.trim();

    if (!trimmedLine) {
      continue;
    }

    const delimiterIndex = trimmedLine.indexOf("=");

    if (delimiterIndex === -1) {
      results.push({ email: trimmedLine, success: false, message: "Use EMAIL=TOKEN format." });
      continue;
    }

    const email = getNormalizedEmail(trimmedLine.slice(0, delimiterIndex));
    const token = trimmedLine.slice(delimiterIndex + 1).trim();

    if (!email || !token) {
      results.push({ email: email || trimmedLine, success: false, message: "Each line needs both an email and a token." });
      continue;
    }

    if (seenEmails.has(email)) {
      results.push({ email, success: false, message: "Duplicate email in this request." });
      continue;
    }

    seenEmails.add(email);
    validRows.push({ email, token, key: email });
  }

  return { validRows, results };
}

export const groupService = {
  async getDirectory(userId: string): Promise<GroupDirectory> {
    const supabase = createSupabaseAdminClient();
    const actor = await loadActorAccess(userId);
    const [groupsResult, membershipsResult, profilesResult, authUsers] = await Promise.all([
      supabase.from("groups").select("id, name, owner_user_id, created_at, updated_at, archived_at").order("created_at", { ascending: true }),
      supabase.from("group_memberships").select("group_id, student_user_id, created_at"),
      supabase.from("profiles").select("id, username, display_name"),
      listAllAuthUsers(),
    ]);

    if (groupsResult.error || membershipsResult.error || profilesResult.error) {
      throw new Error("Failed to load groups.");
    }

    const groups = (groupsResult.data ?? []) as GroupRow[];
    const memberships = (membershipsResult.data ?? []) as GroupMembershipRow[];
    const visibleGroups = actor.canManageAnyGroup
      ? groups
      : groups.filter(
          (group) =>
            group.owner_user_id === actor.userId ||
            memberships.some((membership) => membership.group_id === group.id && membership.student_user_id === actor.userId),
        );
    const visibleUserIds = new Set<string>();

    for (const group of visibleGroups) {
      visibleUserIds.add(group.owner_user_id);

      for (const membership of memberships) {
        if (membership.group_id === group.id) {
          visibleUserIds.add(membership.student_user_id);
        }
      }
    }

    const profilesById = new Map(
      ((profilesResult.data ?? []) as ProfileRow[])
        .filter((profile) => visibleUserIds.has(profile.id))
        .map((profile) => [profile.id, profile]),
    );
    const emailByUserId = new Map(authUsers.map((user) => [user.id, user.email]));

    return {
      groups: visibleGroups
        .map((group) =>
          buildGroupSummary({ actor, group, memberships, profilesById, emailByUserId }),
        )
        .sort((left, right) => left.name.localeCompare(right.name)),
      capabilities: {
        canCreateGroup: actor.canCreateGroup,
        canManageAnyGroup: actor.canManageAnyGroup || actor.canCreateGroup,
      },
    };
  },

  async createGroup(userId: string, input: CreateGroupInput) {
    const supabase = createSupabaseAdminClient();
    const actor = await loadActorAccess(userId);
    ensureCanCreateGroup(actor);
    const { data, error } = await supabase
      .from("groups")
      .insert({
        owner_user_id: userId,
        name: input.name.trim(),
      })
      .select("id")
      .single();

    if (error || !data) {
      throw new Error("Could not create the group.");
    }

    return data.id;
  },

  async updateGroup(userId: string, groupId: string, input: UpdateGroupInput) {
    const supabase = createSupabaseAdminClient();
    const actor = await loadActorAccess(userId);
    await loadGroup(groupId);
    ensureCanRenameGroup(actor);
    const { error } = await supabase.from("groups").update({ name: input.name.trim() }).eq("id", groupId);

    if (error) {
      throw new Error("Could not update the group.");
    }
  },

  async deleteGroup(userId: string, groupId: string) {
    const supabase = createSupabaseAdminClient();
    const actor = await loadActorAccess(userId);
    const group = await loadGroup(groupId);
    ensureCanDeleteGroup(actor, group);
    const { error } = await supabase.from("groups").delete().eq("id", groupId);

    if (error) {
      throw new Error("Could not remove the group.");
    }
  },

  async addMembers(userId: string, groupId: string, input: AddGroupMembersInput) {
    const supabase = createSupabaseAdminClient();
    const actor = await loadActorAccess(userId);
    await loadGroup(groupId);
    ensureCanManageStudents(actor);

    const { validRows, results } = parseInviteRows(input);

    if (validRows.length === 0) {
      return { results };
    }

    const authUsers = await listAllAuthUsers();
    const authUserByEmail = new Map(authUsers.filter((user) => user.email).map((user) => [getNormalizedEmail(user.email ?? ""), user]));
    const targetUserIds = Array.from(
      new Set(
        validRows
          .map((row) => authUserByEmail.get(row.email)?.id)
          .filter((value): value is string => Boolean(value)),
      ),
    );
    const [existingMembershipsResult, settingsResult, profilesResult, rolesResult] = await Promise.all([
      targetUserIds.length > 0
        ? supabase.from("group_memberships").select("group_id, student_user_id, created_at").eq("group_id", groupId).in("student_user_id", targetUserIds)
        : Promise.resolve({ data: [], error: null }),
      targetUserIds.length > 0
        ? supabase
            .from("user_settings")
            .select("user_id, group_access_token_hash, group_access_token_prefix, group_access_token_generated_at, group_access_token_rotated_at")
            .in("user_id", targetUserIds)
        : Promise.resolve({ data: [], error: null }),
      targetUserIds.length > 0
        ? supabase.from("profiles").select("id, username, display_name").in("id", targetUserIds)
        : Promise.resolve({ data: [], error: null }),
      targetUserIds.length > 0
        ? supabase
            .from("user_roles")
            .select(
              `
                user_id,
                roles (
                  code
                )
              `,
            )
            .in("user_id", targetUserIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (existingMembershipsResult.error || settingsResult.error || profilesResult.error || rolesResult.error) {
      throw new Error("Could not validate the invite list.");
    }

    const membershipSet = new Set(
      ((existingMembershipsResult.data ?? []) as GroupMembershipRow[]).map((membership) => membership.student_user_id),
    );
    const settingsByUserId = new Map(
      ((settingsResult.data ?? []) as UserSettingsTokenRow[]).map((row) => [row.user_id, row]),
    );
    const profileByUserId = new Map(((profilesResult.data ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]));
    const rolesByUserId = new Map<string, Set<string>>();

    for (const row of (rolesResult.data ?? []) as UserRoleRow[]) {
      const role = readRolesValue(row.roles);
      const current = rolesByUserId.get(row.user_id) ?? new Set<string>();

      if (role?.code) {
        current.add(role.code);
      }

      rolesByUserId.set(row.user_id, current);
    }

    const inserts: Array<{ group_id: string; student_user_id: string }> = [];

    for (const row of validRows) {
      const authUser = authUserByEmail.get(row.email);

      if (!authUser?.id) {
        results.push({ email: row.email, success: false, message: "No account exists for this email yet." });
        continue;
      }

      if (membershipSet.has(authUser.id)) {
        results.push({ email: row.email, success: false, message: "This person is already in the group.", userId: authUser.id });
        continue;
      }

      if (!rolesByUserId.get(authUser.id)?.has("student")) {
        results.push({ email: row.email, success: false, message: "Only student accounts can join groups.", userId: authUser.id });
        continue;
      }

      const userSettings = settingsByUserId.get(authUser.id);

      if (!userSettings?.group_access_token_hash) {
        results.push({ email: row.email, success: false, message: "This user has not generated a group access token yet.", userId: authUser.id });
        continue;
      }

      if (!isGroupAccessTokenFormat(row.token) || !verifyGroupAccessToken(row.token, userSettings.group_access_token_hash)) {
        results.push({ email: row.email, success: false, message: "The token does not match this email.", userId: authUser.id });
        continue;
      }

      membershipSet.add(authUser.id);
      inserts.push({ group_id: groupId, student_user_id: authUser.id });
      const profile = profileByUserId.get(authUser.id);
      const name = profile?.display_name ?? profile?.username ?? row.email;
      results.push({ email: row.email, success: true, message: `${name} added to the group.`, userId: authUser.id });
    }

    if (inserts.length > 0) {
      const { error } = await supabase.from("group_memberships").insert(inserts);

      if (error) {
        throw new Error("Could not add one or more group members.");
      }
    }

    return { results };
  },

  async removeMember(userId: string, groupId: string, memberUserId: string) {
    const supabase = createSupabaseAdminClient();
    const actor = await loadActorAccess(userId);
    await loadGroup(groupId);
    ensureCanManageStudents(actor);

    const { error } = await supabase
      .from("group_memberships")
      .delete()
      .eq("group_id", groupId)
      .eq("student_user_id", memberUserId);

    if (error) {
      throw new Error("Could not remove this member.");
    }
  },

  async getAccessTokenStatus(userId: string): Promise<GroupAccessTokenStatus> {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("user_settings")
      .select("user_id, group_access_token_hash, group_access_token_prefix, group_access_token_generated_at, group_access_token_rotated_at")
      .eq("user_id", userId)
      .maybeSingle<UserSettingsTokenRow>();

    if (error) {
      throw new Error("Could not load your group access token.");
    }

    return buildTokenStatus(data);
  },

  async regenerateAccessToken(userId: string): Promise<GroupAccessTokenResponse> {
    const supabase = createSupabaseAdminClient();
    const currentStatus = await this.getAccessTokenStatus(userId);
    const token = generateGroupAccessToken();
    const now = new Date().toISOString();
    const { error } = await supabase.from("user_settings").upsert({
      user_id: userId,
      group_access_token_hash: getGroupAccessTokenHash(token),
      group_access_token_prefix: getGroupAccessTokenPreview(token),
      group_access_token_generated_at: now,
      group_access_token_rotated_at: currentStatus.hasToken ? now : null,
    });

    if (error) {
      throw new Error("Could not generate a new group access token.");
    }

    return {
      hasToken: true,
      preview: getGroupAccessTokenPreview(token),
      generatedAt: now,
      rotatedAt: currentStatus.hasToken ? now : null,
      token,
    };
  },

  async getGroupDetail(userId: string, groupId: string): Promise<GroupDetail> {
    const supabase = createSupabaseAdminClient();
    const actor = await loadActorAccess(userId);
    const group = await loadGroupSummaryForActor(actor, groupId);

    if (!group.canViewStats) {
      return {
        group,
        stats: null,
      };
    }

    const { data, error } = await supabase.rpc("get_group_stats_overview", {
      target_group_id: groupId,
    });

    if (error || !data) {
      throw new Error("Failed to load group stats.");
    }

    return {
      group,
      stats: data as GroupStatsRpcResponse,
    };
  },
};
