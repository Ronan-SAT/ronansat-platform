import { fetchHallOfFamePage } from "@/lib/services/hallOfFameService";
import { fetchReviewErrorLogPage, fetchReviewReasonCatalog } from "@/lib/services/reviewService";
import { fetchGroupAccessTokenStatus, fetchUserSettings } from "@/lib/services/settingsService";
import { fetchVocabBoard } from "@/lib/services/vocabService";

const BLOCKED_ROUTE_SHELL_PREFETCH_PREFIXES = ["/test/"];

function getUrl(href: string) {
  if (typeof window === "undefined") {
    return new URL(href, "http://localhost");
  }

  return new URL(href, window.location.origin);
}

const ROUTE_PREFETCHERS: Record<string, () => Promise<void>> = {
  "/review?view=error-log": async () => {
    await Promise.all([
      fetchReviewErrorLogPage({ testType: "full", status: "all", query: "", offset: 0, limit: 20 }),
      fetchReviewReasonCatalog(),
    ]);
  },
  "/vocab": async () => {
    await fetchVocabBoard();
  },
  "/hall-of-fame": async () => {
    await fetchHallOfFamePage(1, 8);
  },
  "/settings": async () => {
    await Promise.all([fetchUserSettings(), fetchGroupAccessTokenStatus()]);
  },
};

export function canPrefetchRouteShell(href: string) {
  const pathname = getUrl(href).pathname;
  return !BLOCKED_ROUTE_SHELL_PREFETCH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix));
}

export function getRouteDataPrefetcher(href: string) {
  return ROUTE_PREFETCHERS[href];
}
