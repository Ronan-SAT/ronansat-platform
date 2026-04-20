import { NextResponse } from "next/server";

import { getServerSession } from "@/lib/auth/server";
import { regenerateGroupAccessTokenSchema } from "@/lib/schema/group";
import { groupService } from "@/lib/services/groupService";

export async function GET() {
  const session = await getServerSession();

  if (!session?.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const status = await groupService.getAccessTokenStatus(session.user.id);
    return NextResponse.json(status);
  } catch (error) {
    console.error("GET /api/user/group-access-token error:", error);
    return NextResponse.json({ error: "Failed to load the group access token." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession();

  if (!session?.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = regenerateGroupAccessTokenSchema.safeParse(await request.json().catch(() => ({})));

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid token request." }, { status: 400 });
  }

  try {
    const token = await groupService.regenerateAccessToken(session.user.id);
    return NextResponse.json(token, { status: 201 });
  } catch (error) {
    console.error("POST /api/user/group-access-token error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate a new group access token." },
      { status: 500 },
    );
  }
}
