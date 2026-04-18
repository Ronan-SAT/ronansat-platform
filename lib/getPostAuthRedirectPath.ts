import type { Session } from "next-auth";

type RedirectUser = Pick<Session["user"], "role" | "hasCompletedProfile"> | null | undefined;

export function getPostAuthRedirectPath(user: RedirectUser) {
  if (!user) {
    return "/auth";
  }

  if (!user.hasCompletedProfile) {
    return "/welcome";
  }

  if (user.role === "PARENT") {
    return "/parent/dashboard";
  }

  return "/dashboard";
}
