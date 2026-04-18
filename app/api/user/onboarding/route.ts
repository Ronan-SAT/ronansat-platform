import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/authOptions";
import dbConnect from "@/lib/mongodb";
import User from "@/lib/models/User";
import {
  USERNAME_REQUIREMENTS,
  hasCompletedStudentProfile,
  isValidBirthDate,
  isValidUsername,
  normalizeUsername,
} from "@/lib/userProfile";

const onboardingSchema = z.object({
  username: z.string().trim().transform(normalizeUsername),
  birthDate: z.string().trim(),
});

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = onboardingSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid profile payload" }, { status: 400 });
    }

    const { username, birthDate } = parsed.data;

    if (!isValidUsername(username)) {
      return NextResponse.json({ error: USERNAME_REQUIREMENTS }, { status: 400 });
    }

    if (!isValidBirthDate(birthDate)) {
      return NextResponse.json({ error: "Enter a valid birthdate." }, { status: 400 });
    }

    await dbConnect();

    const user = await User.findById(session.user.id).select("role username birthDate");
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.role !== "STUDENT") {
      return NextResponse.json({ error: "Only student accounts use onboarding." }, { status: 403 });
    }

    if (user.username && user.username !== username) {
      return NextResponse.json({ error: "Username is already locked for this account." }, { status: 409 });
    }

    if (user.birthDate && user.birthDate !== birthDate) {
      return NextResponse.json({ error: "Birthdate is already locked for this account." }, { status: 409 });
    }

    if (!user.username) {
      user.username = username;
    }

    if (!user.birthDate) {
      user.birthDate = birthDate;
    }

    await user.save();

    return NextResponse.json(
      {
        message: "Welcome setup saved.",
        user: {
          username: user.username,
          birthDate: user.birthDate,
          hasCompletedProfile: hasCompletedStudentProfile(user),
        },
      },
      { status: 200 },
    );
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
      return NextResponse.json({ error: "That username is already taken." }, { status: 409 });
    }

    console.error("PUT /api/user/onboarding error:", error);
    return NextResponse.json({ error: "Failed to save your welcome profile." }, { status: 500 });
  }
}
