"use client";

import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";

export type TextAnnotation = {
  id: string;
  start: number;
  end: number;
  color: string | null;
  underline: boolean;
};

type PendingSelection = {
  start: number;
  end: number;
};

type ToolbarState = {
  top: number;
  left: number;
  activeAnnotationId: string | null;
  pendingSelection: PendingSelection | null;
};

interface SelectableTextPanelProps {
  annotations: TextAnnotation[];
  onChange: (annotations: TextAnnotation[]) => void;
  className?: string;
  children: ReactNode;
}

const HIGHLIGHT_COLORS = [
  { id: "yellow", value: "#fff3bf", label: "Yellow" },
  { id: "blue", value: "#dbeafe", label: "Blue" },
  { id: "pink", value: "#fce7f3", label: "Pink" },
] as const;

export default function SelectableTextPanel({
  annotations,
  onChange,
  className,
  children,
}: SelectableTextPanelProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const nextAnnotationIdRef = useRef(0);
  const [toolbar, setToolbar] = useState<ToolbarState | null>(null);
  const pendingSelection = toolbar?.pendingSelection ?? null;

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }

    unwrapAnnotations(root);

    const ordered = [...annotations].sort((left, right) => left.start - right.start);
    ordered.forEach((annotation) => {
      applyAnnotation(root, annotation);
    });

    if (pendingSelection) {
      applyPendingSelection(root, pendingSelection);
    }
  });

  useEffect(() => {
    if (!toolbar) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest("[data-annotation-toolbar]") || target.closest("[data-text-annotation-id]")) {
        return;
      }

      setToolbar(null);
      clearSelection();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setToolbar(null);
        clearSelection();
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [toolbar]);

  const openToolbarForSelection = () => {
    window.setTimeout(() => {
      const selection = window.getSelection();
      const root = rootRef.current;
      if (!selection || !root || selection.rangeCount === 0 || selection.isCollapsed) {
        return;
      }

      const range = selection.getRangeAt(0);
      if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) {
        return;
      }

      const clonedContents = range.cloneContents();
      if (clonedContents.querySelector?.("[data-text-annotation-id]")) {
        clearSelection();
        return;
      }

      const selectedText = selection.toString();
      if (!selectedText.trim()) {
        return;
      }

      const start = getTextOffset(root, range.startContainer, range.startOffset);
      const end = getTextOffset(root, range.endContainer, range.endOffset);
      if (start === end) {
        return;
      }

      const rect = range.getBoundingClientRect();
      setToolbar({
        top: Math.max(16, rect.top - 14),
        left: rect.left + rect.width / 2,
        activeAnnotationId: null,
        pendingSelection: { start, end },
      });
    }, 0);
  };

  const openToolbarForAnnotation = (element: HTMLElement, annotationId: string) => {
    const rect = element.getBoundingClientRect();
    clearSelection();

    setToolbar({
      top: Math.max(16, rect.top - 14),
      left: rect.left + rect.width / 2,
      activeAnnotationId: annotationId,
      pendingSelection: null,
    });
  };

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const annotationElement = target.closest("[data-text-annotation-id]") as HTMLElement | null;
    if (!annotationElement) {
      return;
    }

    const annotationId = annotationElement.dataset.textAnnotationId;
    if (!annotationId) {
      return;
    }

    openToolbarForAnnotation(annotationElement, annotationId);
  };

  const upsertAnnotation = (payload: { color?: string | null; underline?: boolean }) => {
    if (!toolbar) {
      return;
    }

    if (toolbar.activeAnnotationId) {
      onChange(
        annotations.map((annotation) =>
          annotation.id === toolbar.activeAnnotationId
            ? {
                ...annotation,
                color: payload.color === undefined ? annotation.color : payload.color,
                underline: payload.underline === undefined ? annotation.underline : payload.underline,
              }
            : annotation,
        ),
      );
      setToolbar((current) => (current ? { ...current } : current));
      clearSelection();
      return;
    }

    if (!toolbar.pendingSelection) {
      return;
    }

    const { start, end } = toolbar.pendingSelection;
    const nextAnnotation: TextAnnotation = {
      id: `annotation-${nextAnnotationIdRef.current++}`,
      start,
      end,
      color: payload.color ?? null,
      underline: payload.underline ?? false,
    };

    onChange([...annotations, nextAnnotation]);
    setToolbar({
      ...toolbar,
      activeAnnotationId: nextAnnotation.id,
      pendingSelection: null,
    });
    clearSelection();
  };

  const removeActiveAnnotation = () => {
    if (!toolbar?.activeAnnotationId) {
      return;
    }

    onChange(annotations.filter((annotation) => annotation.id !== toolbar.activeAnnotationId));
    setToolbar(null);
    clearSelection();
  };

  const activeAnnotation = toolbar?.activeAnnotationId
    ? annotations.find((annotation) => annotation.id === toolbar.activeAnnotationId) ?? null
    : null;

  return (
    <>
      <div ref={rootRef} className={className} onMouseUp={openToolbarForSelection} onClick={handleClick}>
        {children}
      </div>

      {toolbar ? (
        <div
          data-annotation-toolbar
          className="fixed z-[100] flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-2 shadow-[0_14px_34px_rgba(15,23,42,0.16)]"
          style={{
            top: toolbar.top,
            left: toolbar.left,
            transform: "translate(-50%, -100%)",
          }}
        >
          {HIGHLIGHT_COLORS.map((color) => {
            const isActive = activeAnnotation?.color === color.value;

            return (
              <button
                key={color.id}
                type="button"
                title={`Highlight ${color.label}`}
                aria-label={`Highlight ${color.label}`}
                onClick={() => upsertAnnotation({ color: color.value })}
                className={`h-10 w-10 rounded-full border transition-transform hover:scale-105 ${
                  isActive ? "border-slate-700 ring-2 ring-slate-300" : "border-slate-300"
                }`}
                style={{ backgroundColor: color.value }}
              />
            );
          })}

          <button
            type="button"
            title="Underline"
            aria-label="Underline"
            onClick={() => upsertAnnotation({ underline: !(activeAnnotation?.underline ?? false) || !activeAnnotation })}
            className={`flex h-10 w-10 items-center justify-center rounded-full border text-slate-700 transition-colors hover:bg-slate-100 ${
              activeAnnotation?.underline ? "border-slate-700 bg-slate-100" : "border-slate-300"
            }`}
          >
            <UnderlineIcon />
          </button>

          <button
            type="button"
            title="Remove annotation"
            aria-label="Remove annotation"
            onClick={removeActiveAnnotation}
            disabled={!activeAnnotation}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <TrashIcon />
          </button>
        </div>
      ) : null}
    </>
  );
}

