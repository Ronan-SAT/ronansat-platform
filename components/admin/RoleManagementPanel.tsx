"use client";

import { useEffect, useMemo, useState } from "react";
import { AxiosError } from "axios";

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
} from "@/components/ui/alert-dialog";
import RoleCreationCard from "@/components/admin/RoleCreationCard";
import RoleMembersCard from "@/components/admin/RoleMembersCard";
import RolePermissionsCard from "@/components/admin/RolePermissionsCard";
import api from "@/lib/axios";
import { API_PATHS } from "@/lib/apiPaths";
import { DEFAULT_TESTING_ROOM_THEME, getTestingRoomThemePreset } from "@/lib/testingRoomTheme";
import type { AdminRoleDirectory } from "@/types/adminRole";

type RoleManagementPanelState = {
  permissions: AdminRoleDirectory["permissions"];
  roles: AdminRoleDirectory["roles"];
  users: AdminRoleDirectory["users"];
};

const emptyDirectory: RoleManagementPanelState = {
  permissions: [],
  roles: [],
  users: [],
};

function getApiErrorMessage(error: unknown, fallback: string) {
  if (error instanceof AxiosError) {
    return error.response?.data?.error || fallback;
  }

  return fallback;
}

export default function RoleManagementPanel({ embedded = false }: { embedded?: boolean }) {
  const dialogTheme = getTestingRoomThemePreset(DEFAULT_TESTING_ROOM_THEME).dialog;
  const [directory, setDirectory] = useState<RoleManagementPanelState>(emptyDirectory);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isMembersDialogOpen, setIsMembersDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [userIdentifier, setUserIdentifier] = useState("");
  const [createLabel, setCreateLabel] = useState("");
  const [createPermissionIds, setCreatePermissionIds] = useState<string[]>([]);
  const [editingPermissionIds, setEditingPermissionIds] = useState<string[]>([]);
  const [createMessage, setCreateMessage] = useState("");
  const [permissionsMessage, setPermissionsMessage] = useState("");
  const [membersMessage, setMembersMessage] = useState("");
  const [busyAction, setBusyAction] = useState<"create" | "permissions" | "members" | "delete" | null>(null);

  const selectedRole = useMemo(
    () => directory.roles.find((role) => role.id === selectedRoleId) ?? directory.roles[0] ?? null,
    [directory.roles, selectedRoleId],
  );

  useEffect(() => {
    void loadDirectory();
  }, []);

  useEffect(() => {
    if (!selectedRole && directory.roles.length === 0) {
      setSelectedRoleId("");
      setEditingPermissionIds([]);
      return;
    }

    if (selectedRole && selectedRole.id !== selectedRoleId) {
      setSelectedRoleId(selectedRole.id);
    }

    if (selectedRole) {
      setEditingPermissionIds(selectedRole.permissionIds);
      setUserIdentifier("");
      setIsMembersDialogOpen(false);
    }
  }, [directory.roles, selectedRole, selectedRoleId]);

  const loadDirectory = async () => {
    try {
      setLoading(true);
      setLoadError("");
      const response = await api.get<AdminRoleDirectory>(API_PATHS.ADMIN_ROLES);
      setDirectory(response.data);
    } catch (error) {
      setLoadError(getApiErrorMessage(error, "Could not load roles."));
    } finally {
      setLoading(false);
    }
  };

  const replaceDirectory = (nextDirectory: AdminRoleDirectory) => {
    setDirectory(nextDirectory);
    setSelectedRoleId((currentRoleId) => {
      if (currentRoleId && nextDirectory.roles.some((role) => role.id === currentRoleId)) {
        return currentRoleId;
      }

      return nextDirectory.roles[0]?.id ?? "";
    });
  };

  const toggleCreatePermission = (permissionId: string) => {
    setCreatePermissionIds((currentIds) =>
      currentIds.includes(permissionId) ? currentIds.filter((id) => id !== permissionId) : [...currentIds, permissionId],
    );
  };

  const toggleEditingPermission = (permissionId: string) => {
    setEditingPermissionIds((currentIds) =>
      currentIds.includes(permissionId) ? currentIds.filter((id) => id !== permissionId) : [...currentIds, permissionId],
    );
  };

  const handleCreateRole = async () => {
    setCreateMessage("");

    if (!createLabel.trim()) {
      setCreateMessage("Please enter a role name first.");
      return;
    }

    try {
      setBusyAction("create");
      const response = await api.post<AdminRoleDirectory>(API_PATHS.ADMIN_ROLES, {
        label: createLabel,
        permissionIds: createPermissionIds,
      });
      replaceDirectory(response.data);
      setCreateLabel("");
      setCreatePermissionIds([]);
      setCreateMessage("");
      setIsCreateDialogOpen(false);
    } catch (error) {
      setCreateMessage(getApiErrorMessage(error, "Could not create role."));
    } finally {
      setBusyAction(null);
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) {
      setPermissionsMessage("Choose a role first.");
      return;
    }

    try {
      setBusyAction("permissions");
      const response = await api.patch<AdminRoleDirectory>(`${API_PATHS.ADMIN_ROLES}/${selectedRole.id}`, {
        permissionIds: editingPermissionIds,
      });
      replaceDirectory(response.data);
      setPermissionsMessage("Permissions updated.");
    } catch (error) {
      setPermissionsMessage(getApiErrorMessage(error, "Could not update permissions."));
    } finally {
      setBusyAction(null);
    }
  };

  const handleDeleteRole = async () => {
    if (!selectedRole) {
      return;
    }

    try {
      setBusyAction("delete");
      const response = await api.delete<AdminRoleDirectory>(`${API_PATHS.ADMIN_ROLES}/${selectedRole.id}`);
      replaceDirectory(response.data);
      setPermissionsMessage("Role removed.");
      setMembersMessage("");
      setIsDeleteDialogOpen(false);
    } catch (error) {
      setPermissionsMessage(getApiErrorMessage(error, "Could not delete role."));
    } finally {
      setBusyAction(null);
    }
  };

  const handleAddMember = async () => {
    if (!selectedRole) {
      setMembersMessage("Choose a role first.");
      return;
    }

    if (!userIdentifier.trim()) {
      setMembersMessage("Enter a username, email, or user id first.");
      return;
    }

    try {
      setBusyAction("members");
      const response = await api.post<AdminRoleDirectory>(`${API_PATHS.ADMIN_ROLES}/${selectedRole.id}/members`, {
        userIdentifier,
      });
      replaceDirectory(response.data);
      setUserIdentifier("");
      setMembersMessage("Person added to role.");
    } catch (error) {
      setMembersMessage(getApiErrorMessage(error, "Could not add person to role."));
    } finally {
      setBusyAction(null);
    }
  };

  if (loading) {
    return (
      <section className={embedded ? "" : "workbook-panel overflow-hidden lg:col-span-2"}>
        <div className="grid gap-6 p-0 lg:grid-cols-[0.72fr_1.28fr]">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="space-y-3 rounded-2xl border-2 border-ink-fg bg-surface-white p-4 animate-pulse">
              <div className="h-5 w-32 rounded-md bg-paper-bg" />
              <div className="h-11 rounded-2xl bg-paper-bg" />
              <div className="h-11 rounded-2xl bg-paper-bg" />
              <div className="h-11 rounded-2xl bg-paper-bg" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <>
      <section className={embedded ? "space-y-5" : "workbook-panel overflow-hidden lg:col-span-2"}>
        {!embedded ? (
          <div className="border-b-4 border-ink-fg bg-paper-bg px-6 py-5">
            <div>
              <div className="workbook-sticker bg-accent-2 text-white">Role Desk</div>
              <h2 className="mt-4 font-display text-3xl font-black uppercase tracking-tight text-ink-fg">Manage roles, permissions, and assignments.</h2>
              <p className="mt-2 max-w-3xl text-sm text-ink-fg/70">Choose a role on the left. Edit permissions and membership on the right.</p>
            </div>
          </div>
        ) : null}

        <div className={`grid gap-6 ${embedded ? "p-0" : "p-5"} lg:grid-cols-[0.72fr_1.28fr]`}>
          <section className="workbook-panel overflow-hidden">
            <div className="border-b-4 border-ink-fg bg-paper-bg px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-2xl font-black uppercase tracking-tight">Active Roles</h2>
                  <p className="text-sm text-ink-fg/70">List of current roles.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCreateMessage("");
                    setCreateLabel("");
                    setCreatePermissionIds([]);
                    setIsCreateDialogOpen(true);
                  }}
                  className="workbook-button workbook-press px-4 py-2 text-sm"
                >
                  Create Role
                </button>
              </div>
            </div>

            <div className="max-h-[65vh] overflow-y-auto border-t-0 bg-surface-white">
              {loadError ? (
                <div className="p-4 text-sm text-ink-fg/70">{loadError}</div>
              ) : directory.roles.length === 0 ? (
                <div className="p-4 text-sm text-ink-fg/70">No roles found.</div>
              ) : (
                <div className="divide-y-2 divide-ink-fg">
                  {directory.roles.map((role) => {
                    const isActive = role.id === selectedRole?.id;

                    return (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => {
                          setSelectedRoleId(role.id);
                          setPermissionsMessage("");
                          setMembersMessage("");
                        }}
                        className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors ${
                          isActive ? "bg-paper-bg" : "bg-surface-white"
                        }`}
                      >
                        <div>
                          <div className="text-sm font-bold text-ink-fg">{role.label}</div>
                          <div className="text-xs uppercase tracking-[0.16em] text-ink-fg/55">{role.isSystem ? "Default role" : "Custom role"}</div>
                        </div>
                        <div className="text-xs uppercase tracking-[0.16em] text-ink-fg/55">{role.memberCount}</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setIsMembersDialogOpen(true)}
              disabled={!selectedRole}
              className="workbook-button workbook-press w-fit text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              Manage Membership
            </button>

            <RolePermissionsCard
              role={selectedRole}
              permissions={directory.permissions}
              selectedPermissionIds={editingPermissionIds}
              disabled={busyAction === "permissions" || busyAction === "delete"}
              message={permissionsMessage}
              onPermissionToggle={toggleEditingPermission}
              onSave={handleSavePermissions}
              onDelete={() => setIsDeleteDialogOpen(true)}
            />
          </div>
        </div>
      </section>

      <AdminActionDialog
        open={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        title="Create Role"
        description="Add a role name and choose the permissions for that role."
      >
        <RoleCreationCard
          embedded
          label={createLabel}
          selectedPermissionIds={createPermissionIds}
          permissions={directory.permissions}
          disabled={busyAction === "create"}
          message={createMessage}
          onLabelChange={setCreateLabel}
          onPermissionToggle={toggleCreatePermission}
          onSubmit={handleCreateRole}
        />
      </AdminActionDialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className={dialogTheme.contentClass}>
          <AlertDialogHeader>
            <AlertDialogTitle className={dialogTheme.titleClass}>Delete Role</AlertDialogTitle>
            <AlertDialogDescription className={dialogTheme.descriptionClass}>
              {selectedRole ? `Delete the role "${selectedRole.label}"?` : "Delete this role?"}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <AlertDialogCancelButton className={dialogTheme.cancelButtonClass}>Cancel</AlertDialogCancelButton>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <AlertDialogActionButton
                className={dialogTheme.dangerButtonClass}
                onClick={handleDeleteRole}
                disabled={busyAction === "delete"}
              >
                Delete Role
              </AlertDialogActionButton>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AdminActionDialog
        open={isMembersDialogOpen}
        onClose={() => setIsMembersDialogOpen(false)}
        title="Manage People In Role"
        description={selectedRole ? `Add people to ${selectedRole.label}.` : "Pick a role first."}
      >
        <RoleMembersCard
          role={selectedRole}
          userIdentifier={userIdentifier}
          disabled={busyAction === "members"}
          message={membersMessage}
          onUserIdentifierChange={setUserIdentifier}
          onSubmit={handleAddMember}
        />
      </AdminActionDialog>
    </>
  );
}
