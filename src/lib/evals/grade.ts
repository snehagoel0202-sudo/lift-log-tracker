// Shared by evals/run_evals.ts (CLI) and the in-app admin eval runner — keep them identical.
export type Expected = { exercise: string; weight: number | null; unit: string | null; reps: number | null; rpe: number | null };
export type EvalCase = {
  id: string;
  category: string;
  input?: string;
  current?: unknown[];
  correction?: string;
  expect?: Expected[];
  expect_empty?: boolean;
  note?: string;
};
export type Got = { exercise_name: string; weight: number | null; unit: string | null; reps: number | null; rpe: number | null };
export type EvalRow = { id: string; category: string; run: number; pass: boolean; problems: string[]; got: Got[] | string };

export const normUnit = (u: string | null) => {
  if (!u) return null;
  const x = u.toLowerCase();
  if (x.startsWith("lb") || x.startsWith("pound")) return "lb";
  if (x.startsWith("kg") || x.startsWith("kilo")) return "kg";
  return x;
};

export function grade(c: EvalCase, got: Got[]): string[] {
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

export const parseJsonl = (text: string): EvalCase[] =>
  text.trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));

/** Same markdown layout as the CLI results-*.md file. */
export function resultsMarkdown(rows: EvalRow[], cases: EvalCase[], model: string, repeat: number, date = new Date()): string {
  const cats = [...new Set(rows.map((r) => r.category))];
  const table = cats.map((cat) => {
    const r = rows.filter((x) => x.category === cat);
    const p = r.filter((x) => x.pass).length;
    return { cat, p, n: r.length, pct: Math.round((100 * p) / r.length) };
  });
  const total = rows.filter((r) => r.pass).length;
  return [
    `# LiftLog parser eval — ${date.toISOString().slice(0, 16).replace("T", " ")}`,
    "",
    `Model: ${model} · Runs per case: ${repeat}`,
    "",
    `**Overall: ${total}/${rows.length} (${rows.length ? Math.round((100 * total) / rows.length) : 0}%)**`,
    "",
    "| Category | Pass | Rate |",
    "|---|---|---|",
    ...table.map((t) => `| ${t.cat} | ${t.p}/${t.n} | ${t.pct}% |`),
    "",
    "## Failures",
    "",
    ...rows.filter((r) => !r.pass).map((r) => {
      const c = cases.find((x) => x.id === r.id);
      return `- **${r.id}** (${r.category}) — “${c?.input ?? c?.correction ?? ""}”\n  - ${r.problems.join("\n  - ")}`;
    }),
  ].join("\n") + "\n";
}
