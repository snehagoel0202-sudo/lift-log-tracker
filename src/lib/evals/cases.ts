// Eval cases bundled at build time from evals/*.jsonl (no user data).
import casesRaw from "../../../evals/cases.jsonl?raw";
import correctionsRaw from "../../../evals/corrections.jsonl?raw";
import { parseJsonl } from "./grade";

export const EVAL_CASES = [...parseJsonl(casesRaw), ...parseJsonl(correctionsRaw)];
export const EVAL_CATEGORIES = [...new Set(EVAL_CASES.map((c) => c.category))];
export const EVAL_MODEL = "app default (openai/gpt-6-astra)";
