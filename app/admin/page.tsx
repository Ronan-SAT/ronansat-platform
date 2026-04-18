import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import AdminDashboardClient from "@/components/admin/AdminDashboardClient";
import { authOptions } from "@/lib/authOptions";
import dbConnect from "@/lib/mongodb";
import User from "@/lib/models/User";
import { hasCompletedProfile } from "@/lib/userProfile";

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/auth");
  }

  await dbConnect();
  const user = await User.findById(session.user.id).select("role username birthDate").lean();

  if (!user) {
    redirect("/auth");
  }

  if (user.role === "PARENT") {
    redirect("/parent/dashboard");
  }

  if (!hasCompletedProfile(user)) {
    redirect("/welcome");
  }

  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return <AdminDashboardClient />;
}
