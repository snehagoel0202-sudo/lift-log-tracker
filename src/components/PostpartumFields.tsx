import { ChoiceList } from "@/components/ChoiceList";
import { localDateString } from "@/lib/checkins";
import { BIRTH_TYPES, type BirthType, type Profile } from "@/lib/profile";

export type PostpartumAnswers = {
  postpartum: boolean | null;
  weeks: string;
  birth_type: BirthType | null;
  cleared: boolean | null;
};

export const EMPTY_POSTPARTUM: PostpartumAnswers = {
  postpartum: null,
  weeks: "",
  birth_type: null,
  cleared: null,
};

export function answersFromProfile(profile: Profile | null): PostpartumAnswers {
  if (!profile?.postpartum) return { ...EMPTY_POSTPARTUM, postpartum: false };
  return {
    postpartum: true,
    weeks:
      profile.postpartum_weeks_since_birth == null
        ? ""
        : String(profile.postpartum_weeks_since_birth),
    birth_type: profile.postpartum_birth_type,
    cleared: profile.postpartum_cleared,
  };
}

/** Columns to save. Keeps existing dates unless the answer actually changed. */
export function postpartumColumns(answers: PostpartumAnswers, previous: Profile | null) {
  const today = localDateString();
  if (!answers.postpartum) {
    return {
      postpartum: false,
      postpartum_weeks_since_birth: null,
      postpartum_weeks_recorded_on: null,
      postpartum_birth_type: null,
      postpartum_cleared: null,
      postpartum_cleared_on: null,
    };
  }
  const parsed = answers.weeks.trim() === "" ? null : Math.round(Number(answers.weeks));
  const weeks = parsed != null && Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  const weeksUnchanged =
    previous?.postpartum && previous.postpartum_weeks_since_birth === weeks;
  const wasCleared = previous?.postpartum && previous.postpartum_cleared === true;
  return {
    postpartum: true,
    postpartum_weeks_since_birth: weeks,
    postpartum_weeks_recorded_on:
      weeks == null ? null : weeksUnchanged ? previous!.postpartum_weeks_recorded_on : today,
    postpartum_birth_type: answers.birth_type,
    postpartum_cleared: answers.cleared,
    postpartum_cleared_on:
      answers.cleared === true ? (wasCleared ? previous!.postpartum_cleared_on ?? today : today) : null,
  };
}

export function PostpartumFields({
  value,
  onChange,
}: {
  value: PostpartumAnswers;
  onChange: (next: PostpartumAnswers) => void;
}) {
  return (
    <div className="space-y-5">
      <ChoiceList
        options={[
          { value: "no", label: "No" },
          { value: "yes", label: "Yes" },
        ]}
        value={value.postpartum == null ? null : value.postpartum ? "yes" : "no"}
        onSelect={(v) => onChange({ ...value, postpartum: v === "yes" })}
      />
      {value.postpartum ? (
        <>
          <div>
            <label htmlFor="pp-weeks" className="text-sm font-semibold text-foreground">
              Weeks since birth
            </label>
            <input
              id="pp-weeks"
              type="number"
              inputMode="numeric"
              min={0}
              max={520}
              value={value.weeks}
              onChange={(e) => onChange({ ...value, weeks: e.target.value })}
              placeholder="e.g. 10"
              className="mt-2 min-h-14 w-full rounded-2xl border border-border bg-card px-5 text-lg text-foreground outline-none focus:border-primary"
            />
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold text-foreground">Birth type</p>
            <ChoiceList
              options={BIRTH_TYPES}
              value={value.birth_type}
              onSelect={(birth_type) => onChange({ ...value, birth_type })}
            />
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold text-foreground">
              Has a doctor or physio cleared you for exercise?
            </p>
            <ChoiceList
              options={[
                { value: "yes", label: "Yes" },
                { value: "no", label: "Not yet" },
              ]}
              value={value.cleared == null ? null : value.cleared ? "yes" : "no"}
              onSelect={(v) => onChange({ ...value, cleared: v === "yes" })}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
