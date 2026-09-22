import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ENERGY_FACES,
  PAIN_NOTE,
  SCALE,
  SLEEP_FACES,
  SORENESS_FACES,
  checkinQueryOptions,
  localDateString,
  saveCheckin,
  type Checkin,
} from "@/lib/checkins";

function ScaleRow({
  label,
  faces,
  value,
  onSelect,
}: {
  label: string;
  faces: string[];
  value: number | null;
  onSelect: (value: number) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-foreground">{label}</p>
      <div className="flex gap-2" role="group" aria-label={label}>
        {SCALE.map((n) => {
          const active = value === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onSelect(n)}
              aria-pressed={active}
              aria-label={`${label}: ${n} of 5`}
              className={`flex min-h-14 flex-1 flex-col items-center justify-center rounded-xl border text-xl transition-colors ${
                active
                  ? "border-primary bg-primary/10"
                  : "border-border bg-background hover:border-primary/50"
              }`}
            >
              <span aria-hidden>{faces[n - 1]}</span>
              <span className="text-[10px] text-muted-foreground">{n}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function CheckinCard() {
  const date = localDateString();
  const queryClient = useQueryClient();
  const { data: checkin, isLoading } = useQuery(checkinQueryOptions(date));

  const [editing, setEditing] = useState(false);
  const [sleep, setSleep] = useState<number | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [soreness, setSoreness] = useState<number | null>(null);
  const [pain, setPain] = useState(false);
  const [painArea, setPainArea] = useState("");
  const [notes, setNotes] = useState("");

  function loadFrom(row: Checkin | null) {
    setSleep(row?.sleep ?? null);
    setEnergy(row?.energy ?? null);
    setSoreness(row?.soreness ?? null);
    setPain(row?.pain ?? false);
    setPainArea(row?.pain_area ?? "");
    setNotes(row?.notes ?? "");
  }

  useEffect(() => {
    if (checkin) loadFrom(checkin);
  }, [checkin]);

  const save = useMutation({
    mutationFn: () =>
      saveCheckin(date, {
        sleep,
        energy,
        soreness,
        pain,
        pain_area: pain && painArea.trim() ? painArea.trim() : null,
        notes: notes.trim() ? notes.trim() : null,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["checkin", date] });
      setEditing(false);
    },
  });

  if (isLoading) return null;

  const showForm = !checkin || editing;

  if (!showForm && checkin) {
    const parts = [
      checkin.sleep ? `Sleep ${checkin.sleep}/5` : null,
      checkin.energy ? `Energy ${checkin.energy}/5` : null,
      checkin.soreness ? `Soreness ${checkin.soreness}/5` : null,
      checkin.pain ? `Pain${checkin.pain_area ? ` · ${checkin.pain_area}` : ""}` : "No pain",
    ].filter(Boolean);

    return (
      <section className="mb-5 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-foreground">{parts.join(" · ")}</p>
          <button
            type="button"
            onClick={() => {
              loadFrom(checkin);
              setEditing(true);
            }}
            className="min-h-10 shrink-0 rounded-xl border border-border px-3 text-sm font-semibold text-foreground"
          >
            Edit
          </button>
        </div>
        {checkin.pain ? (
          <p className="mt-3 rounded-xl bg-primary/10 p-3 text-sm text-foreground">{PAIN_NOTE}</p>
        ) : null}
      </section>
    );
  }

  return (
    <section className="mb-5 space-y-4 rounded-2xl border border-border bg-card p-4">
      <div>
        <h2 className="font-semibold text-foreground">How are you today?</h2>
        <p className="text-sm text-muted-foreground">A few taps — it shapes today’s session.</p>
      </div>

      <ScaleRow label="Sleep" faces={SLEEP_FACES} value={sleep} onSelect={setSleep} />
      <ScaleRow label="Energy" faces={ENERGY_FACES} value={energy} onSelect={setEnergy} />
      <ScaleRow label="Soreness" faces={SORENESS_FACES} value={soreness} onSelect={setSoreness} />

      <div>
        <p className="mb-2 text-sm font-semibold text-foreground">Any pain?</p>
        <div className="flex gap-2">
          {[
            { label: "No", value: false },
            { label: "Yes", value: true },
          ].map((option) => (
            <button
              key={option.label}
              type="button"
              onClick={() => setPain(option.value)}
              aria-pressed={pain === option.value}
              className={`min-h-14 flex-1 rounded-xl border font-semibold transition-colors ${
                pain === option.value
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-background text-foreground hover:border-primary/50"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {pain ? (
        <div className="space-y-3">
          <input
            type="text"
            value={painArea}
            onChange={(event) => setPainArea(event.target.value)}
            placeholder="Where? (optional)"
            aria-label="Pain area"
            className="min-h-14 w-full rounded-xl border border-border bg-background px-4 text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
          <p className="rounded-xl bg-primary/10 p-3 text-sm text-foreground">{PAIN_NOTE}</p>
        </div>
      ) : null}

      <input
        type="text"
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        placeholder="Notes (optional)"
        aria-label="Check-in notes"
        className="min-h-14 w-full rounded-xl border border-border bg-background px-4 text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
      />

      <div className="flex gap-2">
        {checkin ? (
          <button
            type="button"
            onClick={() => {
              loadFrom(checkin);
              setEditing(false);
            }}
            className="min-h-12 flex-1 rounded-xl border border-border font-semibold text-foreground"
          >
            Cancel
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="min-h-12 flex-1 rounded-xl bg-primary font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-60"
        >
          {save.isPending ? "Saving…" : "Save check-in"}
        </button>
      </div>
      {save.isError ? (
        <p className="text-sm text-destructive">Couldn’t save your check-in. Try again.</p>
      ) : null}
    </section>
  );
}
