import Link from "next/link";
import type { ReactNode } from "react";

import { formatAppDate } from "@/lib/dateFormat";

export function formatGroupDate(value: string | null, withTime = false) {
  if (!value) {
    return "-";
  }

  return formatAppDate(value, {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(withTime
      ? {
          hour: "numeric",
          minute: "2-digit",
        }
      : {}),
  }, "-");
}

export function formatGroupScore(value: number | null) {
  if (value === null) {
    return "-";
  }

  return value.toLocaleString("en-US");
}

export function GroupsBackLink() {
  return (
    <Link
      href="/groups"
      className="inline-flex items-center justify-center rounded-2xl border-2 border-ink-fg bg-surface-white px-4 py-2 text-sm font-bold text-ink-fg brutal-shadow-sm transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
    >
      Back To Groups
    </Link>
  );
}

export function GroupMessageBanner({
  tone,
  children,
}: {
  tone: "neutral" | "success" | "error";
  children: ReactNode;
}) {
  const className =
    tone === "success"
      ? "bg-primary text-ink-fg"
      : tone === "error"
        ? "bg-accent-3 text-white"
        : "bg-paper-bg text-ink-fg";

  return <div className={`rounded-2xl border-2 border-ink-fg px-4 py-3 text-sm font-medium brutal-shadow-sm ${className}`}>{children}</div>;
}

export function GroupDetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border-2 border-ink-fg bg-surface-white p-4 brutal-shadow-sm">
      <div className="text-xs font-bold uppercase tracking-[0.16em] text-ink-fg/70">{label}</div>
      <div className="mt-2 text-sm font-bold text-ink-fg">{value}</div>
    </div>
  );
}
