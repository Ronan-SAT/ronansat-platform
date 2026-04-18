"use client";

import { useEffect, useRef } from "react";
import type { Session } from "next-auth";
import { SessionProvider, useSession } from "next-auth/react";

import { clearClientSessionState } from "@/lib/clearClientSessionState";

function SessionStateBoundary() {
  const { data: session, status } = useSession();
  const lastUserIdRef = useRef<string | null>(null);
  const hasHydratedRef = useRef(false);

  useEffect(() => {
    if (status === "loading") {
      return;
    }

    const currentUserId = status === "authenticated" ? session?.user?.id ?? null : null;

    if (!hasHydratedRef.current) {
      hasHydratedRef.current = true;
      lastUserIdRef.current = currentUserId;
      return;
    }

    if (lastUserIdRef.current && currentUserId !== lastUserIdRef.current) {
      clearClientSessionState();
    }

    lastUserIdRef.current = currentUserId;
  }, [session?.user?.id, status]);

  return null;
}

export default function AuthProvider({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session | null;
}) {
  return (
    <SessionProvider session={session}>
      <SessionStateBoundary />
      {children}
    </SessionProvider>
  );
}
