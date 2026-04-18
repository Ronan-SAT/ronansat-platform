"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import posthog from "posthog-js";

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || "https://us.i.posthog.com";

type PostHogProviderProps = {
  children: React.ReactNode;
};

export default function PostHogProvider({ children }: PostHogProviderProps) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const hasInitializedRef = useRef(false);
  const lastPageUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!posthogKey || hasInitializedRef.current) {
      return;
    }

    posthog.init(posthogKey, {
      api_host: posthogHost,
      capture_pageview: false,
      defaults: "2026-01-30",
      person_profiles: "identified_only",
    });

    hasInitializedRef.current = true;
  }, []);

  useEffect(() => {
    if (!hasInitializedRef.current) {
      return;
    }

    if (status === "loading") {
      return;
    }

    if (status !== "authenticated" || !session?.user?.id) {
      posthog.reset();
      return;
    }

    posthog.identify(session.user.id, {
      email: session.user.email ?? undefined,
      name: session.user.name ?? undefined,
      role: session.user.role,
      username: session.user.username ?? undefined,
      hasCompletedProfile: Boolean(session.user.hasCompletedProfile),
    });
  }, [session, status]);

  useEffect(() => {
    if (!hasInitializedRef.current || !pathname) {
      return;
    }

    const currentUrl = window.location.pathname + window.location.search;

    if (lastPageUrlRef.current === currentUrl) {
      return;
    }

    posthog.capture("$pageview", {
      $current_url: currentUrl,
    });

    lastPageUrlRef.current = currentUrl;
  }, [pathname]);

  return children;
}
