"use client";

import type { AdminRolePermission } from "@/types/adminRole";

type RoleCreationCardProps = {
  label: string;
  selectedPermissionIds: string[];
  permissions: AdminRolePermission[];
  disabled: boolean;
  message: string;
  embedded?: boolean;
  onLabelChange: (value: string) => void;
  onPermissionToggle: (permissionId: string) => void;
  onSubmit: () => void;
};

const panelHeaderClassName =
  "flex items-center gap-3 border-b-4 border-ink-fg bg-paper-bg px-5 py-4 text-ink-fg";

const fieldLabelClassName = "mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-ink-fg/70";

export default function RoleCreationCard({
  label,
  selectedPermissionIds,
  permissions,
  disabled,
  message,
  embedded = false,
  onLabelChange,
  onPermissionToggle,
  onSubmit,
}: RoleCreationCardProps) {
  return (
    <section className={embedded ? "" : "workbook-panel overflow-hidden"}>
      {!embedded ? (
        <div className={panelHeaderClassName}>
          <div>
            <h2 className="font-display text-2xl font-black uppercase tracking-tight">Create Role</h2>
            <p className="text-sm text-ink-fg/70">Add a role name and choose the permissions for that role.</p>
          </div>
        </div>
      ) : null}

      <div className="space-y-5 p-1 sm:p-2">
        {message ? (
          <div className="rounded-2xl border-2 border-ink-fg bg-paper-bg px-4 py-3 text-sm font-bold text-ink-fg brutal-shadow-sm">
            {message}
          </div>
        ) : null}

        <div>
          <label className={fieldLabelClassName}>Role Name</label>
          <input
            type="text"
            value={label}
            onChange={(event) => onLabelChange(event.target.value)}
            placeholder="e.g. Group Manager"
            className="workbook-input text-sm"
            disabled={disabled}
          />
        </div>

        <div className="space-y-3 rounded-2xl border-2 border-ink-fg bg-paper-bg p-4">
          <div>
            <div className={fieldLabelClassName}>Permissions</div>
            <p className="text-sm text-ink-fg/70">Choose the starting permissions for this role.</p>
          </div>

          <div className="max-h-[45vh] overflow-y-auto rounded-2xl border-2 border-ink-fg bg-surface-white">
            <div className="divide-y-2 divide-ink-fg">
              {permissions.map((permission) => {
                const checked = selectedPermissionIds.includes(permission.id);

                return (
                  <label key={permission.id} className="flex cursor-pointer items-start gap-3 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onPermissionToggle(permission.id)}
                      className="mt-1 h-4 w-4"
                      disabled={disabled}
                    />
                    <div>
                      <div className="text-sm font-bold text-ink-fg">{permission.label}</div>
                      <div className="text-xs uppercase tracking-[0.16em] text-ink-fg/55">{permission.code}</div>
                      <div className="mt-1 text-sm leading-5 text-ink-fg/70">{permission.description}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled}
          className="workbook-button workbook-press w-full text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          Create Role
        </button>
      </div>
    </section>
  );
}
