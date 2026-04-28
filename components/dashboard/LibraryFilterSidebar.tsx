"use client";

import { useIntentPrefetch } from "@/hooks/useIntentPrefetch";

type LibraryFilterSidebarProps = {
  title: string;
  accentClassName: string;
  options: string[];
  selectedValue: string;
  allLabel: string;
  onSelect: (value: string) => void;
  intentKeyPrefix?: string;
  onIntentPrefetch?: (value: string) => Promise<void> | void;
};

export function LibraryFilterSidebar({
  title,
  accentClassName,
  options,
  selectedValue,
  allLabel,
  onSelect,
  intentKeyPrefix,
  onIntentPrefetch,
}: LibraryFilterSidebarProps) {
  return (
    <aside className="workbook-panel self-start overflow-hidden">
      <div className="border-b-4 border-ink-fg bg-paper-bg px-5 py-4">
        <div className={`workbook-sticker ${accentClassName}`}>Filter Stack</div>
        <h2 className="mt-4 font-display text-2xl font-black uppercase tracking-tight text-ink-fg">{title}</h2>
      </div>

      <div className="workbook-scrollbar flex gap-3 overflow-x-auto p-4 lg:flex-col lg:overflow-visible">
        {options.map((option) => {
          const active = selectedValue === option;

          return (
            <LibraryFilterButton
              key={option}
              option={option}
              active={active}
              allLabel={allLabel}
              onSelect={onSelect}
              intentKeyPrefix={intentKeyPrefix}
              onIntentPrefetch={onIntentPrefetch}
              className={[
                "min-w-max shrink-0 rounded-2xl border-2 border-ink-fg px-4 py-3 text-left brutal-shadow-sm workbook-press sm:min-w-[11rem] lg:w-full lg:min-w-0 lg:flex-none",
                active ? `${accentClassName} font-bold` : "bg-surface-white text-ink-fg",
              ].join(" ")}
            />
          );
        })}
      </div>
    </aside>
  );
}

function LibraryFilterButton({
  option,
  active,
  allLabel,
  onSelect,
  intentKeyPrefix,
  onIntentPrefetch,
  className,
}: {
  option: string;
  active: boolean;
  allLabel: string;
  onSelect: (value: string) => void;
  intentKeyPrefix?: string;
  onIntentPrefetch?: (value: string) => Promise<void> | void;
  className: string;
}) {
  const intentHandlers = useIntentPrefetch<HTMLButtonElement>({
    key: `${intentKeyPrefix ?? "library-filter"}:${option}`,
    enabled: !active && Boolean(onIntentPrefetch),
    onPrefetch: () => onIntentPrefetch?.(option),
  });

  return (
    <button
      type="button"
      onClick={() => onSelect(option)}
      className={className}
      {...intentHandlers}
    >
      <span className="block text-xs font-bold uppercase tracking-[0.18em]">
        {option === "All" ? allLabel : option}
      </span>
    </button>
  );
}
