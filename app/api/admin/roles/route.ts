import { NextResponse } from "next/server";

import { getServerSession } from "@/lib/auth/server";
import { createAdminRoleSchema } from "@/lib/schema/adminRole";
import { adminRoleService } from "@/lib/services/adminRoleService";

function ensureAdmin(session: Awaited<ReturnType<typeof getServerSession>>) {
  return Boolean(session?.user.role === "ADMIN");
}

export async function GET() {
  const session = await getServerSession();

  if (!ensureAdmin(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const directory = await adminRoleService.getDirectory();
    return NextResponse.json(directory);
  } catch (error) {
    console.error("GET /api/admin/roles error:", error);
    return NextResponse.json({ error: "Failed to load roles" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession();

  if (!ensureAdmin(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = createAdminRoleSchema.safeParse(await req.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid role payload" }, { status: 400 });
  }

  try {
    await adminRoleService.createRole(parsed.data);
    const directory = await adminRoleService.getDirectory();
    return NextResponse.json(directory, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/roles error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create role" },
      { status: 400 },
    );
  }
}
