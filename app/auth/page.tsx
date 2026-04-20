import AuthPageClient from "@/components/auth/AuthPageClient";
import { getServerSession } from "@/lib/auth/server";
import { getPostAuthRedirectPath } from "@/lib/getPostAuthRedirectPath";
import { redirect } from "next/navigation";

export default async function AuthPage() {
  const session = await getServerSession();

  if (session?.user) {
    redirect(getPostAuthRedirectPath(session.user));
  }

  return <AuthPageClient />;
}
