import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import dbConnect from "@/lib/mongodb";
import User from "@/lib/models/User";
import { hasCompletedProfile } from "@/lib/userProfile";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();

        const user = await User.findById(session.user.id)
            .select("name username birthDate email role")
            .lean();

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json(
            {
                user: {
                    name: user.name,
                    username: user.username,
                    birthDate: user.birthDate,
                    email: user.email,
                    role: user.role,
                    hasCompletedProfile: hasCompletedProfile(user),
                },
            },
            { status: 200 }
        );
    } catch (error: unknown) {
        console.error("GET /api/user/settings error:", error);
        return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
    }
}
