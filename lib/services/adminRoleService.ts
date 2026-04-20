import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  AddAdminRoleMemberInput,
  CreateAdminRoleInput,
  UpdateAdminRolePermissionsInput,
} from "@/lib/schema/adminRole";
import type { AdminRole, AdminRoleDirectory, AdminRoleMember, AdminRolePermission, AdminUserOption } from "@/types/adminRole";

type RoleRow = {
  id: string;
  code: string;
  label: string;
  is_system: boolean;
};

type PermissionRow = {
  id: string;
  code: string;
  label: string;
  description: string;
};

type RolePermissionRow = {
  role_id: string;
  permission_id: string;
};

type UserRoleRow = {
  user_id: string;
  role_id: string;
};

type ProfileRow = {
  id: string;
  username: string | null;
  display_name: string | null;
};

const IMMUTABLE_ROLE_CODES = new Set(["admin"]);
const PROTECTED_ROLE_CODES = new Set(["admin", "student", "teacher"]);

function sortByLabel<T extends { label: string }>(items: T[]) {
  return [...items].sort((left, right) => left.label.localeCompare(right.label));
}

function slugifyRoleLabel(label: string) {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

async function ensureRoleExists(roleId: string) {
  const supabase = createSupabaseAdminClient();
  const { data: role, error } = await supabase
    .from("roles")
    .select("id, code, label, is_system")
    .eq("id", roleId)
    .maybeSingle<RoleRow>();

  if (error || !role) {
    throw new Error("Role not found");
  }

  return role;
}

async function ensurePermissionIds(permissionIds: string[]) {
  const uniquePermissionIds = Array.from(new Set(permissionIds));

  if (uniquePermissionIds.length === 0) {
    return [];
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("permissions")
    .select("id")
    .in("id", uniquePermissionIds);

  if (error) {
    throw new Error("Failed to validate permissions");
  }

  if ((data ?? []).length !== uniquePermissionIds.length) {
    throw new Error("One or more permissions are invalid");
  }

  return uniquePermissionIds;
}

async function resolveUserIdByIdentifier(userIdentifier: string) {
  const supabase = createSupabaseAdminClient();
  const normalizedIdentifier = userIdentifier.trim().toLowerCase();
  const [{ data: profiles, error: profileError }, authUsersResult] = await Promise.all([
    supabase.from("profiles").select("id, username"),
    supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  if (profileError || authUsersResult.error) {
    throw new Error("Failed to find user");
  }

  const matchedProfile = (profiles ?? []).find((profile) => {
    if (profile.id.toLowerCase() === normalizedIdentifier) {
      return true;
    }

    return profile.username?.trim().toLowerCase() === normalizedIdentifier;
  });

  if (matchedProfile) {
    return matchedProfile.id;
  }

  const matchedAuthUser = (authUsersResult.data?.users ?? []).find(
    (user) => user.email?.trim().toLowerCase() === normalizedIdentifier || user.id.toLowerCase() === normalizedIdentifier,
  );

  if (matchedAuthUser) {
    return matchedAuthUser.id;
  }

  throw new Error("User not found");
}

async function ensureUserExists(userId: string) {
  const supabase = createSupabaseAdminClient();
  const { data: profile, error } = await supabase.from("profiles").select("id").eq("id", userId).maybeSingle();

  if (error || !profile) {
    throw new Error("User not found");
  }
}

function buildRoleDirectory(params: {
  roles: RoleRow[];
  permissions: PermissionRow[];
  rolePermissions: RolePermissionRow[];
  userRoles: UserRoleRow[];
  profiles: ProfileRow[];
  emailByUserId: Map<string, string | null>;
}): AdminRoleDirectory {
  const { roles, permissions, rolePermissions, userRoles, profiles, emailByUserId } = params;

  const permissionById = new Map<string, AdminRolePermission>(
    permissions.map((permission) => [
      permission.id,
      { id: permission.id, code: permission.code, label: permission.label, description: permission.description },
    ]),
  );
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const roleCodesByUserId = new Map<string, string[]>();

  for (const userRole of userRoles) {
    const role = roles.find((candidate) => candidate.id === userRole.role_id);

    if (!role) {
      continue;
    }

    const existingCodes = roleCodesByUserId.get(userRole.user_id) ?? [];
    existingCodes.push(role.code);
    roleCodesByUserId.set(userRole.user_id, existingCodes);
  }

  const users: AdminUserOption[] = profiles
    .map((profile) => ({
      id: profile.id,
      email: emailByUserId.get(profile.id) ?? null,
      displayName: profile.display_name,
      username: profile.username,
      roleCodes: Array.from(new Set(roleCodesByUserId.get(profile.id) ?? [])).sort(),
    }))
    .sort((left, right) => {
      const leftLabel = left.displayName ?? left.username ?? left.email ?? left.id;
      const rightLabel = right.displayName ?? right.username ?? right.email ?? right.id;
      return leftLabel.localeCompare(rightLabel);
    });

  const rolesDirectory: AdminRole[] = roles.map((role) => {
    const permissionIds = rolePermissions
      .filter((rolePermission) => rolePermission.role_id === role.id)
      .map((rolePermission) => rolePermission.permission_id);

    const roleMembers: AdminRoleMember[] = userRoles
      .filter((userRole) => userRole.role_id === role.id)
      .map((userRole) => {
        const profile = profileById.get(userRole.user_id);
        return {
          userId: userRole.user_id,
          email: emailByUserId.get(userRole.user_id) ?? null,
          displayName: profile?.display_name ?? null,
          username: profile?.username ?? null,
        };
      })
      .sort((left, right) => {
        const leftLabel = left.displayName ?? left.username ?? left.email ?? left.userId;
        const rightLabel = right.displayName ?? right.username ?? right.email ?? right.userId;
        return leftLabel.localeCompare(rightLabel);
      });

    const rolePermissionList = sortByLabel(
      permissionIds
        .map((permissionId) => permissionById.get(permissionId))
        .filter((permission): permission is AdminRolePermission => Boolean(permission)),
    );

    return {
      id: role.id,
      code: role.code,
      label: role.label,
      isSystem: role.is_system,
      isEditable: !IMMUTABLE_ROLE_CODES.has(role.code),
      permissions: rolePermissionList,
      permissionIds: rolePermissionList.map((permission) => permission.id),
      members: roleMembers,
      memberCount: roleMembers.length,
    };
  });

  rolesDirectory.sort((left, right) => {
    if (left.isSystem !== right.isSystem) {
      return left.isSystem ? -1 : 1;
    }

    if (left.code === "admin") {
      return -1;
    }

    if (right.code === "admin") {
      return 1;
    }

    return left.label.localeCompare(right.label);
  });

  return {
    permissions: sortByLabel(
      permissions.map((permission) => ({
        id: permission.id,
        code: permission.code,
        label: permission.label,
        description: permission.description,
      })),
    ),
    roles: rolesDirectory,
    users,
  };
}

export const adminRoleService = {
  async getDirectory(): Promise<AdminRoleDirectory> {
    const supabase = createSupabaseAdminClient();
    const [rolesResult, permissionsResult, rolePermissionsResult, userRolesResult, profilesResult, authUsersResult] = await Promise.all([
      supabase.from("roles").select("id, code, label, is_system").order("created_at", { ascending: true }),
      supabase.from("permissions").select("id, code, label, description").order("label", { ascending: true }),
      supabase.from("role_permissions").select("role_id, permission_id"),
      supabase.from("user_roles").select("user_id, role_id"),
      supabase.from("profiles").select("id, username, display_name").order("display_name", { ascending: true }),
      supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);

    if (rolesResult.error || permissionsResult.error || rolePermissionsResult.error || userRolesResult.error || profilesResult.error || authUsersResult.error) {
      throw new Error("Failed to load admin roles");
    }

    const emailByUserId = new Map<string, string | null>(
      (authUsersResult.data?.users ?? []).map((user) => [user.id, user.email ?? null]),
    );

    return buildRoleDirectory({
      roles: (rolesResult.data ?? []) as RoleRow[],
      permissions: (permissionsResult.data ?? []) as PermissionRow[],
      rolePermissions: (rolePermissionsResult.data ?? []) as RolePermissionRow[],
      userRoles: (userRolesResult.data ?? []) as UserRoleRow[],
      profiles: (profilesResult.data ?? []) as ProfileRow[],
      emailByUserId,
    });
  },

  async createRole(input: CreateAdminRoleInput) {
    const supabase = createSupabaseAdminClient();
    const permissionIds = await ensurePermissionIds(input.permissionIds);
    const { data: existingRoles, error: existingRolesError } = await supabase.from("roles").select("code");

    if (existingRolesError) {
      throw new Error("Failed to load existing roles");
    }

    const existingCodes = new Set((existingRoles ?? []).map((role) => String(role.code)));
    const baseCode = slugifyRoleLabel(input.label) || "role";
    let code = baseCode;
    let suffix = 2;

    while (existingCodes.has(code)) {
      code = `${baseCode}-${suffix}`;
      suffix += 1;
    }

    const { data: role, error: roleError } = await supabase
      .from("roles")
      .insert({
        code,
        label: input.label.trim(),
        is_system: false,
      })
      .select("id")
      .single();

    if (roleError || !role) {
      throw new Error("Failed to create role");
    }

    if (permissionIds.length > 0) {
      const { error: rolePermissionsError } = await supabase.from("role_permissions").insert(
        permissionIds.map((permissionId) => ({
          role_id: role.id,
          permission_id: permissionId,
        })),
      );

      if (rolePermissionsError) {
        throw new Error("Failed to attach role permissions");
      }
    }
  },

  async updateRolePermissions(roleId: string, input: UpdateAdminRolePermissionsInput) {
    const supabase = createSupabaseAdminClient();
    const role = await ensureRoleExists(roleId);

    if (IMMUTABLE_ROLE_CODES.has(role.code)) {
      throw new Error("The admin role cannot be edited");
    }

    const permissionIds = await ensurePermissionIds(input.permissionIds);
    const { error: deleteError } = await supabase.from("role_permissions").delete().eq("role_id", roleId);

    if (deleteError) {
      throw new Error("Failed to update role permissions");
    }

    if (permissionIds.length === 0) {
      return;
    }

    const { error: insertError } = await supabase.from("role_permissions").insert(
      permissionIds.map((permissionId) => ({
        role_id: roleId,
        permission_id: permissionId,
      })),
    );

    if (insertError) {
      throw new Error("Failed to update role permissions");
    }
  },

  async deleteRole(roleId: string) {
    const supabase = createSupabaseAdminClient();
    const role = await ensureRoleExists(roleId);

    if (role.is_system || PROTECTED_ROLE_CODES.has(role.code)) {
      throw new Error("Default roles cannot be removed");
    }

    const { error } = await supabase.from("roles").delete().eq("id", roleId);

    if (error) {
      throw new Error("Failed to remove role");
    }
  },

  async addMember(roleId: string, input: AddAdminRoleMemberInput) {
    const supabase = createSupabaseAdminClient();
    const role = await ensureRoleExists(roleId);

    if (IMMUTABLE_ROLE_CODES.has(role.code)) {
      throw new Error("The admin role cannot be edited");
    }

    const userId = await resolveUserIdByIdentifier(input.userIdentifier);
    await ensureUserExists(userId);

    const { error } = await supabase.from("user_roles").upsert(
      {
        user_id: userId,
        role_id: roleId,
      },
      {
        onConflict: "user_id,role_id",
        ignoreDuplicates: true,
      },
    );

    if (error) {
      throw new Error("Failed to add user to role");
    }
  },
};
