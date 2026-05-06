"use client";

import { useEffect, useMemo, useState } from "react";
import { LockKeyhole, Save, Search, Trash2, UnlockKeyhole } from "lucide-react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatAppDate } from "@/lib/dateFormat";
import {
  fetchLockedTestsForManager,
  removeLockedTestForManager,
  saveLockedTestForManager,
} from "@/lib/services/testManagerCatalogClient";
import type { TestManagerLockedTestRow } from "@/types/testManager";

function getActionErrorMessage(error: unknown, fallback: string) {
  return error &&
    typeof error === "object" &&
    "response" in error &&
    error.response &&
    typeof error.response === "object" &&
    "data" in error.response &&
    error.response.data &&
    typeof error.response.data === "object" &&
    "error" in error.response.data
    ? String(error.response.data.error)
    : fallback;
}

function formatDate(value?: string) {
  if (!value) {
    return "Not locked";
  }

  return formatAppDate(value);
}

function getVisibleOptions(tests: TestManagerLockedTestRow[], selectedTestId: string, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = normalizedQuery
    ? tests.filter((test) => test.title.toLowerCase().includes(normalizedQuery))
    : tests;

  if (!selectedTestId || filtered.some((test) => test.testId === selectedTestId)) {
    return filtered.slice(0, 60);
  }

  const selected = tests.find((test) => test.testId === selectedTestId);
  return selected ? [selected, ...filtered.slice(0, 59)] : filtered.slice(0, 60);
}

