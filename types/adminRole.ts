export type AdminRolePermission = {
  id: string;
  code: string;
  label: string;
  description: string;
};

export type AdminRoleMember = {
  userId: string;
  email: string | null;
  displayName: string | null;
  username: string | null;
};

export type AdminUserOption = {
  id: string;
  email: string | null;
  displayName: string | null;
  username: string | null;
  roleCodes: string[];
};

export type AdminRole = {
  id: string;
  code: string;
  label: string;
  isSystem: boolean;
  isEditable: boolean;
  permissions: AdminRolePermission[];
  permissionIds: string[];
  members: AdminRoleMember[];
  memberCount: number;
};

export type AdminRoleDirectory = {
  permissions: AdminRolePermission[];
  roles: AdminRole[];
  users: AdminUserOption[];
};
