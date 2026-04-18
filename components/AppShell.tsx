"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import DevToolsBubble from "@/components/DevToolsBubble";
import Loading from "@/components/Loading";
import Navbar from "@/components/Navbar";

type AppShellProps = {
  children: ReactNode;
};

const SHELL_HIDDEN_PREFIXES = ["/auth", "/test/"];
const WELCOME_ROUTE = "/welcome";
const SHELL_HIDDEN_ROUTES = new Set(["/", WELCOME_ROUTE]);

function shouldHideShell(pathname: string) {
  if (SHELL_HIDDEN_ROUTES.has(pathname)) {
    return true;
  }

  return SHELL_HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const hideShell = shouldHideShell(pathname);
  const shouldCheckProfile =
    status === "authenticated" &&
    pathname !== WELCOME_ROUTE &&
    !pathname.startsWith("/auth") &&
    !pathname.startsWith("/test/");
  const shouldForceWelcome =
    shouldCheckProfile &&
    !session.user.hasCompletedProfile;

  useEffect(() => {
    if (shouldForceWelcome) {
      router.replace(WELCOME_ROUTE);
    }
  }, [router, shouldForceWelcome]);

  if (shouldForceWelcome) {
    return <Loading showQuote={false} />;
  }

  if (hideShell) {
    return (
      <>
        {children}
        <DevToolsBubble />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-paper-bg text-ink-fg">
      <Navbar />
      <div className="min-h-screen pb-28 lg:pl-64 lg:pb-0">
        {children}
      </div>
      <DevToolsBubble />
    </div>
  );
}
