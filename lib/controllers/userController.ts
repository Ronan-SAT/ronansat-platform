// User-facing controller methods.

import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/server";
import { userService } from "@/lib/services/userService";

export const userController = {
    async getUserStats(req?: Request) {
        try {
            void req;
            // Verify the user is authenticated.
            const session = await getServerSession();
            if (!session) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }

            // Delegate the lookup to the shared service layer.
            const stats = await userService.getUserStats(session.user.id);
            return NextResponse.json(stats);
        } catch (error: unknown) {
            console.error("Error fetching user stats:", error);
            if (error instanceof Error && error.message === "User not found") {
                return NextResponse.json({ error: error.message }, { status: 404 });
            }
            return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
        }
    },

    async getDashboardOverview(req?: Request) {
        try {
            void req;
            const session = await getServerSession();
            if (!session) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }

            const overview = await userService.getDashboardOverview(session.user.id);
            return NextResponse.json(overview);
        } catch (error: unknown) {
            console.error("Error fetching dashboard overview:", error);
            return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
        }
    }
};