function applyAnnotation(root: HTMLElement, annotation: TextAnnotation) {
  const range = createRangeFromOffsets(root, annotation.start, annotation.end);
  if (!range) {
    return;
  }

  const wrapper = document.createElement("span");
  wrapper.dataset.textAnnotationId = annotation.id;
  wrapper.dataset.annotationColor = annotation.color ?? "";
  wrapper.dataset.annotationUnderline = annotation.underline ? "true" : "false";
  wrapper.style.backgroundColor = annotation.color ?? "transparent";
  wrapper.style.textDecorationLine = annotation.underline ? "underline" : "none";
  wrapper.style.textDecorationStyle = annotation.underline ? "dotted" : "solid";
  wrapper.style.textDecorationThickness = annotation.underline ? "2px" : "initial";
  wrapper.style.textUnderlineOffset = annotation.underline ? "0.24em" : "initial";
  wrapper.style.textDecorationColor = annotation.underline ? "#475569" : "transparent";
  wrapper.style.boxDecorationBreak = "clone";
  wrapper.style.setProperty("-webkit-box-decoration-break", "clone");
  wrapper.style.cursor = "pointer";
  wrapper.style.borderRadius = "2px";
  wrapper.style.transition = "filter 120ms ease, background-color 120ms ease, text-decoration-color 120ms ease";

  wrapper.addEventListener("mouseenter", () => {
    wrapper.style.filter = "brightness(0.94)";
    if (annotation.underline) {
      wrapper.style.textDecorationColor = "#0f172a";
    }
  });

  wrapper.addEventListener("mouseleave", () => {
    wrapper.style.filter = "brightness(1)";
    if (annotation.underline) {
      wrapper.style.textDecorationColor = "#475569";
    }
  });

  const fragment = range.extractContents();
  wrapper.appendChild(fragment);
  range.insertNode(wrapper);
}

function applyPendingSelection(root: HTMLElement, pendingSelection: PendingSelection) {
  const range = createRangeFromOffsets(root, pendingSelection.start, pendingSelection.end);
  if (!range) {
    return;
  }

  const wrapper = document.createElement("span");
  wrapper.dataset.pendingSelection = "true";
  wrapper.style.backgroundColor = "#fde68a";
  wrapper.style.boxDecorationBreak = "clone";
  wrapper.style.setProperty("-webkit-box-decoration-break", "clone");
  wrapper.style.borderRadius = "2px";
  wrapper.style.opacity = "0.95";

  const fragment = range.extractContents();
  wrapper.appendChild(fragment);
  range.insertNode(wrapper);
}

function unwrapAnnotations(root: HTMLElement) {
  const wrappers = Array.from(root.querySelectorAll("[data-text-annotation-id], [data-pending-selection]"));
  wrappers.forEach((wrapper) => {
    const parent = wrapper.parentNode;
    if (!parent) {
      return;
    }

    while (wrapper.firstChild) {
      parent.insertBefore(wrapper.firstChild, wrapper);
    }

    parent.removeChild(wrapper);
  });
}

function createRangeFromOffsets(root: HTMLElement, start: number, end: number) {
  if (start >= end) {
    return null;
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let currentNode: Text | null = null;
  let currentOffset = 0;
  let startNode: Text | null = null;
  let endNode: Text | null = null;
  let startOffset = 0;
  let endOffset = 0;

  while ((currentNode = walker.nextNode() as Text | null)) {
    const nextOffset = currentOffset + currentNode.data.length;

    if (!startNode && start >= currentOffset && start <= nextOffset) {
      startNode = currentNode;
      startOffset = start - currentOffset;
    }

    if (!endNode && end >= currentOffset && end <= nextOffset) {
      endNode = currentNode;
      endOffset = end - currentOffset;
      break;
    }

    currentOffset = nextOffset;
  }

  if (!startNode || !endNode) {
    return null;
  }

  const range = document.createRange();
  range.setStart(startNode, startOffset);
  range.setEnd(endNode, endOffset);
  return range;
}

function getTextOffset(root: HTMLElement, container: Node, offset: number) {
  const range = document.createRange();
  range.selectNodeContents(root);
  range.setEnd(container, offset);
  return range.toString().length;
}

function clearSelection() {
  const selection = window.getSelection();
  selection?.removeAllRanges();
}

function UnderlineIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M6 4V9C6 11.2091 7.79086 13 10 13C12.2091 13 14 11.2091 14 9V4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M5 16H15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="1 2.6" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3.75 5.5H16.25" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M8 3.75H12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M6 5.5V14.25C6 15.2165 6.7835 16 7.75 16H12.25C13.2165 16 14 15.2165 14 14.25V5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.25 8.25V12.75" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M11.75 8.25V12.75" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
