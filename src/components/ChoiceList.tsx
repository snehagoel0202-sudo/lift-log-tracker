export function ChoiceList<T extends string | number>({
  options,
  value,
  onSelect,
}: {
  options: { value: T; label: string; hint?: string }[];
  value: T | null | undefined;
  onSelect: (value: T) => void;
}) {
  return (
    <div className="space-y-3">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            onClick={() => onSelect(option.value)}
            aria-pressed={active}
            className={`flex min-h-16 w-full flex-col justify-center rounded-2xl border px-5 py-3 text-left transition-colors ${
              active
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border bg-card text-foreground hover:border-primary/50"
            }`}
          >
            <span className="font-semibold">{option.label}</span>
            {option.hint ? (
              <span className="text-sm text-muted-foreground">{option.hint}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
