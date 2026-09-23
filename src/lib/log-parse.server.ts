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
  "Output one object per individual set. '3 sets of 8' means three objects with set_number 1, 2, 3.",
  "NEVER invent or guess a value. If the person did not say a weight, reps, RPE or unit, use null for it.",
  "Keep the unit exactly as said ('kg' or 'lb'). Never convert between units. If no unit was said, unit is null.",
  "exercise_name is the exercise words the person used, nothing added.",
  "Do not give advice, do not diagnose anything, output JSON only.",
].join(" ");

/** Parse dictated/typed workout text into one object per set. AI writes no data itself. */
export async function parseWorkoutText(text: string): Promise<ParsedSet[]> {
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
        input: [
          { role: "developer", content: [{ type: "input_text", text: INSTRUCTIONS }] },
          { role: "user", content: [{ type: "input_text", text }] },
        ],
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
