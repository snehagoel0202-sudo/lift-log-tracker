export type ParsedSet = {
  exercise_name: string;
  set_number: number | null;
  weight: number | null;
  unit: string | null;
  reps: number | null;
  rpe: number | null;
};

export class ParseUnavailableError extends Error {}
export class ParseUnreadableError extends Error {}

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["sets"],
  properties: {
    sets: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["exercise_name", "set_number", "weight", "unit", "reps", "rpe"],
        properties: {
          exercise_name: { type: "string" },
          set_number: { type: ["integer", "null"] },
          weight: { type: ["number", "null"] },
          unit: { type: ["string", "null"] },
          reps: { type: ["integer", "null"] },
          rpe: { type: ["number", "null"] },
        },
      },
    },
  },
} as const;

const INSTRUCTIONS = [
  "You convert a person's free-text or dictated description of a finished workout into JSON only.",
  "The message is conversational and may start with chatter like 'hi I want to record my workout' or 'today I did'. Ignore everything that is not an exercise, a count, a weight or an RPE.",
  "Output one object per individual set. '3 sets of 8' means three objects with set_number 1, 2, 3.",
  "A count stated once for a group applies to every exercise in that group: 'squats, lunges and bicep curls, 3 sets of each' means 3 sets for squats, 3 for lunges and 3 for bicep curls.",
  "Exercises may be listed with 'and', commas, or 'along with'. Treat each listed exercise separately, keeping the order mentioned.",
  "Dictation mishears words. Copy the exercise words exactly as written, even if they look wrong ('dumbbell just press', 'bicep curves'); matching happens later. Never replace an exercise with a different one and never add exercises that were not mentioned.",
  "The text comes from phone dictation, which often merges a spoken list of rep counts into one number with a thousands separator or no space. '1,010 and 8' means the sets 10, 10 and 8. '1,088' means 10, 8, 8. '810' means 8 and 10.",
  "Reps per set are realistically 1 to 50. If a rep number is above 50, it is a merged list: split it into the separate rep counts, one set each, never output it as a single set.",
  "A weight may legitimately be large (e.g. 100 kg), so only apply the splitting rule to rep counts.",
  "NEVER invent or guess a value. If the person did not say a weight, reps, RPE or unit, use null for it. A message with no weights at all is normal: output the sets with weight null.",
  "Keep the unit exactly as said ('kg' or 'lb'). Never convert between units. If no unit was said, unit is null.",
  "exercise_name is the exercise words the person used, nothing added.",
  "Do not give advice, do not diagnose anything, output JSON only.",
].join(" ");

const CORRECTION_INSTRUCTIONS = [
  "You are updating an already-reviewed list of workout sets using a short correction from the person.",
  "You get the current list of sets as JSON and a correction in plain words (e.g. 'set 3 was 6 reps', 'squats were 70 kg', 'drop the last set', 'add one more set of lunges').",
  "The correction overrides ONLY what it explicitly mentions. Every other value in every other set must be returned exactly as given, unchanged.",
  "Return the complete updated list of sets, one object per set, in the same order, keeping set_number sequential per exercise.",
  "Never invent or guess values. Fields that are null stay null unless the correction states them. Keep units exactly as given and never convert between kg and lb.",
  "Keep exercise_name strings exactly as given unless the correction renames an exercise.",
  "If the correction removes sets, omit them. If it adds sets, add them with only the values stated and null elsewhere.",
  "Do not give advice, output JSON only.",
].join(" ");

type AiInput = { role: "developer" | "user"; content: { type: "input_text"; text: string }[] };

async function callParser(input: AiInput[]): Promise<ParsedSet[]> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new ParseUnavailableError("Missing LOVABLE_API_KEY");

  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 30_000);

  let response: Response;
  try {
    response = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        store: false,
        reasoning: { effort: "low", summary: "auto" },
        input,
        text: {
          format: { type: "json_schema", name: "workout_log", strict: true, schema: SCHEMA },
        },
      }),
      signal: abort.signal,
    });
  } catch (error) {
    clearTimeout(timer);
    console.error("[log] AI parse request failed", error);
    throw new ParseUnavailableError("AI request failed");
  }


  if (!response.ok || !response.body) {
    clearTimeout(timer);
    console.error("[log] AI parse failed", response.status, await response.text());
    throw new ParseUnavailableError(`AI request failed (${response.status})`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let out = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (!data || data === "[DONE]") continue;
        try {
          const event = JSON.parse(data) as { type?: string; delta?: string };
          if (event.type === "response.output_text.delta" && typeof event.delta === "string") {
            out += event.delta;
          }
        } catch {
          // keep-alive / partial frame
        }
      }
    }
  } catch (error) {
    console.error("[log] AI parse stream aborted", error);
    throw new ParseUnavailableError("AI stream failed");
  } finally {
    clearTimeout(timer);
  }

  let parsed: { sets?: unknown };
  try {
    parsed = JSON.parse(out) as { sets?: unknown };
  } catch {
    throw new ParseUnreadableError("Not valid JSON");
  }
  if (!Array.isArray(parsed.sets) || parsed.sets.length === 0) {
    throw new ParseUnreadableError("No sets found");
  }

  const num = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : null);
  const sets: ParsedSet[] = [];
  for (const raw of parsed.sets) {
    if (!raw || typeof raw !== "object") continue;
    const entry = raw as Record<string, unknown>;
    const name = typeof entry["exercise_name"] === "string" ? entry["exercise_name"].trim() : "";
    if (!name) continue;
    const unit = typeof entry["unit"] === "string" && entry["unit"].trim() ? entry["unit"].trim() : null;
    const setNumber = num(entry["set_number"]);
    sets.push({
      exercise_name: name,
      set_number: setNumber == null ? null : Math.trunc(setNumber),
      weight: num(entry["weight"]),
      unit,
      reps: (() => {
        const reps = num(entry["reps"]);
        return reps == null ? null : Math.trunc(reps);
      })(),
      rpe: num(entry["rpe"]),
    });
  }
  if (!sets.length) throw new ParseUnreadableError("No usable sets");
  return sets;
}