export function TokenLockManager() {
  const [tests, setTests] = useState<TestManagerLockedTestRow[]>([]);
  const [selectedTestId, setSelectedTestId] = useState("");
  const [tokenDraft, setTokenDraft] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removingTestId, setRemovingTestId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const selectedTest = useMemo(
    () => tests.find((test) => test.testId === selectedTestId) ?? null,
    [selectedTestId, tests],
  );
  const lockedTests = useMemo(() => tests.filter((test) => test.requiresToken), [tests]);
  const visibleOptions = useMemo(() => getVisibleOptions(tests, selectedTestId, query), [query, selectedTestId, tests]);

  useEffect(() => {
    let cancelled = false;

    const loadLocks = async () => {
      setLoading(true);
      setError("");

      try {
        const payload = await fetchLockedTestsForManager();

        if (cancelled) {
          return;
        }

        const nextTests = payload.tests ?? [];
        const initialTest = nextTests.find((test) => test.requiresToken) ?? nextTests[0] ?? null;

        setTests(nextTests);
        setSelectedTestId(initialTest?.testId ?? "");
        setTokenDraft(initialTest?.token ?? "");
      } catch (loadError) {
        if (!cancelled) {
          setError(getActionErrorMessage(loadError, "Could not load token locks."));
          setTests([]);
          setSelectedTestId("");
          setTokenDraft("");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadLocks();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSelectTest = (testId: string) => {
    const nextTest = tests.find((test) => test.testId === testId) ?? null;
    setSelectedTestId(testId);
    setTokenDraft(nextTest?.token ?? "");
    setError("");
    setNotice("");
  };

  const handleSave = async () => {
    if (!selectedTestId || !tokenDraft.trim()) {
      setError("Choose a test and enter a token.");
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const payload = await saveLockedTestForManager(selectedTestId, tokenDraft);
      const nextSelected = payload.tests.find((test) => test.testId === selectedTestId) ?? null;

      setTests(payload.tests);
      setTokenDraft(nextSelected?.token ?? tokenDraft.trim());
      setNotice("Token lock saved.");
    } catch (saveError) {
      setError(getActionErrorMessage(saveError, "Could not save this token lock."));
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (testId: string) => {
    setRemovingTestId(testId);
    setError("");
    setNotice("");

    try {
      const payload = await removeLockedTestForManager(testId);
      const nextSelected = payload.tests.find((test) => test.testId === selectedTestId) ?? null;

      setTests(payload.tests);
      setTokenDraft(nextSelected?.token ?? "");
      setNotice("Token requirement removed.");
    } catch (removeError) {
      setError(getActionErrorMessage(removeError, "Could not remove this token requirement."));
    } finally {
      setRemovingTestId(null);
    }
  };

  return (
    <section className="workbook-panel-muted shrink-0 overflow-hidden">
      <div className="border-b-4 border-ink-fg bg-paper-bg px-4 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="workbook-sticker bg-accent-2 text-white">
              <LockKeyhole className="h-4 w-4" />
              Token Locks
            </div>
            <h2 className="mt-3 font-display text-[24px] font-black uppercase tracking-tight text-ink-fg">Locked Test Access</h2>
          </div>
          <div className="workbook-sticker bg-surface-white text-ink-fg">{lockedTests.length} locked</div>
        </div>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.75fr)]">
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(13rem,0.45fr)]">
            <label className="block">
              <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-ink-fg/70">Find Test</span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-fg/55" />
                <input
                  className="workbook-input pl-11"
                  disabled={loading}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search public tests"
                  value={query}
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-ink-fg/70">Token</span>
              <input
                className="workbook-input font-bold"
                disabled={loading || !selectedTestId}
                onChange={(event) => setTokenDraft(event.target.value)}
                placeholder="Giveaway token"
                value={tokenDraft}
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-ink-fg/70">Public Test</span>
            <Select disabled={loading || tests.length === 0} value={selectedTestId} onValueChange={handleSelectTest}>
              <SelectTrigger>
                <SelectValue placeholder={loading ? "Loading tests" : "Choose a test"} />
              </SelectTrigger>
              <SelectContent>
                {visibleOptions.map((test) => (
                  <SelectItem key={test.testId} value={test.testId}>
                    {test.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              className="workbook-button w-full sm:w-auto"
              disabled={loading || saving || !selectedTestId}
              onClick={handleSave}
              type="button"
            >
              <Save className="h-4 w-4" />
              {selectedTest?.requiresToken ? "Update Token" : "Require Token"}
            </button>
            <button
              className="workbook-button workbook-button-secondary w-full sm:w-auto"
              disabled={loading || saving || !selectedTest?.requiresToken || removingTestId === selectedTestId}
              onClick={() => selectedTestId && void handleRemove(selectedTestId)}
              type="button"
            >
              <UnlockKeyhole className="h-4 w-4" />
              Remove Token
            </button>
          </div>

          {error ? <div className="rounded-2xl border-2 border-ink-fg bg-accent-3 px-4 py-3 text-sm font-bold text-white">{error}</div> : null}
          {notice ? <div className="rounded-2xl border-2 border-ink-fg bg-primary px-4 py-3 text-sm font-bold text-ink-fg">{notice}</div> : null}
        </div>

        <div className="rounded-2xl border-2 border-ink-fg bg-surface-white brutal-shadow-sm">
          <div className="border-b-4 border-ink-fg bg-paper-bg px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-ink-fg/75">
            Currently Locked
          </div>
          <div className="max-h-[24rem] overflow-y-auto workbook-scrollbar">
            {loading ? (
              <div className="px-4 py-8 text-center text-sm font-bold text-ink-fg/70">Loading token locks</div>
            ) : lockedTests.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm font-bold text-ink-fg/70">No tests require a token.</div>
            ) : (
              <div className="divide-y-2 divide-ink-fg/15">
                {lockedTests.map((test) => (
                  <article key={test.testId} className="grid gap-3 px-4 py-3">
                    <button
                      className="min-w-0 text-left"
                      onClick={() => handleSelectTest(test.testId)}
                      type="button"
                    >
                      <div className="truncate text-sm font-black text-ink-fg">{test.title}</div>
                      <div className="mt-1 text-xs font-semibold text-ink-fg/65">Updated {formatDate(test.lockUpdatedAt)}</div>
                    </button>
                    <div className="flex items-center gap-2">
                      <code className="min-w-0 flex-1 truncate rounded-xl border-2 border-ink-fg bg-paper-bg px-3 py-2 text-xs font-black text-ink-fg">
                        {test.token}
                      </code>
                      <button
                        aria-label={`Remove token from ${test.title}`}
                        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-ink-fg bg-accent-3 text-white brutal-shadow-sm transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                        disabled={removingTestId === test.testId}
                        onClick={() => void handleRemove(test.testId)}
                        type="button"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
