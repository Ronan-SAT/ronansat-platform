import { NextResponse } from "next/server";

import { getServerSession } from "@/lib/auth/server";
import { createGroupSchema } from "@/lib/schema/group";
import { groupService } from "@/lib/services/groupService";

export async function GET() {
  const session = await getServerSession();

  if (!session?.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const directory = await groupService.getDirectory(session.user.id);
    return NextResponse.json(directory);
  } catch (error) {
    console.error("GET /api/groups error:", error);
    return NextResponse.json({ error: "Failed to load groups." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession();

  if (!session?.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = createGroupSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid group payload." }, { status: 400 });
  }

  try {
    await groupService.createGroup(session.user.id, parsed.data);
    const directory = await groupService.getDirectory(session.user.id);
    return NextResponse.json(directory, { status: 201 });
  } catch (error) {
    console.error("POST /api/groups error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create the group." },
      { status: 400 },
    );
  }
}
