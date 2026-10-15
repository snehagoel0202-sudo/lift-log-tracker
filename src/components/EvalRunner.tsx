import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { listEvalRuns, runEvalBatch, saveEvalRun } from "@/lib/evals.functions";
import { EVAL_CASES, EVAL_CATEGORIES, EVAL_MODEL } from "@/lib/evals/cases";
import { resultsMarkdown, type EvalRow } from "@/lib/evals/grade";

function download(rows: EvalRow[], when: Date, model: string) {
  const md = resultsMarkdown(rows, EVAL_CASES, model, 1, when);
  const url = URL.createObjectURL(new Blob([md], { type: "text/markdown" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `results-${when.toISOString().replace(/[:.]/g, "-").slice(0, 16)}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

export function EvalRunner() {
  const runBatch = useServerFn(runEvalBatch);
  const saveRun = useServerFn(saveEvalRun);
  const fetchRuns = useServerFn(listEvalRuns);
  const qc = useQueryClient();
  const runs = useQuery({ queryKey: ["eval-runs"], queryFn: () => fetchRuns() });
  const [done, setDone] = useState(0);
  const [current, setCurrent] = useState<string | null>(null);
  const [rows, setRows] = useState<EvalRow[] | null>(null);
  const [when, setWhen] = useState(new Date());
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setError(null); setRows(null); setDone(0);
    const all: EvalRow[] = [];
    try {
      for (const category of EVAL_CATEGORIES) {
        setCurrent(category);
        const res = await runBatch({ data: { category } });
        all.push(...res.rows);
        setDone((d) => d + 1);
      }
      setWhen(new Date());
      setRows(all);
      await saveRun({ data: { rows: all } });
      qc.invalidateQueries({ queryKey: ["eval-runs"] });
    } catch {
      setError(`Eval run stopped${current ? "" : ""}. Please try again.`);
      if (all.length) setRows(all);
    } finally {
      setCurrent(null);
    }
  }

  const pass = rows?.filter((r) => r.pass).length ?? 0;
  const cats = rows ? EVAL_CATEGORIES.map((c) => {
    const r = rows.filter((x) => x.category === c);
    const p = r.filter((x) => x.pass).length;
    return { c, p, n: r.length };
  }).filter((t) => t.n) : [];

  return (
    <section className="mt-8">
      <h2 className="font-semibold text-foreground">Parser evals</h2>
      <Button className="mt-2 h-12 w-full" onClick={run} disabled={current !== null}>
        {current ? `Running ${current}…` : "Run evals"}
      </Button>
      {current !== null ? (
        <div className="mt-3 space-y-1">
          <Progress value={(100 * done) / EVAL_CATEGORIES.length} />
          <p className="text-xs text-muted-foreground">{done}/{EVAL_CATEGORIES.length} categories</p>
        </div>
      ) : null}
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}

      {rows && current === null ? (
        <div className="mt-4 rounded-xl border border-border bg-card p-4 text-sm">
          <p className="text-lg font-semibold text-foreground">
            Overall: {pass}/{rows.length} ({rows.length ? Math.round((100 * pass) / rows.length) : 0}%)
          </p>
          <table className="mt-3 w-full text-left">
            <thead className="text-muted-foreground"><tr><th>Category</th><th>Pass</th><th className="text-right">Rate</th></tr></thead>
            <tbody>
              {cats.map((t) => (
                <tr key={t.c} className="text-foreground">
                  <td>{t.c}</td><td>{t.p}/{t.n}</td><td className="text-right">{Math.round((100 * t.p) / t.n)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h3 className="mt-4 font-semibold text-foreground">Failures</h3>
          {rows.filter((r) => !r.pass).length === 0 ? <p className="text-muted-foreground">None.</p> : null}
          <ul className="mt-1 space-y-2">
            {rows.filter((r) => !r.pass).map((r) => {
              const c = EVAL_CASES.find((x) => x.id === r.id);
              return (
                <li key={r.id} className="break-words">
                  <p className="text-foreground"><b>{r.id}</b> ({r.category}) — “{c?.input ?? c?.correction}”</p>
                  <ul className="ml-4 list-disc text-muted-foreground">{r.problems.map((p) => <li key={p}>{p}</li>)}</ul>
                </li>
              );
            })}
          </ul>
          <Button variant="outline" className="mt-4 h-11 w-full" onClick={() => download(rows, when, EVAL_MODEL)}>
            Download as markdown
          </Button>
        </div>
      ) : null}

      <h3 className="mt-6 font-semibold text-foreground">Past runs</h3>
      <div className="mt-2 space-y-2">
        {runs.data?.runs.length === 0 ? <p className="text-sm text-muted-foreground">No runs yet.</p> : null}
        {runs.data?.runs.map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card p-3 text-sm">
            <span className="text-foreground">
              {new Date(r.created_at).toLocaleString()} · {r.overall_pass}/{r.overall_total} ({r.overall_total ? Math.round((100 * r.overall_pass) / r.overall_total) : 0}%)
            </span>
            <Button size="sm" variant="ghost" onClick={() => download(r.results, new Date(r.created_at), r.model)}>.md</Button>
          </div>
        ))}
      </div>
    </section>
  );
}
