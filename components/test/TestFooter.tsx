"use client";

import { useState } from "react";
import { Bookmark, ChevronDown, MapPin, X } from "lucide-react";

interface TestFooterProps {
    moduleName?: string;
    currentIndex: number;
    totalQuestions: number;
    onNext: () => void;
    onPrev: () => void;
    onJump: (index: number) => void;
    answers: Record<string, string>;
    flagged: Record<string, boolean>;
    questions: Array<{ _id: string }>;
}

export default function TestFooter({
    moduleName,
    currentIndex,
    totalQuestions,
    onNext,
    onPrev,
    onJump,
    answers,
    flagged,
    questions
}: TestFooterProps) {
    const [isGridOpen, setIsGridOpen] = useState(false);
    const headerTitle = moduleName ?? "Question Navigator";
    const displayName = typeof window === "undefined"
        ? "Practice Test"
        : sessionStorage.getItem("testName") || "Practice Test";

    return (
        <>
            {isGridOpen && (
                <>
                    <div
                        className="fixed inset-0 z-30 bg-black/5"
                        onClick={() => setIsGridOpen(false)}
                    />

                    <div className="fixed bottom-[78px] left-1/2 z-40 w-[min(92vw,595px)] -translate-x-1/2 rounded-[14px] border border-slate-200 bg-white px-6 pb-7 pt-5 shadow-[0_10px_28px_rgba(15,23,42,0.18)] transition-all animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
                            <div className="w-8 shrink-0" />
                            <h3 className="flex-1 text-center text-[18px] font-semibold leading-[1.15] text-[#0f172a] sm:text-[19px]">
                                {headerTitle}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setIsGridOpen(false)}
                                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                                aria-label="Close question navigator"
                            >
                                <X className="h-4 w-4" strokeWidth={2} />
                            </button>
                        </div>

                        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-b border-slate-200 py-3 text-[12px] font-medium text-slate-700">
                            <div className="flex items-center gap-1.5">
                                <MapPin className="h-4 w-4 text-slate-700" strokeWidth={2} />
                                <span>Current</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="h-4 w-4 border border-dashed border-slate-500 bg-white" />
                                <span>Unanswered</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Bookmark className="h-3 w-3 fill-[#d9485f] text-[#d9485f]" strokeWidth={1.9} />
                                <span>For Review</span>
                            </div>
                        </div>

                        <div className="mx-auto mt-4 flex max-h-[196px] w-full max-w-[500px] flex-wrap justify-start gap-x-[14px] gap-y-[18px] overflow-y-auto px-1 pb-1 pt-5">                            {questions.map((q, i) => {
                                const isAnswered = !!answers[q._id];
                                const isFlagged = !!flagged[q._id];
                                const isCurrent = i === currentIndex;

                                return (
                                    <button
                                        key={q._id}
                                        type="button"
                                        onClick={() => {
                                            onJump(i);
                                            setIsGridOpen(false);
                                        }}
                                        className={`relative flex h-[30px] w-[30px] shrink-0 items-center justify-center overflow-visible text-[14px] font-semibold transition-all ${
                                            isAnswered
                                                ? "border border-[#3557d6] bg-[#3557d6] text-white shadow-[0_0_0_1px_rgba(53,87,214,0.12)]"
                                                : "border border-dashed border-slate-500 bg-white text-[#3557d6] hover:border-slate-700"
                                        }`}
                                        aria-label={`Jump to question ${i + 1}`}
                                    >
                                        {isCurrent ? (
                                            <MapPin className="pointer-events-none absolute -top-[15px] left-1/2 h-4 w-4 -translate-x-1/2 text-slate-700" strokeWidth={2} />
                                        ) : null}
                                        <span>{i + 1}</span>
                                        {isFlagged ? (
                                            <div className="pointer-events-none absolute -right-[3px] -top-[6px]">
                                                <Bookmark className="h-3 w-3 fill-[#d9485f] text-[#d9485f] drop-shadow-[0_1px_1px_rgba(255,255,255,0.7)]" strokeWidth={1.9} />
                                            </div>
                                        ) : null}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="mt-6 flex justify-center">
                            <button
                                type="button"
                                onClick={() => setIsGridOpen(false)}
                                className="rounded-full border border-[#5d7cff] px-6 py-2 text-sm font-semibold text-[#3557d6] transition hover:bg-[#eef2ff]"
                            >
                                Go to Review Page
                            </button>
                        </div>

                        <div className="absolute -bottom-[9px] left-1/2 h-[18px] w-[18px] -translate-x-1/2 rotate-45 border-b border-r border-slate-200 bg-white" />
                    </div>
                </>
            )}

            <footer className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-between border-t border-slate-300 bg-[#ebf0f7] px-6">
                <div
                    className="absolute left-0 top-0 h-[2px] w-full"
                    style={{ backgroundImage: "repeating-linear-gradient(to right, #2d3642 0, #1c2128 19px, transparent 19px, transparent 20px)" }}
                />

                <div className="flex-1">
                    <span suppressHydrationWarning className="text-sm font-semibold text-slate-800 sm:text-base">
                        {displayName}
                    </span>
                </div>

                <div className="flex flex-1 items-center justify-center">
                    <button
                        type="button"
                        onClick={() => setIsGridOpen(!isGridOpen)}
                        className="flex items-center rounded-md bg-[#1a1c23] px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-black"
                    >
                        <span>Question {currentIndex + 1} of {totalQuestions}</span>
                        <ChevronDown className={`ml-2 inline-block h-4 w-4 transition-transform ${isGridOpen ? "rotate-180" : ""}`} />
                    </button>
                </div>

                <div className="flex flex-1 items-center justify-end gap-3">
                    {currentIndex > 0 && (
                        <button
                            type="button"
                            onClick={onPrev}
                            className="rounded-full bg-[#3b5bd9] px-6 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[#2e4bb5]"
                        >
                            Back
                        </button>
                    )}

                    {currentIndex < totalQuestions - 1 && (
                        <button
                            type="button"
                            onClick={onNext}
                            className="rounded-full bg-[#3b5bd9] px-6 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[#2e4bb5]"
                        >
                            Next
                        </button>
                    )}
                </div>
            </footer>
        </>
    );
}
