"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { TestTokenDialog } from "@/components/test-access/TestTokenDialog";
import { useIntentPrefetch } from "@/hooks/useIntentPrefetch";
import { useTestAccess } from "@/components/test-access/useTestAccess";

type TestAccessButtonProps = {
  testId: string;
  testTitle: string;
  href: string;
  requiresToken?: boolean;
  lockedLabel?: string;
  className: string;
  children: ReactNode;
  ariaLabel?: string;
  prefetchKey?: string;
  onIntentPrefetch?: () => Promise<unknown> | unknown;
};

export function TestAccessButton({
  testId,
  testTitle,
  href,
  requiresToken = false,
  lockedLabel = "Enter token to access this test",
  className,
  children,
  ariaLabel,
  prefetchKey,
  onIntentPrefetch,
}: TestAccessButtonProps) {
  const access = useTestAccess({ testId, requiresToken });
  const intentHandlers = useIntentPrefetch<HTMLAnchorElement | HTMLButtonElement>({
    key: prefetchKey ?? `test-access:${href}`,
    enabled: Boolean(onIntentPrefetch) && (!requiresToken || access.isUnlocked),
    onPrefetch: async () => {
      await onIntentPrefetch?.();
    },
  });

  if (!requiresToken || access.isUnlocked) {
    return (
      <Link aria-label={ariaLabel} className={className} href={href} {...intentHandlers}>
        {children}
      </Link>
    );
  }

  return (
    <>
      <button aria-label={ariaLabel} className={className} onClick={access.openDialog} type="button">
        {lockedLabel}
      </button>
      <TestTokenDialog
        error={access.error}
        isSubmitting={access.isSubmitting}
        onClose={access.closeDialog}
        onSubmit={access.verifyToken}
        open={access.isDialogOpen}
        testTitle={testTitle}
      />
    </>
  );
}
