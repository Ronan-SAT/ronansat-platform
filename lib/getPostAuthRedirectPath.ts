import type { Session } from "next-auth";
import { isStudentProfileIncomplete } from "@/lib/userProfile";

type RedirectUser = Pick<Session["user"], "role" | "hasCompletedProfile"> | null | undefined;

export function getPostAuthRedirectPath(user: RedirectUser) {
  if (!user) {
    return "/auth";
  }

  if (user.role === "PARENT") {
    return "/parent/dashboard";
  }

  if (isStudentProfileIncomplete(user)) {
    return "/welcome";
  }

  return "/dashboard";
}
