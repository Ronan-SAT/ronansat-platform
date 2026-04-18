"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

import { preloadInitialAppData } from "@/lib/startupPreload";
import { isStudentProfileIncomplete } from "@/lib/userProfile";

const BLOCKED_PRELOAD_PREFIXES = ["/auth", "/test/"];

function canPreloadForPath(pathname: string) {
  return !BLOCKED_PRELOAD_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export default function AppStartupPreloader() {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) {
      return;
    }

    if (isStudentProfileIncomplete(session.user)) {
      return;
    }

    if (!canPreloadForPath(pathname)) {
      return;
    }

    void preloadInitialAppData({
      role: session.user.role,
      userId: session.user.id,
    }).catch((error) => {
      console.error("App startup preload failed", error);
    });
  }, [pathname, session?.user, session?.user?.id, session?.user?.role, status]);

  return null;
}
