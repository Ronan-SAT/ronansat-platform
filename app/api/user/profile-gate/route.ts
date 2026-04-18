import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import dbConnect from "@/lib/mongodb";
import User from "@/lib/models/User";
import { hasCompletedStudentProfile } from "@/lib/userProfile";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const user = await User.findById(session.user.id)
      .select("role username birthDate")
      .lean();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        role: user.role,
        hasCompletedProfile: hasCompletedStudentProfile(user),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/user/profile-gate error:", error);
    return NextResponse.json({ error: "Failed to resolve profile gate" }, { status: 500 });
  }
}
