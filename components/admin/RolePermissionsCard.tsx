"use client";

import type { AdminRole, AdminRolePermission } from "@/types/adminRole";

type RolePermissionsCardProps = {
  role: AdminRole | null;
  permissions: AdminRolePermission[];
  selectedPermissionIds: string[];
  disabled: boolean;
  message: string;
  onPermissionToggle: (permissionId: string) => void;
  onSave: () => void;
  onDelete: () => void;
};

const panelHeaderClassName =
  "flex items-center justify-between gap-3 border-b-4 border-ink-fg bg-paper-bg px-5 py-4 text-ink-fg";

const fieldLabelClassName = "mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-ink-fg/70";

export default function RolePermissionsCard({
  role,
  permissions,
  selectedPermissionIds,
  disabled,
  message,
  onPermissionToggle,
  onSave,
  onDelete,
}: RolePermissionsCardProps) {
  const canDeleteRole = Boolean(role && !["admin", "student", "teacher"].includes(role.code) && !role.isSystem);

  return (
    <section className="workbook-panel overflow-hidden">
      <div className={panelHeaderClassName}>
        <div>
          <h2 className="font-display text-2xl font-black uppercase tracking-tight">Role Permissions</h2>
          <p className="text-sm text-ink-fg/70">Adjust what each role can access.</p>
        </div>
        {role ? <div className="text-xs uppercase tracking-[0.16em] text-ink-fg/55">{role.label}</div> : null}
      </div>

      <div className="space-y-5 p-5">
        {message ? (
          <div className="rounded-2xl border-2 border-ink-fg bg-paper-bg px-4 py-3 text-sm font-bold text-ink-fg brutal-shadow-sm">
            {message}
          </div>
        ) : null}

        {!role ? (
          <div className="rounded-2xl border-2 border-dashed border-ink-fg bg-paper-bg px-4 py-8 text-center text-sm text-ink-fg/70">
            Pick a role to edit its permissions.
          </div>
        ) : (
          <>
            <div>
              <div className={fieldLabelClassName}>Permission List</div>
              <div className="max-h-[40vh] overflow-y-auto rounded-2xl border-2 border-ink-fg bg-surface-white">
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
                          disabled={disabled || !role.isEditable}
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

            {role.isEditable ? (
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={onSave}
                  disabled={disabled}
                  className="workbook-button workbook-press flex-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Save Permissions
                </button>
                {canDeleteRole ? (
                  <button
                    type="button"
                    onClick={onDelete}
                    disabled={disabled}
                    className="inline-flex items-center justify-center rounded-2xl border-2 border-ink-fg bg-surface-white px-5 py-3 text-sm font-bold text-ink-fg brutal-shadow-sm transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Delete Role
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="inline-flex h-[50px] w-full items-center justify-center rounded-2xl border-2 border-ink-fg bg-paper-bg px-5 text-sm font-bold text-ink-fg">
                This role is locked.
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
