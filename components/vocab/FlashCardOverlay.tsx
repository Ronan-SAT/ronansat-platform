"use client";

import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { playVocabPronunciation } from "@/components/vocab/pronunciation";

type FlashCardOverlayProps = {
  title: string;
  currentIndex: number;
  total: number;
  vocabulary: string;
  meaning: string;
  audioUrl?: string;
  audioQueue: Array<{ vocabulary: string; audioUrl?: string }>;
  isAnswerVisible: boolean;
  onToggleAnswer: () => void;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
};

export function FlashCardOverlay({
  title,
  currentIndex,
  total,
  vocabulary,
  meaning,
  audioUrl,
  audioQueue,
  isAnswerVisible,
  onToggleAnswer,
  onClose,
  onPrevious,
  onNext,
}: FlashCardOverlayProps) {
  const prefetchedAudioRef = useRef<Set<string>>(new Set());
  const resolvedMeaning = meaning || "No definition yet. Fetch one from the dictionary or write your own note.";
  const cardHeightClass =
    resolvedMeaning.length > 420
      ? "min-h-[640px]"
      : resolvedMeaning.length > 240
        ? "min-h-[520px]"
        : "min-h-[400px]";

  useEffect(() => {
    if (!isAnswerVisible) {
      return;
    }

    playVocabPronunciation(vocabulary, audioUrl);
  }, [audioUrl, currentIndex, isAnswerVisible, vocabulary]);

  useEffect(() => {
    if (typeof Audio === "undefined") {
      return;
    }

    audioQueue.slice(currentIndex, currentIndex + 10).forEach((card) => {
      if (!card.audioUrl || prefetchedAudioRef.current.has(card.audioUrl)) {
        return;
      }

      prefetchedAudioRef.current.add(card.audioUrl);
      const audio = new Audio();
      audio.preload = "auto";
      audio.src = card.audioUrl;
      audio.load();
    });
  }, [audioQueue, currentIndex]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) {
        return;
      }

      if (event.key === " ") {
        event.preventDefault();
        onToggleAnswer();
        return;
      }

      if (event.key === "ArrowLeft" && currentIndex > 0) {
        event.preventDefault();
        onPrevious();
        return;
      }

      if (event.key === "ArrowRight" && currentIndex < total - 1) {
        event.preventDefault();
        onNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, onNext, onPrevious, onToggleAnswer, total]);

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-paper-bg bg-dot-pattern px-4 py-5 sm:px-6 lg:px-10">
      <div className="absolute inset-0 bg-paper-bg/35" aria-hidden="true" />

      <div className="relative mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-5xl flex-col pb-28">
      <div className="flex w-full items-start justify-between gap-4 rounded-[28px] border-4 border-ink-fg bg-surface-white px-5 py-4 brutal-shadow lg:px-6">
        <div>
          <div className="workbook-sticker bg-accent-1 text-ink-fg">Flashcard</div>
          <div className="mt-3 text-[12px] font-semibold uppercase tracking-[0.16em] text-ink-fg/70">{title}</div>
          <div className="mt-1 text-[20px] font-black tracking-[-0.03em] text-ink-fg">
            Card {currentIndex + 1} / {total}
          </div>
        </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-ink-fg bg-surface-white text-ink-fg brutal-shadow-sm outline-none transition workbook-press focus:outline-none focus-visible:outline-none"
            aria-label="Close flash card"
          >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="mx-auto flex w-full flex-1 flex-col items-center justify-center gap-8 py-6">
        <div className="w-full max-w-4xl [perspective:1200px]">
          <button
            type="button"
            onClick={onToggleAnswer}
            className={`block w-full rounded-[32px] text-center outline-none focus:outline-none focus-visible:outline-none ${cardHeightClass}`}
          >
            <div
              className={`relative w-full rounded-[32px] transition-transform duration-450 ease-[cubic-bezier(0.22,1,0.36,1)] [transform-style:preserve-3d] ${cardHeightClass}`}
              style={{ transform: isAnswerVisible ? "rotateY(180deg)" : "rotateY(0deg)" }}
            >
              <div className="absolute inset-0 flex items-center justify-center rounded-[32px] border-4 border-ink-fg bg-surface-white px-8 py-10 brutal-shadow-lg [backface-visibility:hidden]">
                <div className="w-full">
                  <div className="mb-5 text-[12px] font-semibold uppercase tracking-[0.18em] text-ink-fg/45">Vocabulary</div>
                  <div className="whitespace-pre-wrap break-words text-[clamp(2rem,4.2vw,4.5rem)] font-semibold tracking-[-0.05em] text-ink-fg">
                    {vocabulary}
                  </div>
                  <div className="mt-8 text-[12px] font-semibold uppercase tracking-[0.16em] text-ink-fg/60">Tap card or press space to flip</div>
                </div>
              </div>

              <div className="absolute inset-0 flex items-center justify-center rounded-[32px] border-4 border-ink-fg bg-surface-white px-6 py-8 brutal-shadow-lg [backface-visibility:hidden] [transform:rotateY(180deg)] sm:px-8 sm:py-10">
                <div className="mx-auto w-full max-w-3xl">
                  <div className="mb-5 text-[12px] font-semibold uppercase tracking-[0.18em] text-ink-fg/45">Definition</div>
                  <div
                    className={`whitespace-pre-wrap break-words text-center font-sans leading-7 text-ink-fg sm:leading-8 ${
                      !meaning
                        ? "text-base italic text-ink-fg/55 sm:text-lg"
                        : "text-[15px] font-medium sm:text-[17px]"
                    }`}
                  >
                    {resolvedMeaning}
                  </div>
                  <div className="mt-8 text-[12px] font-semibold uppercase tracking-[0.16em] text-ink-fg/60">Tap card or press space to flip</div>
                </div>
              </div>
            </div>
          </button>
        </div>

        <div className="fixed bottom-6 left-1/2 z-[110] flex -translate-x-1/2 items-center gap-4 rounded-full border-2 border-ink-fg bg-paper-bg px-4 py-3 brutal-shadow-sm">
          {currentIndex > 0 ? (
            <button
              type="button"
              onClick={onPrevious}
              className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-ink-fg bg-surface-white text-ink-fg brutal-shadow-sm outline-none transition workbook-press focus:outline-none focus-visible:outline-none"
              aria-label="Previous flash card"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          ) : (
            <div className="h-14 w-14" aria-hidden="true" />
          )}

          {currentIndex < total - 1 ? (
            <button
              type="button"
              onClick={onNext}
              className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-ink-fg bg-surface-white text-ink-fg brutal-shadow-sm outline-none transition workbook-press focus:outline-none focus-visible:outline-none"
              aria-label="Next flash card"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          ) : (
            <div className="h-14 w-14" aria-hidden="true" />
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
