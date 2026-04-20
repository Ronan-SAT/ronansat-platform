import { NextResponse } from "next/server";

import { getServerSession } from "@/lib/auth/server";
import { groupService } from "@/lib/services/groupService";
import { updateGroupSchema } from "@/lib/schema/group";

type RouteContext = {
  params: Promise<{
    groupId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getServerSession();

  if (!session?.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = updateGroupSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid group payload." }, { status: 400 });
  }

  const { groupId } = await context.params;

  try {
    await groupService.updateGroup(session.user.id, groupId, parsed.data);
    const directory = await groupService.getDirectory(session.user.id);
    return NextResponse.json(directory);
  } catch (error) {
    console.error(`PATCH /api/groups/${groupId} error:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update the group." },
      { status: 400 },
    );
  }
}

export async function GET(_request: Request, context: RouteContext) {
  const session = await getServerSession();

  if (!session?.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { groupId } = await context.params;

  try {
    const detail = await groupService.getGroupDetail(session.user.id, groupId);
    return NextResponse.json(detail);
  } catch (error) {
    console.error(`GET /api/groups/${groupId} error:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load the group." },
      { status: 404 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await getServerSession();

  if (!session?.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { groupId } = await context.params;

  try {
    await groupService.deleteGroup(session.user.id, groupId);
    const directory = await groupService.getDirectory(session.user.id);
    return NextResponse.json(directory);
  } catch (error) {
    console.error(`DELETE /api/groups/${groupId} error:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to remove the group." },
      { status: 400 },
    );
  }
}
