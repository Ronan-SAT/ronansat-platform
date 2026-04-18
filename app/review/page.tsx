import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import ReviewPageClient from "@/components/review/ReviewPageClient";
import { authOptions } from "@/lib/authOptions";
import { isStudentProfileIncomplete } from "@/lib/userProfile";

export default async function ReviewPage() {
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

  return <ReviewPageClient />;
}
