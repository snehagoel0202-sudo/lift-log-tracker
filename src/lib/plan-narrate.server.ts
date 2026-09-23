import type { PlanDraft } from "./plan-rules";

type Narration = { summary: string; rationales: Record<string, string> };

/**
 * Stage 2: the AI only writes words. It never sees a chance to change sets,
 * reps, weights or exercises — those are already fixed by the rules, and we
 * only merge back the text fields.
 */
export async function narratePlan(draft: PlanDraft): Promise<Narration | null> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) return null;

  const items = draft.days.flatMap((day) =>
    day.items.map((item) => ({
      key: `${day.day_number}-${item.exercise_id}`,
      day: `Day ${day.day_number} (${day.label})`,
      exercise: item.exercise_name,
      sets: item.sets,
      reps: `${item.rep_min}-${item.rep_max}`,
      target_weight: item.target_weight,
      unit: item.unit,
      reason_code: item.reason,
      rule_rationale: item.rationale,
    })),
  );

  const payload = {
    model: "openai/gpt-6-astra",
    stream: true,
    reasoning: { effort: "low", summary: "auto" },
    store: false,
    input: [
      {
        role: "developer",
        content: [
          {
            type: "input_text",
            text: "You are a friendly strength coach writing copy for a workout app. You are given a finished training plan. Do NOT change or restate any sets, reps, weights or exercise choices, and never suggest different ones. Write a short friendly summary (max 2 sentences) and exactly one short rationale line (max 18 words) per item, based on its reason_code and rule_rationale. Keep every weight and rep number exactly as given. This is not medical advice and you never diagnose anything.",
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: JSON.stringify({ notes: draft.notes, items }),
          },
        ],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "plan_narration",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["summary", "rationales"],
          properties: {
            summary: { type: "string" },
            rationales: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["key", "text"],
                properties: { key: { type: "string" }, text: { type: "string" } },
              },
            },
          },
        },
      },
    },
  };

  // Hard cap: if the AI is slow, give up and let the rule rationales stand,
  // otherwise the whole request can die without a response.
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 20_000);

  let response: Response;
  try {
    response = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify(payload),
      signal: abort.signal,
    });
  } catch (error) {
    clearTimeout(timer);
    console.error("[plan] AI narration request failed", error);
    return null;
  }

  if (!response.ok || !response.body) {
    clearTimeout(timer);
    console.error("[plan] AI narration failed", response.status, await response.text());
    return null;
  }


  // Accumulate the streamed text; nothing renders progressively here.
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
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
            text += event.delta;
          }
        } catch {
          // ignore keep-alives / partial frames
        }
      }
    }
  } catch (error) {
    console.error("[plan] AI narration stream aborted", error);
    return null;
  } finally {
    clearTimeout(timer);
  }


  try {
    const parsed = JSON.parse(text) as {
      summary?: string;
      rationales?: { key: string; text: string }[];
    };
    if (!parsed.summary) return null;
    const rationales: Record<string, string> = {};
    for (const entry of parsed.rationales ?? []) {
      if (entry?.key && entry?.text) rationales[entry.key] = entry.text;
    }
    return { summary: parsed.summary, rationales };
  } catch {
    console.error("[plan] AI narration returned unparseable text");
    return null;
  }
}
