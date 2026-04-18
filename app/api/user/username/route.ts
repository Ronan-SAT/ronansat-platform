import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import dbConnect from "@/lib/mongodb";
import User from "@/lib/models/User";
import {
  USERNAME_REQUIREMENTS,
  isValidUsername,
  normalizeUsername,
} from "@/lib/userProfile";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const username = normalizeUsername(searchParams.get("value") ?? "");

  if (!isValidUsername(username)) {
    return NextResponse.json(
      { isAvailable: false, error: USERNAME_REQUIREMENTS },
      { status: 400 },
    );
  }

  await dbConnect();
  const existingUser = await User.exists({ username });

  return NextResponse.json({ isAvailable: !existingUser, username }, { status: 200 });
}
