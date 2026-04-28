"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIntentPrefetch } from "@/hooks/useIntentPrefetch";

type LibrarySelectOption = {
  value: string;
  label: string;
};

type LibrarySelectProps = {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: LibrarySelectOption[];
  placeholder?: string;
  className?: string;
  intentKeyPrefix?: string;
  onIntentPrefetch?: (value: string) => Promise<void> | void;
};

export function LibrarySelect({
  id,
  value,
  onValueChange,
  options,
  placeholder,
  className,
  intentKeyPrefix,
  onIntentPrefetch,
}: LibrarySelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger id={id} className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <IntentSelectItem
            key={option.value}
            option={option}
            active={value === option.value}
            intentKeyPrefix={intentKeyPrefix}
            onIntentPrefetch={onIntentPrefetch}
          />
        ))}
      </SelectContent>
    </Select>
  );
}

function IntentSelectItem({
  option,
  active,
  intentKeyPrefix,
  onIntentPrefetch,
}: {
  option: LibrarySelectOption;
  active: boolean;
  intentKeyPrefix?: string;
  onIntentPrefetch?: (value: string) => Promise<void> | void;
}) {
  const intentHandlers = useIntentPrefetch<HTMLDivElement>({
    key: `${intentKeyPrefix ?? "library-select"}:${option.value}`,
    enabled: !active && Boolean(onIntentPrefetch),
    onPrefetch: () => onIntentPrefetch?.(option.value),
  });

  return (
    <SelectItem value={option.value} {...intentHandlers}>
      {option.label}
    </SelectItem>
  );
}
