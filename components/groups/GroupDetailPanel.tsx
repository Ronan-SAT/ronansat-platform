"use client";

import { useState } from "react";
import { AxiosError } from "axios";
import { PencilLine } from "lucide-react";
import { useRouter } from "next/navigation";

import InitialTabBootReady from "@/components/InitialTabBootReady";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import api from "@/lib/axios";
import { API_PATHS } from "@/lib/apiPaths";
import type { GroupDetail } from "@/types/group";

import GroupEditorDialog from "./GroupEditorDialog";
import { GroupDetailCard, GroupMessageBanner, GroupsBackLink, formatGroupDate, formatGroupScore } from "./groupUi";

function getApiErrorMessage(error: unknown, fallback: string) {
  if (error instanceof AxiosError) {
    return error.response?.data?.error || fallback;
  }

  return fallback;
}

function GroupStatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border-2 border-ink-fg bg-surface-white p-4 brutal-shadow-sm">
      <div className="text-xs font-bold uppercase tracking-[0.16em] text-ink-fg/70">{label}</div>
      <div className="mt-2 text-2xl font-black text-ink-fg">{value}</div>
    </div>
  );
}

export default function GroupDetailPanel({ initialDetail }: { initialDetail: GroupDetail }) {
  const router = useRouter();
  const [detail, setDetail] = useState(initialDetail);
  const [message, setMessage] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [reloading, setReloading] = useState(false);

  const refreshDetail = async () => {
    try {
      setReloading(true);
      const response = await api.get<GroupDetail>(API_PATHS.getGroup(detail.group.id));
      setDetail(response.data);
    } catch (error) {
      setMessage(getApiErrorMessage(error, "Could not refresh the group."));
    } finally {
      setReloading(false);
    }
  };

  const stats = detail.stats;

  return (
    <div className="min-h-screen bg-paper-bg p-8 pb-24">
      <InitialTabBootReady />

      <div className="mx-auto max-w-6xl space-y-8">
        <section className="workbook-panel-muted overflow-hidden">
          <div className="flex flex-col gap-4 border-b-4 border-ink-fg bg-paper-bg px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="workbook-sticker bg-accent-2 text-white">Group</div>
              <h1 className="mt-4 font-display text-4xl font-black uppercase tracking-tight text-ink-fg">{detail.group.name}</h1>
              <p className="mt-3 max-w-3xl text-sm text-ink-fg/70">
                Open the bar above when you need to edit names, membership, or remove the group. Member stats stay below.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:items-end">
              <GroupsBackLink />
              <button type="button" onClick={() => setEditorOpen(true)} className="workbook-button workbook-press text-sm">
                <PencilLine className="h-4 w-4" />
                Edit Group
              </button>
            </div>
          </div>
        </section>

        {message ? <GroupMessageBanner tone="neutral">{message}</GroupMessageBanner> : null}

        <section className="grid gap-4 md:grid-cols-3">
          <GroupDetailCard
            label="Owner"
            value={detail.group.ownerDisplayName ?? detail.group.ownerUsername ?? detail.group.ownerEmail ?? detail.group.ownerUserId.slice(0, 8)}
          />
          <GroupDetailCard label="Created" value={formatGroupDate(detail.group.createdAt)} />
          <GroupDetailCard label="Members" value={detail.group.memberCount.toLocaleString("en-US")} />
        </section>

        {!detail.group.canViewStats ? (
          <section className="workbook-panel overflow-hidden">
            <div className="border-b-4 border-ink-fg bg-paper-bg px-6 py-5">
              <h2 className="font-display text-2xl font-black uppercase tracking-tight text-ink-fg">Member Stats</h2>
            </div>
            <div className="px-6 py-8 text-sm text-ink-fg/70">
              You can open this group, but viewing member stats requires the `group_stat_view` permission.
            </div>
          </section>
        ) : (
          <>
            <section className="workbook-panel overflow-hidden">
              <div className="border-b-4 border-ink-fg bg-paper-bg px-6 py-5">
                <h2 className="font-display text-2xl font-black uppercase tracking-tight text-ink-fg">Member Stats</h2>
                <p className="mt-1 text-sm text-ink-fg/70">SQL-backed rollups keep the page light while still showing useful attempt history.</p>
              </div>

              <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-6">
                <GroupStatCard label="Members" value={stats ? stats.overview.memberCount.toLocaleString("en-US") : "0"} />
                <GroupStatCard label="Active Members" value={stats ? stats.overview.activeMembers.toLocaleString("en-US") : "0"} />
                <GroupStatCard label="Tests Taken" value={stats ? stats.overview.totalAttempts.toLocaleString("en-US") : "0"} />
                <GroupStatCard label="Full Tests" value={stats ? stats.overview.fullAttempts.toLocaleString("en-US") : "0"} />
                <GroupStatCard label="Sectionals" value={stats ? stats.overview.sectionalAttempts.toLocaleString("en-US") : "0"} />
                <GroupStatCard label="Average Score" value={stats ? formatGroupScore(stats.overview.averageScore) : "-"} />
              </div>

              <div className="grid gap-4 px-5 pb-5 md:grid-cols-2">
                <GroupDetailCard label="Highest Score" value={stats ? formatGroupScore(stats.overview.highestScore) : "-"} />
                <GroupDetailCard label="Last Activity" value={stats ? formatGroupDate(stats.overview.lastTakenAt, true) : "-"} />
              </div>
            </section>

            <section className="workbook-panel overflow-hidden">
              <div className="border-b-4 border-ink-fg bg-paper-bg px-6 py-5">
                <h2 className="font-display text-2xl font-black uppercase tracking-tight text-ink-fg">Members</h2>
                <p className="mt-1 text-sm text-ink-fg/70">Latest activity, score history, and total testing volume for each member.</p>
              </div>

              {stats && stats.members.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Tests</TableHead>
                      <TableHead>Last Taken</TableHead>
                      <TableHead>Latest</TableHead>
                      <TableHead>Best</TableHead>
                      <TableHead>Average</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.members.map((memberStat) => {
                      const member = detail.group.members.find((candidate) => candidate.userId === memberStat.userId) ?? null;
                      const label = member?.displayName ?? member?.username ?? member?.email ?? memberStat.userId.slice(0, 8);
                      const support = member?.email ?? member?.username ?? memberStat.userId.slice(0, 8);

                      return (
                        <TableRow key={memberStat.userId}>
                          <TableCell>
                            <div className="font-bold text-ink-fg">{label}</div>
                            <div className="text-xs uppercase tracking-[0.16em] text-ink-fg/55">{support}</div>
                          </TableCell>
                          <TableCell>{formatGroupDate(memberStat.joinedAt)}</TableCell>
                          <TableCell>
                            <div className="font-bold text-ink-fg">{memberStat.testsTaken}</div>
                            <div className="text-xs uppercase tracking-[0.16em] text-ink-fg/55">
                              {memberStat.fullTestsTaken} full • {memberStat.sectionalTestsTaken} sectional
                            </div>
                          </TableCell>
                          <TableCell>{formatGroupDate(memberStat.lastTakenAt, true)}</TableCell>
                          <TableCell>
                            <div className="font-bold text-ink-fg">{formatGroupScore(memberStat.latestScore)}</div>
                            <div className="text-xs uppercase tracking-[0.16em] text-ink-fg/55">
                              {memberStat.latestTestTitle ?? "No attempt"}
                              {memberStat.latestMode ? ` • ${memberStat.latestMode}` : ""}
                            </div>
                          </TableCell>
                          <TableCell>{formatGroupScore(memberStat.bestScore)}</TableCell>
                          <TableCell>{formatGroupScore(memberStat.averageScore)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="px-6 py-8 text-sm text-ink-fg/70">No members yet.</div>
              )}
            </section>
          </>
        )}
      </div>

      <GroupEditorDialog
        open={editorOpen}
        group={detail.group}
        onClose={() => setEditorOpen(false)}
        onUpdated={async () => {
          await refreshDetail();
        }}
        onDeleted={async () => {
          router.push("/groups");
        }}
      />

      {reloading ? <div className="sr-only">Refreshing group details</div> : null}
    </div>
  );
}
