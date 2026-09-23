import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppScreen } from "@/components/AppScreen";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { localDateString } from "@/lib/checkins";
import { exercisesQueryOptions } from "@/lib/exercises";
import { reviewWorkoutText, saveLoggedWorkout, type ReviewResult } from "@/lib/log.functions";

export const Route = createFileRoute("/_authenticated/log")({
  head: () => ({
    meta: [
      { title: "Log — LiftLog" },
      { name: "description", content: "Type or dictate what you lifted and LiftLog logs every set." },
      { property: "og:title", content: "Log — LiftLog" },
      {
        property: "og:description",
        content: "Type or dictate what you lifted and LiftLog logs every set.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LogPage,
});

type Row = {
  exercise_name: string;
  exercise_id: string | null;
  set_number: number;
  weight: string;
  unit: "kg" | "lb";
  reps: string;
  rpe: string;
};

const inputClass =
  "h-12 w-full min-w-0 rounded-xl border border-border bg-background px-1.5 text-center text-base text-foreground";
const HINT =
  "Tap the mic on your keyboard and say what you did, e.g. 'Squats 60 kg 3 sets of 8, RPE 8'";

function LogPage() {
  const today = localDateString();
  const queryClient = useQueryClient();
  const exercisesQuery = useQuery(exercisesQueryOptions);
  const exercises = exercisesQuery.data ?? [];

  const [text, setText] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState<number | null>(null);

  const appendTranscript = useCallback((chunk: string) => {
    setText((current) => (current.trim() ? `${current.replace(/\s+$/, "")} ${chunk}` : chunk));
  }, []);
  const speech = useSpeechRecognition(appendTranscript);

  const review = useMutation({
    mutationFn: useServerFn(reviewWorkoutText),
    onMutate: () => {
      setError(null);
      setSavedCount(null);
    },
    onSuccess: (result: ReviewResult) => {
      if (!result.ok) {
        setError(
          result.reason === "unreadable"
            ? "I couldn't read that as a workout. Try rephrasing, e.g. \"Squats 60 kg 3 sets of 8, RPE 8\"."
            : "The review service isn't responding right now. Please try again in a moment.",
        );
        return;
      }
      setRows(
        result.rows.map((row) => ({
          exercise_name: row.exercise_name,
          exercise_id: row.exercise_id,
          set_number: row.set_number,
          weight: row.weight == null ? "" : String(row.weight),
          unit: row.unit ?? result.defaultUnit,
          reps: row.reps == null ? "" : String(row.reps),
          rpe: row.rpe == null ? "" : String(row.rpe),
        })),
      );
    },
    onError: () => setError("Something went wrong reading that. Please try again."),
  });

  const save = useMutation({
    mutationFn: useServerFn(saveLoggedWorkout),
    onSuccess: async (result: { saved: number }) => {
      setSavedCount(result.saved);
      setRows(null);
      setText("");
      await queryClient.invalidateQueries({ queryKey: ["plan-sessions"] });
    },
    onError: () => setError("Couldn't save those sets. Please try again."),
  });

  function update(index: number, patch: Partial<Row>) {
    setRows((current) =>
      current ? current.map((row, i) => (i === index ? { ...row, ...patch } : row)) : current,
    );
  }

  const unmatched = (rows ?? []).filter((row) => !row.exercise_id).length;

  function submitSave() {
    if (!rows) return;
    setError(null);
    save.mutate({
      data: {
        date: today,
        sets: rows.map((row) => ({
          exercise_id: row.exercise_id!,
          set_number: row.set_number,
          weight: row.weight.trim() === "" ? null : Number(row.weight),
          unit: row.unit,
          reps: row.reps.trim() === "" ? null : Math.trunc(Number(row.reps)),
          rpe: row.rpe.trim() === "" ? null : Number(row.rpe),
        })),
      },
    });
  }

  return (
    <AppScreen title="Log" subtitle="Type or dictate what you did — you review it before anything is saved.">
      {savedCount !== null ? (
        <div className="mb-5 rounded-2xl border border-primary/40 bg-primary/10 p-4 text-sm text-foreground">
          Saved {savedCount} {savedCount === 1 ? "set" : "sets"} to today's workout.
        </div>
      ) : null}

      {rows === null ? (
        <div className="space-y-4">
          {speech.supported ? (
            speech.listening ? (
              <div className="rounded-2xl border border-primary/50 bg-primary/10 p-4">
                <div className="flex items-center gap-3">
                  <span className="relative flex h-3 w-3 shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-primary" />
                  </span>
                  <span className="flex-1 text-sm font-semibold text-foreground">
                    Listening… speak your sets
                  </span>
                  <button
                    type="button"
                    onClick={speech.stop}
                    className="h-11 rounded-xl border border-primary bg-primary px-5 text-sm font-semibold text-primary-foreground"
                  >
                    Stop
                  </button>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {speech.interim
                    ? `${speech.interim}…`
                    : speech.heardSomething
                      ? "Got it — keep going, or tap Stop when you're done."
                      : "Waiting to hear you… speak now, then tap Stop."}
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => void speech.start()}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-primary/60 bg-primary/10 font-semibold text-foreground"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5 text-primary"
                  aria-hidden="true"
                >
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <path d="M12 19v3" />
                </svg>
                Tap to speak
              </button>
            )
          ) : null}
          {speech.error ? <p className="text-sm text-destructive">{speech.error}</p> : null}
          <textarea
            value={speech.listening && speech.interim ? `${text} ${speech.interim}`.trimStart() : text}
            onChange={(event) => setText(event.target.value)}
            placeholder={HINT}
            rows={6}
            className="w-full rounded-2xl border border-border bg-background p-4 text-base text-foreground placeholder:text-muted-foreground"
          />

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <button
            type="button"
            disabled={!text.trim() || review.isPending}
            onClick={() => review.mutate({ data: { text: text.trim() } })}
            className="h-12 w-full rounded-xl bg-primary font-semibold text-primary-foreground disabled:opacity-50"
          >
            {review.isPending ? "Reading your workout…" : "Review"}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border p-4">
            <p className="display-title text-xl text-foreground">REVIEW BEFORE SAVING</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Nothing is saved until you tap Save. Empty fields stay empty.
            </p>
          </div>

          {rows.map((row, index) => (
            <div key={index} className="space-y-3 rounded-2xl border border-border p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  Set {row.set_number}
                </span>
                {row.exercise_id ? null : (
                  <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-xs text-destructive">
                    Not in library
                  </span>
                )}
              </div>
              <label className="block">
                <span className="text-xs text-muted-foreground">
                  Exercise{row.exercise_id ? "" : ` — heard “${row.exercise_name}”`}
                </span>
                <select
                  value={row.exercise_id ?? ""}
                  onChange={(event) => update(index, { exercise_id: event.target.value || null })}
                  className="mt-1 h-12 w-full rounded-xl border border-border bg-background px-3 text-base text-foreground"
                >
                  <option value="">Pick an exercise…</option>
                  {exercises.map((exercise) => (
                    <option key={exercise.id} value={exercise.id}>
                      {exercise.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                <label className="block">
                  <span className="text-xs text-muted-foreground">Weight</span>
                  <input
                    inputMode="decimal"
                    value={row.weight}
                    onChange={(event) => update(index, { weight: event.target.value })}
                    className={`mt-1 ${inputClass}`}
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-muted-foreground">Unit</span>
                  <select
                    value={row.unit}
                    onChange={(event) => update(index, { unit: event.target.value as "kg" | "lb" })}
                    className={`mt-1 ${inputClass}`}
                  >
                    <option value="kg">kg</option>
                    <option value="lb">lb</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs text-muted-foreground">Reps</span>
                  <input
                    inputMode="numeric"
                    value={row.reps}
                    onChange={(event) => update(index, { reps: event.target.value })}
                    className={`mt-1 ${inputClass}`}
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-muted-foreground">RPE</span>
                  <input
                    inputMode="decimal"
                    value={row.rpe}
                    onChange={(event) => update(index, { rpe: event.target.value })}
                    className={`mt-1 ${inputClass}`}
                  />
                </label>
              </div>
            </div>
          ))}

          {unmatched > 0 ? (
            <p className="text-sm text-muted-foreground">
              Pick an exercise for {unmatched} {unmatched === 1 ? "set" : "sets"} before saving.
            </p>
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex gap-3">
            <button
              type="button"
              disabled={unmatched > 0 || save.isPending}
              onClick={submitSave}
              className="h-12 flex-1 rounded-xl bg-primary font-semibold text-primary-foreground disabled:opacity-50"
            >
              {save.isPending ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                setRows(null);
                setError(null);
              }}
              className="h-12 flex-1 rounded-xl border border-border font-semibold text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </AppScreen>
  );
}
