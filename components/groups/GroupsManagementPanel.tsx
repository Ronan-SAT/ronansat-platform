"use client";

import { useState } from "react";
import { AxiosError } from "axios";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";

import AdminActionDialog from "@/components/admin/AdminActionDialog";
import InitialTabBootReady from "@/components/InitialTabBootReady";
import { API_PATHS } from "@/lib/apiPaths";
import api from "@/lib/axios";
import type { GroupDirectory } from "@/types/group";

import { GroupMessageBanner } from "./groupUi";

function getApiErrorMessage(error: unknown, fallback: string) {
  if (error instanceof AxiosError) {
    return error.response?.data?.error || fallback;
  }

  return fallback;
}

export default function GroupsManagementPanel({ initialDirectory }: { initialDirectory: GroupDirectory }) {
  const router = useRouter();
  const [directory, setDirectory] = useState(initialDirectory);
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const handleCreateGroup = async () => {
    if (!createName.trim()) {
      setMessage("Enter a group name first.");
      return;
    }

    try {
      setBusy(true);
      setMessage("");
      const currentGroupIds = new Set(directory.groups.map((group) => group.id));
      const response = await api.post<GroupDirectory>(API_PATHS.GROUPS, { name: createName });
      const nextDirectory = response.data;
      const createdGroup = nextDirectory.groups.find((group) => !currentGroupIds.has(group.id)) ?? null;

      setDirectory(nextDirectory);
      setCreateName("");
      setCreateOpen(false);

      if (createdGroup) {
        router.push(`/groups/${createdGroup.id}`);
        return;
      }

      setMessage("Group created successfully.");
    } catch (error) {
      setMessage(getApiErrorMessage(error, "Could not create the group."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper-bg p-8 pb-24">
      <InitialTabBootReady />

      <div className="mx-auto max-w-5xl space-y-8">
        <section className="workbook-panel-muted overflow-hidden">
          <div className="border-b-4 border-ink-fg bg-paper-bg px-6 py-5">
            <div className="workbook-sticker bg-accent-2 text-white">Groups</div>
            <h1 className="mt-4 font-display text-4xl font-black uppercase tracking-tight text-ink-fg">Group Settings</h1>
            <p className="mt-3 max-w-3xl text-sm text-ink-fg/70">
              Keep this page simple: pick a group to open it, or create a new one from the bar above.
            </p>
          </div>
        </section>

        {message ? <GroupMessageBanner tone="neutral">{message}</GroupMessageBanner> : null}

        <section className="workbook-panel overflow-hidden">
          <div className="flex flex-col gap-4 border-b-4 border-ink-fg bg-paper-bg px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-2xl font-black uppercase tracking-tight text-ink-fg">All Groups</h2>
              <p className="mt-1 text-sm text-ink-fg/70">Open a group to edit membership or review its member stats.</p>
            </div>

            {directory.capabilities.canCreateGroup ? (
              <button
                type="button"
                onClick={() => {
                  setMessage("");
                  setCreateOpen(true);
                }}
                className="workbook-button workbook-press text-sm"
              >
                <Plus className="h-4 w-4" />
                Create Group
              </button>
            ) : null}
          </div>

          {directory.groups.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-ink-fg/70">No groups yet.</div>
          ) : (
            <div className="divide-y-2 divide-ink-fg">
              {directory.groups.map((group) => {
                const owner = group.ownerDisplayName ?? group.ownerUsername ?? group.ownerEmail ?? group.ownerUserId.slice(0, 8);

                return (
                  <Link
                    key={group.id}
                    href={`/groups/${group.id}`}
                    className="flex w-full items-center justify-between gap-4 bg-surface-white px-6 py-5 text-left transition-colors hover:bg-paper-bg active:translate-x-0.5 active:translate-y-0.5"
                  >
                    <div className="min-w-0">
                      <div className="text-lg font-black text-ink-fg">{group.name}</div>
                      <p className="mt-1 max-w-2xl truncate text-sm text-ink-fg/70">
                        Owner: {owner} • {group.memberCount} members
                      </p>
                    </div>

                    <div className="text-xs font-bold uppercase tracking-[0.16em] text-ink-fg/55">Open</div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <AdminActionDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create Group"
        description="Create a group first, then open it on its own page to manage names, membership, and stats."
      >
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-ink-fg/70">Group Name</label>
            <input
              type="text"
              value={createName}
              onChange={(event) => setCreateName(event.target.value)}
              placeholder="e.g. Saturday Math Cohort"
              className="workbook-input text-sm"
              disabled={busy}
            />
          </div>

          {message ? <GroupMessageBanner tone="neutral">{message}</GroupMessageBanner> : null}

          <button
            type="button"
            onClick={() => void handleCreateGroup()}
            disabled={busy || !createName.trim()}
            className="workbook-button workbook-press w-full text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Create Group
          </button>
        </div>
      </AdminActionDialog>
    </div>
  );
}
