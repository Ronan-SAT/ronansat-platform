import { z } from "zod";

export const createAdminRoleSchema = z.object({
  label: z.string().trim().min(2).max(60),
  permissionIds: z.array(z.string().uuid()).max(100).default([]),
});

export const updateAdminRolePermissionsSchema = z.object({
  permissionIds: z.array(z.string().uuid()).max(100),
});

export const addAdminRoleMemberSchema = z.object({
  userIdentifier: z.string().trim().min(1).max(320),
});

export type CreateAdminRoleInput = z.infer<typeof createAdminRoleSchema>;
export type UpdateAdminRolePermissionsInput = z.infer<typeof updateAdminRolePermissionsSchema>;
export type AddAdminRoleMemberInput = z.infer<typeof addAdminRoleMemberSchema>;
