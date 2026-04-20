import { NextResponse } from "next/server";

import { getServerSession } from "@/lib/auth/server";
import { updateAdminRolePermissionsSchema } from "@/lib/schema/adminRole";
import { adminRoleService } from "@/lib/services/adminRoleService";

type RouteContext = {
  params: Promise<{
    roleId: string;
  }>;
};

function ensureAdmin(session: Awaited<ReturnType<typeof getServerSession>>) {
  return Boolean(session?.user.role === "ADMIN");
}

export async function PATCH(req: Request, context: RouteContext) {
  const session = await getServerSession();

  if (!ensureAdmin(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = updateAdminRolePermissionsSchema.safeParse(await req.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid permissions payload" }, { status: 400 });
  }

  const { roleId } = await context.params;

  try {
    await adminRoleService.updateRolePermissions(roleId, parsed.data);
    const directory = await adminRoleService.getDirectory();
    return NextResponse.json(directory);
  } catch (error) {
    console.error(`PATCH /api/admin/roles/${roleId} error:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update role" },
      { status: 400 },
    );
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  const session = await getServerSession();

  if (!ensureAdmin(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { roleId } = await context.params;

  try {
    await adminRoleService.deleteRole(roleId);
    const directory = await adminRoleService.getDirectory();
    return NextResponse.json(directory);
  } catch (error) {
    console.error(`DELETE /api/admin/roles/${roleId} error:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete role" },
      { status: 400 },
    );
  }
}
