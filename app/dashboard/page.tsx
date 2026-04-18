import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import DashboardPageClient from "@/components/dashboard/DashboardPageClient";
import { authOptions } from "@/lib/authOptions";
import { isStudentProfileIncomplete } from "@/lib/userProfile";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth");
  }

  if (session.user.role === "PARENT") {
    redirect("/parent/dashboard");
  }

  if (isStudentProfileIncomplete(session.user)) {
    redirect("/welcome");
  }

  return <DashboardPageClient />;
}
