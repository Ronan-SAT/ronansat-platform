import { z } from "zod";

export const groupNameSchema = z.string().trim().min(2).max(80);

export const createGroupSchema = z.object({
  name: groupNameSchema,
});

export const updateGroupSchema = z.object({
  name: groupNameSchema,
});

export const inviteGroupMemberRowSchema = z.object({
  email: z.string().trim().email().max(320),
  token: z.string().trim().min(1).max(128),
});

export const addGroupMembersSchema = z.object({
  rows: z.array(inviteGroupMemberRowSchema).max(200).default([]),
  bulk: z.string().max(20000).optional().default(""),
});

export const regenerateGroupAccessTokenSchema = z.object({
  regenerate: z.boolean().optional().default(true),
});

export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;
export type InviteGroupMemberRowInput = z.infer<typeof inviteGroupMemberRowSchema>;
export type AddGroupMembersInput = z.infer<typeof addGroupMembersSchema>;
