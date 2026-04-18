"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Bug, EyeOff, RefreshCw, Wrench } from "lucide-react";

import api from "@/lib/axios";
import { API_PATHS } from "@/lib/apiPaths";

const IS_DEV = process.env.NODE_ENV !== "production";

export default function DevToolsBubble() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status, update } = useSession();

  const [isOpen, setIsOpen] = useState(false);
  const [isHiddenUntilRefresh, setIsHiddenUntilRefresh] = useState(false);
  const [isResettingWelcome, setIsResettingWelcome] = useState(false);
  const [message, setMessage] = useState("");

  if (!IS_DEV || status !== "authenticated" || !session?.user || isHiddenUntilRefresh) {
    return null;
  }

  const triggerWelcome = async () => {
    setIsResettingWelcome(true);
    setMessage("");

    try {
      const response = await api.post(API_PATHS.DEV_ONBOARDING_RESET);
      const nextUser = response.data.user as {
        username?: string;
        birthDate?: string;
        hasCompletedProfile: boolean;
      };

      await update({
        username: nextUser.username,
        birthDate: nextUser.birthDate,
        hasCompletedProfile: nextUser.hasCompletedProfile,
      });

      setIsOpen(false);
      router.replace("/welcome");
      router.refresh();
    } catch (error: unknown) {
      const responseError = error as { response?: { data?: { error?: string } } };
      setMessage(responseError.response?.data?.error || "Could not reset welcome onboarding.");
    } finally {
      setIsResettingWelcome(false);
    }
  };

  return (
    <div className="fixed bottom-4 left-4 z-[100] flex flex-col items-start gap-3">
      {isOpen ? (
        <div className="w-[19rem] rounded-[1.75rem] border-2 border-ink-fg bg-surface-white p-4 brutal-shadow">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink-fg">Developer Tools</p>
              <p className="mt-2 text-sm leading-6 text-ink-fg/75">
                Signed in as {session.user.email}. Current route: <span className="font-mono text-[0.75rem]">{pathname}</span>
              </p>
            </div>
            <div className="workbook-sticker bg-accent-3 text-white">Dev</div>
          </div>

          <div className="mt-4 space-y-3">
            <button
              type="button"
              onClick={() => setIsHiddenUntilRefresh(true)}
              className="workbook-button workbook-button-secondary w-full justify-center"
            >
              <EyeOff className="h-4 w-4" />
              Hide Until Refresh
            </button>

            <button
              type="button"
              onClick={triggerWelcome}
              disabled={isResettingWelcome}
              className="workbook-button w-full justify-center disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${isResettingWelcome ? "animate-spin" : ""}`} />
              {isResettingWelcome ? "Resetting..." : "Trigger Welcome Screen"}
            </button>

            <p className="text-xs leading-5 text-ink-fg/70">
              Clears `username` and `birthDate` for the current account, updates the session, and sends you straight into onboarding.
            </p>

            {message ? (
              <div className="rounded-2xl border-2 border-ink-fg bg-accent-3 px-3 py-2 text-xs font-medium text-white">
                {message}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-label={isOpen ? "Close developer tools" : "Open developer tools"}
        className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-ink-fg bg-primary text-ink-fg brutal-shadow-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
      >
        {isOpen ? <Wrench className="h-4 w-4" /> : <Bug className="h-4 w-4" />}
      </button>
    </div>
  );
}
