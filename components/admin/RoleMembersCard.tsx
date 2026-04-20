"use client";

import type { AdminRole } from "@/types/adminRole";

type RoleMembersCardProps = {
  role: AdminRole | null;
  userIdentifier: string;
  disabled: boolean;
  message: string;
  onUserIdentifierChange: (value: string) => void;
  onSubmit: () => void;
};

const panelHeaderClassName =
  "flex items-center gap-3 border-b-4 border-ink-fg bg-paper-bg px-5 py-4 text-ink-fg";

export default function RoleMembersCard({
  role,
  userIdentifier,
  disabled,
  message,
  onUserIdentifierChange,
  onSubmit,
}: RoleMembersCardProps) {
  return (
    <section className="workbook-panel overflow-hidden">
      <div className={panelHeaderClassName}>
        <div>
          <h2 className="font-display text-2xl font-black uppercase tracking-tight">People In Role</h2>
          <p className="text-sm text-ink-fg/70">Add people to the selected role.</p>
        </div>
      </div>

      <div className="space-y-5 p-5">
        {message ? (
          <div className="rounded-2xl border-2 border-ink-fg bg-paper-bg px-4 py-3 text-sm font-bold text-ink-fg brutal-shadow-sm">
            {message}
          </div>
        ) : null}

        {!role ? (
          <div className="rounded-2xl border-2 border-dashed border-ink-fg bg-paper-bg px-4 py-8 text-center text-sm text-ink-fg/70">
            Pick a role to manage its members.
          </div>
        ) : (
          <>
            <div className="rounded-2xl border-2 border-ink-fg bg-paper-bg p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-black text-ink-fg">{role.label}</div>
                  <div className="text-xs uppercase tracking-[0.16em] text-ink-fg/55">{role.memberCount} members</div>
                </div>
                <div className="text-xs uppercase tracking-[0.16em] text-ink-fg/55">{role.isSystem ? "Default role" : "Custom role"}</div>
              </div>
            </div>

            {role.isEditable ? (
              <div className="space-y-3 rounded-2xl border-2 border-ink-fg bg-paper-bg p-4">
                <div className="text-xs font-bold uppercase tracking-[0.16em] text-ink-fg/70">Add Person</div>
                <input
                  type="text"
                  value={userIdentifier}
                  onChange={(event) => onUserIdentifierChange(event.target.value)}
                  placeholder="Enter username, email, or user id"
                  className="workbook-input text-sm"
                  disabled={disabled}
                />

                <button
                  type="button"
                  onClick={onSubmit}
                  disabled={disabled || !userIdentifier.trim()}
                  className="workbook-button workbook-press w-full text-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Add To Role
                </button>
              </div>
            ) : (
              <div className="rounded-2xl border-2 border-ink-fg bg-paper-bg px-4 py-3 text-sm text-ink-fg/70 brutal-shadow-sm">
                The admin role is locked, so membership changes are disabled here.
              </div>
            )}

            <div className="max-h-[34vh] overflow-y-auto rounded-2xl border-2 border-ink-fg bg-surface-white">
              {role.members.length > 0 ? (
                <div className="divide-y-2 divide-ink-fg">
                  {role.members.map((member) => {
                    const primaryLabel = member.displayName ?? member.username ?? member.email ?? member.userId;
                    const secondaryLabel = member.email && member.email !== primaryLabel ? member.email : member.username;

                    return (
                      <div key={member.userId} className="flex items-center justify-between gap-3 px-4 py-3">
                        <div>
                          <div className="text-sm font-bold text-ink-fg">{primaryLabel}</div>
                          {secondaryLabel ? <div className="text-xs text-ink-fg/60">{secondaryLabel}</div> : null}
                        </div>
                        <div className="text-xs uppercase tracking-[0.16em] text-ink-fg/55">{member.userId.slice(0, 8)}</div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border-2 border-dashed border-ink-fg bg-paper-bg px-4 py-8 text-center text-sm text-ink-fg/70">
                  Nobody is assigned to this role yet.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
