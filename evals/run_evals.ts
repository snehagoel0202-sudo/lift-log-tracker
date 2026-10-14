/**
 * LiftLog AI eval runner — tests the REAL parser prompt in src/lib/log-parse.server.ts.
 *
 * Usage (from the repo root, with this folder copied to ./evals):
 *   LOVABLE_API_KEY=... bun evals/run_evals.ts            # same gateway + model as the live app
 *   OPENAI_API_KEY=... EVAL_MODEL=gpt-5-mini bun evals/run_evals.ts   # fallback if you can't export the Lovable key
 *   bun evals/run_evals.ts --selftest                      # checks the grader with a fake perfect model, no key needed
 *   add --only=G  to run one category letter, --repeat=3 to run each case 3 times (catches flaky answers)
 *
 * Output: a pass-rate table in the terminal + evals/results-<timestamp>.md and .json
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? "true"];
  }),
);
const PARSER = process.env.PARSER_PATH ?? join(here, "../src/lib/log-parse.server.ts");

type Expected = { exercise: string; weight: number | null; unit: string | null; reps: number | null; rpe: number | null };
type Case = {
  id: string;
  category: string;
  input?: string;
  current?: unknown[];
  correction?: string;
  expect?: Expected[];
  expect_empty?: boolean;
  note?: string;
};
type Got = { exercise_name: string; weight: number | null; unit: string | null; reps: number | null; rpe: number | null };

const load = (f: string): Case[] =>
  readFileSync(join(here, f), "utf8").trim().split("\n").map((l) => JSON.parse(l));

const normUnit = (u: string | null) => {
  if (!u) return null;
  const x = u.toLowerCase();
  if (x.startsWith("lb") || x.startsWith("pound")) return "lb";
  if (x.startsWith("kg") || x.startsWith("kilo")) return "kg";
  return x;
};

function grade(c: Case, got: Got[]): string[] {
  const problems: string[] = [];
  if (c.expect_empty) {
    if (got.length) problems.push(`expected no sets, got ${got.length}`);
    return problems;
  }
  const exp = c.expect!;
  if (got.length !== exp.length) problems.push(`expected ${exp.length} sets, got ${got.length}`);
  exp.forEach((e, i) => {
    const g = got[i];
    if (!g) return;
    const name = g.exercise_name.toLowerCase();
    for (const word of e.exercise.toLowerCase().split(" "))
      if (!name.includes(word)) problems.push(`set ${i + 1}: exercise "${g.exercise_name}" should contain "${e.exercise}"`);
    if (g.weight !== e.weight) problems.push(`set ${i + 1}: weight ${g.weight} ≠ ${e.weight}`);
    if (normUnit(g.unit) !== e.unit) problems.push(`set ${i + 1}: unit ${g.unit} ≠ ${e.unit}`);
    if (g.reps !== e.reps) problems.push(`set ${i + 1}: reps ${g.reps} ≠ ${e.reps}`);
    if (g.rpe !== e.rpe) problems.push(`set ${i + 1}: rpe ${g.rpe} ≠ ${e.rpe}`);
  });
  return [...new Set(problems)];
}

// Fallback: route the app's Lovable-gateway call to OpenAI, keeping the app's prompt untouched.
if (!process.env.LOVABLE_API_KEY && process.env.OPENAI_API_KEY && !args.selftest) {
  process.env.LOVABLE_API_KEY = "via-openai";
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    if (String(url).includes("ai.gateway.lovable.dev")) {
      const body = JSON.parse(String(init.body));
      body.model = process.env.EVAL_MODEL ?? "gpt-5-mini";
      return realFetch("https://api.openai.com/v1/responses", {
        ...init,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: JSON.stringify(body),
      });
    }
    return realFetch(url, init);
  }) as typeof fetch;
}

async function main() {
  let cases = [...load("cases.jsonl"), ...load("corrections.jsonl")];
  if (args.only) cases = cases.filter((c) => c.id.startsWith(String(args.only)));
  const repeat = Number(args.repeat ?? 1);

  let parse: (t: string) => Promise<Got[]>;
  let correct: (cur: unknown[], corr: string) => Promise<Got[]>;
  let isUnreadable: (e: unknown) => boolean;

  if (args.selftest) {
    // Fake "perfect" model: returns the expected answer. Proves the grader passes a right answer.
    const byInput = new Map(cases.map((c) => [c.input ?? c.correction, c]));
    const perfect = (k: string): Got[] =>
      (byInput.get(k)?.expect ?? []).map((e) => ({ ...e, exercise_name: e.exercise }));
    parse = async (t) => perfect(t);
    correct = async (_c, t) => perfect(t);
    isUnreadable = () => false;
  } else {
    if (!process.env.LOVABLE_API_KEY) {
      console.error("Set LOVABLE_API_KEY (or OPENAI_API_KEY), or run with --selftest.");
      process.exit(1);
    }
    const mod = await import(PARSER);
    parse = mod.parseWorkoutText;
    correct = (cur, corr) => mod.applyCorrection(cur, corr, null);
    isUnreadable = (e) => e instanceof mod.ParseUnreadableError;
  }

  const rows: { id: string; category: string; run: number; pass: boolean; problems: string[]; got: Got[] | string }[] = [];
  for (const c of cases) {
    for (let run = 1; run <= repeat; run++) {
      let got: Got[] = [];
      let error: string | null = null;
      try {
        got = c.category === "correction" ? await correct(c.current!, c.correction!) : await parse(c.input!);
      } catch (e) {
        if (!isUnreadable(e)) error = String(e);
      }
      const problems = error ? [`call failed: ${error}`] : grade(c, got);
      rows.push({ id: c.id, category: c.category, run, pass: problems.length === 0, problems, got: error ?? got });
      process.stdout.write(problems.length ? "✗" : "·");
    }
  }
  console.log("\n");

  const cats = [...new Set(rows.map((r) => r.category))];
  const table = cats.map((cat) => {
    const r = rows.filter((x) => x.category === cat);
    const p = r.filter((x) => x.pass).length;
    return { cat, p, n: r.length, pct: Math.round((100 * p) / r.length) };
  });
  const total = rows.filter((r) => r.pass).length;
  const lines = [
    `# LiftLog parser eval — ${new Date().toISOString().slice(0, 16).replace("T", " ")}`,
    "",
    `Model: ${args.selftest ? "selftest (fake perfect model)" : process.env.EVAL_MODEL ?? "app default (openai/gpt-6-astra)"} · Runs per case: ${repeat}`,
    "",
    `**Overall: ${total}/${rows.length} (${Math.round((100 * total) / rows.length)}%)**`,
    "",
    "| Category | Pass | Rate |",
    "|---|---|---|",
    ...table.map((t) => `| ${t.cat} | ${t.p}/${t.n} | ${t.pct}% |`),
    "",
    "## Failures",
    "",
    ...rows.filter((r) => !r.pass).map((r) => {
      const c = cases.find((x) => x.id === r.id)!;
      return `- **${r.id}** (${r.category}) — “${c.input ?? c.correction}”\n  - ${r.problems.join("\n  - ")}`;
    }),
  ];
  console.log(lines.slice(4, 8 + table.length).join("\n"));
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 16);
  writeFileSync(join(here, `results-${stamp}.md`), lines.join("\n") + "\n");
  writeFileSync(join(here, `results-${stamp}.json`), JSON.stringify(rows, null, 2));
  console.log(`\nSaved evals/results-${stamp}.md`);
}

main();
