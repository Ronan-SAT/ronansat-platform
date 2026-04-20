import { NextResponse } from "next/server";

import { getServerSession } from "@/lib/auth/server";
import { addAdminRoleMemberSchema } from "@/lib/schema/adminRole";
import { adminRoleService } from "@/lib/services/adminRoleService";

type RouteContext = {
  params: Promise<{
    roleId: string;
  }>;
};

function ensureAdmin(session: Awaited<ReturnType<typeof getServerSession>>) {
  return Boolean(session?.user.role === "ADMIN");
}

export async function POST(req: Request, context: RouteContext) {
  const session = await getServerSession();

  if (!ensureAdmin(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = addAdminRoleMemberSchema.safeParse(await req.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid role member payload" }, { status: 400 });
  }

  const { roleId } = await context.params;

  try {
    await adminRoleService.addMember(roleId, parsed.data);
    const directory = await adminRoleService.getDirectory();
    return NextResponse.json(directory, { status: 201 });
  } catch (error) {
    console.error(`POST /api/admin/roles/${roleId}/members error:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to add person to role" },
      { status: 400 },
    );
  }
}
