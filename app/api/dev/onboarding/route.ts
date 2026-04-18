import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import dbConnect from "@/lib/mongodb";
import User from "@/lib/models/User";
import { hasCompletedStudentProfile } from "@/lib/userProfile";

function isDevEnvironment() {
  return process.env.NODE_ENV !== "production";
}

export async function POST() {
  if (!isDevEnvironment()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const user = await User.findById(session.user.id).select("role username birthDate");

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  user.username = undefined;
  user.birthDate = undefined;
  await user.save();

  return NextResponse.json(
    {
      message: "Welcome onboarding reset.",
      user: {
        username: user.username,
        birthDate: user.birthDate,
        hasCompletedProfile: hasCompletedStudentProfile(user),
      },
    },
    { status: 200 }
  );
}
