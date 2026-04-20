import { NextResponse } from "next/server";

import { getServerSession } from "@/lib/auth/server";
import { addGroupMembersSchema } from "@/lib/schema/group";
import { groupService } from "@/lib/services/groupService";

type RouteContext = {
  params: Promise<{
    groupId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const session = await getServerSession();

  if (!session?.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = addGroupMembersSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid invite payload." }, { status: 400 });
  }

  const { groupId } = await context.params;

  try {
    const inviteResult = await groupService.addMembers(session.user.id, groupId, parsed.data);
    const directory = await groupService.getDirectory(session.user.id);
    return NextResponse.json({ directory, inviteResults: inviteResult.results });
  } catch (error) {
    console.error(`POST /api/groups/${groupId}/members error:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to add group members." },
      { status: 400 },
    );
  }
}
