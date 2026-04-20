import { NextResponse } from "next/server";

import { getServerSession } from "@/lib/auth/server";
import { groupService } from "@/lib/services/groupService";

type RouteContext = {
  params: Promise<{
    groupId: string;
    userId: string;
  }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await getServerSession();

  if (!session?.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { groupId, userId } = await context.params;

  try {
    await groupService.removeMember(session.user.id, groupId, userId);
    const directory = await groupService.getDirectory(session.user.id);
    return NextResponse.json(directory);
  } catch (error) {
    console.error(`DELETE /api/groups/${groupId}/members/${userId} error:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to remove the member." },
      { status: 400 },
    );
  }
}
