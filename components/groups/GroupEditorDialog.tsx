"use client";

import { useEffect, useState } from "react";
import { AxiosError } from "axios";
import { Plus, RefreshCcw, Trash2, Users, UserRoundMinus } from "lucide-react";

import AdminActionDialog from "@/components/admin/AdminActionDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogActionButton,
  AlertDialogCancel,
  AlertDialogCancelButton,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import api from "@/lib/axios";
import { API_PATHS } from "@/lib/apiPaths";
import type { GroupInviteResult, GroupSummary } from "@/types/group";

import { GroupDetailCard, GroupMessageBanner, formatGroupDate } from "./groupUi";

type InviteRow = {
  id: string;
  email: string;
  token: string;
};

function createInviteRow(): InviteRow {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
    email: "",
    token: "",
  };
}

function getApiErrorMessage(error: unknown, fallback: string) {
  if (error instanceof AxiosError) {
    return error.response?.data?.error || fallback;
  }

  return fallback;
}

export default function GroupEditorDialog({
  open,
  group,
  onClose,
  onUpdated,
  onDeleted,
}: {
  open: boolean;
  group: GroupSummary;
  onClose: () => void;
  onUpdated: () => Promise<void>;
  onDeleted: () => Promise<void>;
}) {
  const [renameName, setRenameName] = useState(group.name);
  const [inviteRows, setInviteRows] = useState<InviteRow[]>([createInviteRow()]);
  const [bulkInvites, setBulkInvites] = useState("");
  const [editMessage, setEditMessage] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [inviteResults, setInviteResults] = useState<GroupInviteResult[]>([]);
  const [busyAction, setBusyAction] = useState<"rename" | "delete" | "invite" | "remove-member" | null>(null);

  useEffect(() => {
    setRenameName(group.name);
    setEditMessage("");
    setInviteMessage("");
    setInviteResults([]);
    setInviteRows([createInviteRow()]);
    setBulkInvites("");
  }, [group.id, group.name, open]);

  const handleRenameGroup = async () => {
    try {
      setBusyAction("rename");
      setEditMessage("");
      await api.patch(API_PATHS.getGroup(group.id), { name: renameName });
      await onUpdated();
      setEditMessage("Group updated successfully.");
    } catch (error) {
      setEditMessage(getApiErrorMessage(error, "Could not update the group."));
    } finally {
      setBusyAction(null);
    }
  };

  const handleDeleteGroup = async () => {
    try {
      setBusyAction("delete");
      await api.delete(API_PATHS.getGroup(group.id));
      await onDeleted();
    } catch (error) {
      setEditMessage(getApiErrorMessage(error, "Could not remove the group."));
      setBusyAction(null);
    }
  };

  const handleInviteRowsChange = (rowId: string, field: keyof Omit<InviteRow, "id">, value: string) => {
    setInviteRows((currentRows) => currentRows.map((row) => (row.id === rowId ? { ...row, [field]: value } : row)));
  };

  const handleRemoveInviteRow = (rowId: string) => {
    setInviteRows((currentRows) => (currentRows.length === 1 ? currentRows : currentRows.filter((row) => row.id !== rowId)));
  };

  const handleInviteMembers = async () => {
    try {
      setBusyAction("invite");
      setInviteMessage("");
      const response = await api.post<{ inviteResults: GroupInviteResult[] }>(API_PATHS.getGroupMembers(group.id), {
        rows: inviteRows
          .filter((row) => row.email.trim() || row.token.trim())
          .map((row) => ({ email: row.email, token: row.token })),
        bulk: bulkInvites,
      });

      await onUpdated();
      setInviteResults(response.data.inviteResults);
      setInviteMessage(response.data.inviteResults.some((result) => result.success) ? "Invite check finished." : "No new members were added.");
      setInviteRows([createInviteRow()]);
      setBulkInvites("");
    } catch (error) {
      setInviteMessage(getApiErrorMessage(error, "Could not process the invite list."));
    } finally {
      setBusyAction(null);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      setBusyAction("remove-member");
      setInviteMessage("");
      await api.delete(API_PATHS.getGroupMember(group.id, userId));
      await onUpdated();
      setInviteMessage("Member removed successfully.");
    } catch (error) {
      setInviteMessage(getApiErrorMessage(error, "Could not remove this member."));
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <>
      <AdminActionDialog
        open={open}
        onClose={onClose}
        title="Edit Group"
        description="Use the current group tools here: rename the group, manage membership, or remove it entirely."
        size="wide"
      >
        <div className="space-y-8">
          <section className="space-y-5">
            {editMessage ? <GroupMessageBanner tone="neutral">{editMessage}</GroupMessageBanner> : null}

            <div className="grid gap-4 md:grid-cols-2">
              <GroupDetailCard
                label="Owner"
                value={group.ownerDisplayName ?? group.ownerUsername ?? group.ownerEmail ?? group.ownerUserId.slice(0, 8)}
              />
              <GroupDetailCard label="Created" value={formatGroupDate(group.createdAt)} />
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-ink-fg/70">Group Name</label>
              <input
                type="text"
                value={renameName}
                onChange={(event) => setRenameName(event.target.value)}
                disabled={busyAction === "rename" || !group.canRename}
                className="workbook-input text-sm"
              />
            </div>

            {group.canRename || group.canDelete ? (
              <div className="flex flex-col gap-3 sm:flex-row">
                {group.canRename ? (
                  <button
                    type="button"
                    onClick={() => void handleRenameGroup()}
                    disabled={busyAction === "rename" || !renameName.trim()}
                    className="workbook-button workbook-press flex-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <RefreshCcw className="h-4 w-4" />
                    Save Group Name
                  </button>
                ) : null}

                {group.canDelete ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        type="button"
                        disabled={busyAction === "delete"}
                        className="inline-flex items-center justify-center rounded-2xl border-2 border-ink-fg bg-accent-3 px-5 py-3 text-sm font-bold text-white brutal-shadow-sm transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove Group
                      </button>
                    </AlertDialogTrigger>

                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove Group?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This removes {group.name} and clears its memberships. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel asChild>
                          <AlertDialogCancelButton>Cancel</AlertDialogCancelButton>
                        </AlertDialogCancel>
                        <AlertDialogAction asChild>
                          <AlertDialogActionButton onClick={() => void handleDeleteGroup()} disabled={busyAction === "delete"}>
                            Remove Group
                          </AlertDialogActionButton>
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : null}
              </div>
            ) : (
              <div className="rounded-2xl border-2 border-ink-fg bg-paper-bg px-4 py-3 text-sm text-ink-fg/70 brutal-shadow-sm">
                You can view this group, but editing is limited to people with group access.
              </div>
            )}
          </section>

          <section className="space-y-5">
            <div>
              <h3 className="font-display text-2xl font-black uppercase tracking-tight text-ink-fg">Invite Members</h3>
              <p className="mt-1 text-sm text-ink-fg/70">Add people by email and their current user token, or paste bulk lines below.</p>
            </div>

            {inviteMessage ? <GroupMessageBanner tone="neutral">{inviteMessage}</GroupMessageBanner> : null}

            <div className="space-y-3 rounded-2xl border-2 border-ink-fg bg-paper-bg p-4 brutal-shadow-sm">
              <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                <div className="text-xs font-bold uppercase tracking-[0.16em] text-ink-fg/70">Email</div>
                <div className="text-xs font-bold uppercase tracking-[0.16em] text-ink-fg/70">Token</div>
                <div className="hidden md:block" />
              </div>

              <div className="space-y-3">
                {inviteRows.map((row) => (
                  <div key={row.id} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                    <input
                      type="email"
                      value={row.email}
                      onChange={(event) => handleInviteRowsChange(row.id, "email", event.target.value)}
                      placeholder="student@example.com"
                      className="workbook-input text-sm"
                      disabled={busyAction === "invite" || !group.canManageStudents}
                    />
                    <input
                      type="text"
                      value={row.token}
                      onChange={(event) => handleInviteRowsChange(row.id, "token", event.target.value)}
                      placeholder="ronan_..."
                      className="workbook-input text-sm"
                      disabled={busyAction === "invite" || !group.canManageStudents}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveInviteRow(row.id)}
                      disabled={inviteRows.length === 1 || busyAction === "invite" || !group.canManageStudents}
                      className="inline-flex items-center justify-center rounded-2xl border-2 border-ink-fg bg-surface-white px-4 py-3 text-sm font-bold text-ink-fg brutal-shadow-sm transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setInviteRows((currentRows) => [...currentRows, createInviteRow()])}
                disabled={busyAction === "invite" || !group.canManageStudents}
                className="inline-flex items-center justify-center rounded-2xl border-2 border-ink-fg bg-surface-white px-4 py-3 text-sm font-bold text-ink-fg brutal-shadow-sm transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                Add Row
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-[0.16em] text-ink-fg/70">Bulk Invite</label>
              <textarea
                value={bulkInvites}
                onChange={(event) => setBulkInvites(event.target.value)}
                placeholder={"student@example.com=ronan_...\nstudent-two@example.com=ronan_..."}
                rows={6}
                className="workbook-input min-h-[10rem] text-sm"
                disabled={busyAction === "invite" || !group.canManageStudents}
              />
            </div>

            <button
              type="button"
              onClick={() => void handleInviteMembers()}
              disabled={busyAction === "invite" || !group.canManageStudents}
              className="workbook-button workbook-press w-full text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Users className="h-4 w-4" />
              Verify And Add Members
            </button>

            {inviteResults.length > 0 ? (
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-[0.16em] text-ink-fg/70">Invite Results</div>
                {inviteResults.map((result) => (
                  <GroupMessageBanner key={`${result.email}-${result.message}`} tone={result.success ? "success" : "error"}>
                    <span className="font-black">{result.email}</span>
                    {": "}
                    {result.message}
                  </GroupMessageBanner>
                ))}
              </div>
            ) : null}
          </section>

          <section className="space-y-5">
            <div>
              <h3 className="font-display text-2xl font-black uppercase tracking-tight text-ink-fg">Membership</h3>
              <p className="mt-1 text-sm text-ink-fg/70">Confirmed members can be removed later.</p>
            </div>

            {group.members.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-ink-fg bg-paper-bg px-4 py-8 text-center text-sm text-ink-fg/70">
                This group does not have any confirmed members yet.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.members.map((member) => (
                    <TableRow key={member.userId}>
                      <TableCell>
                        <div className="font-bold text-ink-fg">{member.displayName ?? member.username ?? member.email ?? member.userId.slice(0, 8)}</div>
                        <div className="text-xs uppercase tracking-[0.16em] text-ink-fg/55">{member.username ?? member.userId.slice(0, 8)}</div>
                      </TableCell>
                      <TableCell>{member.email ?? "-"}</TableCell>
                      <TableCell>{formatGroupDate(member.joinedAt)}</TableCell>
                      <TableCell className="text-right">
                        <button
                          type="button"
                          onClick={() => void handleRemoveMember(member.userId)}
                          disabled={busyAction === "remove-member" || !group.canManageStudents}
                          className="inline-flex items-center justify-center rounded-2xl border-2 border-ink-fg bg-surface-white px-4 py-2 text-sm font-bold text-ink-fg brutal-shadow-sm transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <UserRoundMinus className="mr-2 h-4 w-4" />
                          Remove
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </section>
        </div>
      </AdminActionDialog>
    </>
  );
}
