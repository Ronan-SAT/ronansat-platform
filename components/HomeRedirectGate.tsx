"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import Loading from "@/components/Loading";

export default function HomeRedirectGate() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "loading") {
      return;
    }

    if (!session?.user) {
      router.replace("/auth");
      return;
    }

    if (session.user.role === "PARENT") {
      router.replace("/parent/dashboard");
      return;
    }

    if (!session.user.hasCompletedProfile) {
      router.replace("/welcome");
      return;
    }

    router.replace("/dashboard");
  }, [router, session?.user, session?.user?.hasCompletedProfile, session?.user?.role, status]);

  return <Loading showQuote={false} />;
}
