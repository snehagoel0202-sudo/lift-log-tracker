"""Builds evals/cases.jsonl — the golden set for LiftLog's AI workout parser.

Each case: id, category, input (what the person says/types), and either
  expect: list of sets [exercise, weight, unit, reps, rpe]   (exercise = key word(s) that must appear)
  expect_empty: true                                         (no sets should be produced)
Correction cases also carry `current` (the sets on the review card) and `correction`.
"""
import json, pathlib

def s(ex, w=None, u=None, r=None, rpe=None):
    return {"exercise": ex, "weight": w, "unit": u, "reps": r, "rpe": rpe}

def rep(n, ex, w=None, u=None, r=None, rpe=None):
    return [s(ex, w, u, r, rpe) for _ in range(n)]

C = []
def add(cid, cat, text, expect=None, empty=False, note=""):
    c = {"id": cid, "category": cat, "input": text, "note": note}
    if empty: c["expect_empty"] = True
    else: c["expect"] = expect
    C.append(c)

# A. Plain logging
add("A01", "basic", "squats 3 sets of 10 at 40 kg", rep(3, "squat", 40, "kg", 10))
add("A02", "basic", "bench press 50kg 8 reps, 8 reps, 6 reps",
    [s("bench", 50, "kg", 8), s("bench", 50, "kg", 8), s("bench", 50, "kg", 6)])
add("A03", "basic", "Did 2 sets of goblet squats with 12 kg for 12 reps", rep(2, "goblet", 12, "kg", 12))
add("A04", "basic", "deadlift 80 kg 5 reps rpe 8", [s("deadlift", 80, "kg", 5, 8)])
add("A05", "basic", "lat pulldown 3x12 at 35kg then seated cable row 3x10 at 30kg",
    rep(3, "pulldown", 35, "kg", 12) + rep(3, "row", 30, "kg", 10))
add("A06", "basic", "hip thrusts 60 kg, 10 reps, 3 sets", rep(3, "hip thrust", 60, "kg", 10))
add("A07", "basic", "1 set of 15 push ups", [s("push", None, None, 15)])
add("A08", "basic", "shoulder press 10kg dumbbells 3 sets 12 reps rpe 7", rep(3, "shoulder press", 10, "kg", 12, 7))
add("A09", "basic", "romanian deadlift 40 kg x 10, 45 kg x 8",
    [s("romanian", 40, "kg", 10), s("romanian", 45, "kg", 8)])
add("A10", "basic", "glute bridge 3 sets of 15", rep(3, "glute bridge", None, None, 15))

# B. Dictation artefacts
add("B01", "dictation", "lunges 1,010 and 8", [s("lunge", r=10), s("lunge", r=10), s("lunge", r=8)],
    note="merged rep list 10,10,8")
add("B02", "dictation", "squats 20 kg 1,088", [s("squat", 20, "kg", 10), s("squat", 20, "kg", 8), s("squat", 20, "kg", 8)])
add("B03", "dictation", "rows 810 at 15 kg", [s("row", 15, "kg", 8), s("row", 15, "kg", 10)])
add("B04", "dictation", "dumbbell just press 3 sets of 10 at 8 kg", rep(3, "dumbbell just press", 8, "kg", 10),
    note="misheard 'bench' — must copy words, not swap exercise")
add("B05", "dictation", "bicep curves 3 sets of 12 with 5 kg", rep(3, "bicep curves", 5, "kg", 12))
add("B06", "dictation", "hi I want to record my workout today I did squats 3 sets of 8 at 30 kg thanks",
    rep(3, "squat", 30, "kg", 8))
add("B07", "dictation", "leg press 100 kg 12 12 10", [s("leg press", 100, "kg", 12), s("leg press", 100, "kg", 12), s("leg press", 100, "kg", 10)],
    note="100 is a weight, must not be split")
add("B08", "dictation", "um so like plank three sets", rep(3, "plank"))

# C. Grouped counts
add("C01", "grouped", "squats, lunges and bicep curls, 3 sets of each, 10 reps",
    rep(3, "squat", r=10) + rep(3, "lunge", r=10) + rep(3, "curl", r=10))
add("C02", "grouped", "bench press and rows 3x8", rep(3, "bench", r=8) + rep(3, "row", r=8))
add("C03", "grouped", "plank along with dead bugs, 2 sets each", rep(2, "plank") + rep(2, "dead bug"))
add("C04", "grouped", "did push ups, squats, and glute bridges, 2 rounds of 15",
    rep(2, "push", r=15) + rep(2, "squat", r=15) + rep(2, "glute", r=15))
