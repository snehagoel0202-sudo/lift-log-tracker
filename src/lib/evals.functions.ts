import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isAdminEmail } from "@/lib/admin.functions";
import { EVAL_CASES, EVAL_MODEL } from "@/lib/evals/cases";
import { grade, type EvalRow, type Got } from "@/lib/evals/grade";

const rowSchema = z.object({
  id: z.string(),
  category: z.string(),
  run: z.number(),
  pass: z.boolean(),
  problems: z.array(z.string()),
  got: z.union([z.string(), z.array(z.any())]),
});

export const runEvalBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ category: z.string().max(40) }).parse(d))
  .handler(async ({ data, context }) => {
    if (!isAdminEmail(context.claims.email)) throw new Error("Forbidden");
    const mod = await import("@/lib/log-parse.server");
    const cases = EVAL_CASES.filter((c) => c.category === data.category);
    const rows: EvalRow[] = await Promise.all(
      cases.map(async (c) => {
        let got: Got[] = [];
        let error: string | null = null;
        try {
          got = (c.category === "correction"
            ? await mod.applyCorrection(c.current as never, c.correction!, null)
            : await mod.parseWorkoutText(c.input!)) as Got[];
        } catch (e) {
          if (!(e instanceof mod.ParseUnreadableError)) error = String(e);
        }
        const problems = error ? [`call failed: ${error}`] : grade(c, got);
        return { id: c.id, category: c.category, run: 1, pass: problems.length === 0, problems, got: error ?? got };
      }),
    );
    return { rows: JSON.parse(JSON.stringify(rows)) as EvalRow[] };
  });

export const saveEvalRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ rows: z.array(rowSchema).max(500) }).parse(d))
  .handler(async ({ data, context }) => {
    if (!isAdminEmail(context.claims.email)) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("eval_runs").insert({
      model: EVAL_MODEL,
      overall_pass: data.rows.filter((r) => r.pass).length,
      overall_total: data.rows.length,
      results: data.rows as never,
    });
    if (error) throw new Error("Couldn't save run");
    return { ok: true };
  });

export const listEvalRuns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!isAdminEmail(context.claims.email)) return { ok: false as const, runs: [] };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("eval_runs")
      .select("id, created_at, model, overall_pass, overall_total, results")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error("Couldn't load runs");
    return { ok: true as const, runs: JSON.parse(JSON.stringify(data)) as { id: string; created_at: string; model: string; overall_pass: number; overall_total: number; results: EvalRow[] }[] };
  });