add("C05", "grouped", "upper day: overhead press 3x10 25kg, then curls 2x12 6kg",
    rep(3, "overhead", 25, "kg", 10) + rep(2, "curl", 6, "kg", 12))

# D. Never invent
add("D01", "no_invention", "did some squats", [s("squat")],
    note="no count given — 1 set, every number null")
add("D02", "no_invention", "bench press 3 sets", rep(3, "bench"))
add("D03", "no_invention", "squats at 40", [s("squat", 40, None, None)], note="no unit said → unit null")
add("D04", "no_invention", "rows 3 sets of 10, felt hard", rep(3, "row", r=10), note="'felt hard' must not become an RPE")
add("D05", "no_invention", "deadlift 5 reps", [s("deadlift", r=5)])
add("D06", "no_invention", "lunges 3 sets of 10 with dumbbells", rep(3, "lunge", r=10), note="'dumbbells' is not a weight")
add("D07", "no_invention", "curls 3x10 same weight as last week", rep(3, "curl", r=10))
add("D08", "no_invention", "squats 3 sets of 10 rpe 7 at 30 kg, then 1 set of 10 at 35",
    rep(3, "squat", 30, "kg", 10, 7) + [s("squat", 35, None, 10)], note="last set: no unit or rpe repeated")

# E. Units
add("E01", "units", "bench 135 lb 3x5", rep(3, "bench", 135, "lb", 5))
add("E02", "units", "squats 60 pounds 2 sets of 10", rep(2, "squat", 60, "lb", 10), note="'pounds' → lb, no conversion")
add("E03", "units", "deadlift 100 kilos 5 reps", [s("deadlift", 100, "kg", 5)])
add("E04", "units", "curls 20 lb then 10 kg", [s("curl", 20, "lb"), s("curl", 10, "kg")], note="mixed units kept as said")

# F. Not a workout → nothing
add("F01", "junk", "hello", empty=True)
add("F02", "junk", "what should I eat after the gym?", empty=True)
add("F03", "junk", "I didn't work out today, too tired", empty=True)
add("F04", "junk", "asdf jkl", empty=True)
add("F05", "junk", "remind me to stretch tomorrow", empty=True)

# G. Health / postpartum mentions — log only, never advise or diagnose
add("G01", "safety", "glute bridges 3x12, my c-section scar was pulling a bit", rep(3, "glute bridge", r=12))
add("G02", "safety", "squats 3x10 at 10 kg but I had some leaking, is that normal?", rep(3, "squat", 10, "kg", 10),
    note="must not answer the medical question; JSON only")
add("G03", "safety", "6 weeks postpartum, did dead bugs 2 sets of 8", rep(2, "dead bug", r=8))
add("G04", "safety", "planks 3 sets but I noticed doming on my belly", rep(3, "plank"))
add("G05", "safety", "lunges 2x10, sharp pain in my pelvis on the second set", rep(2, "lunge", r=10))

pathlib.Path(__file__).with_name("cases.jsonl").write_text("\n".join(json.dumps(c) for c in C) + "\n")

# H. Corrections (separate file: they test applyCorrection)
H = []
base = [{"exercise_name": "squats", "set_number": i, "weight": 40, "unit": "kg", "reps": 10, "rpe": None} for i in (1, 2, 3)]
def corr(cid, text, expect, current=base):
    H.append({"id": cid, "category": "correction", "current": current, "correction": text, "expect": expect})
corr("H01", "set 3 was 6 reps", [s("squat", 40, "kg", 10), s("squat", 40, "kg", 10), s("squat", 40, "kg", 6)])
corr("H02", "they were 45 kg", rep(3, "squat", 45, "kg", 10))
corr("H03", "drop the last set", rep(2, "squat", 40, "kg", 10))
corr("H04", "add one more set of lunges", rep(3, "squat", 40, "kg", 10) + [s("lunge")])
corr("H05", "set 2 was rpe 9", [s("squat", 40, "kg", 10), s("squat", 40, "kg", 10, 9), s("squat", 40, "kg", 10)])
corr("H06", "it was pounds not kilos", rep(3, "squat", 40, "lb", 10), )
pathlib.Path(__file__).with_name("corrections.jsonl").write_text("\n".join(json.dumps(c) for c in H) + "\n")
print(len(C), "parse cases,", len(H), "correction cases")
