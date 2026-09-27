# Authoring a Knowledge Base Entry

Everything VLAILA knows about an experiment lives in one JSON file under `kb/experiments/`.
Nothing about an experiment's procedure is inferred by a model — if it is not in the entry, the
assistant stays quiet about it.

Authoring is the bottleneck on reaching all 1,500 experiments, which is why this guide exists and
why the [Author Studio](../src/routes/studio.tsx) is a first-class part of the product. A domain
expert should never have to write code.

---

## The shape of an entry

```
identity      experiment_id, lab_id, origin, discipline, institute
steps[]       the correct procedure, in order
errors[]      what going wrong looks like
theory_chunks[]  the corpus for grounded Q&A
quiz_bank[]   authored questions and verified answers
concepts[]    reusable explanations referenced by steps and quiz items
```

Validate at any point:

```bash
python3 kb/validate.py                      # everything
python3 kb/validate.py kb/experiments/x.json   # one entry
```

The validator runs JSON Schema **and** referential checks. The second layer is the one that
catches real bugs: a `correction_step` pointing at a renamed step passes the schema and sends a
student to a hint that does not exist.

---

## 1. Identity

```json
{
  "kb_version": "1.0",
  "experiment_id": "colour-blindness",
  "lab_id": "psychological-process",
  "origin": "https://pp-iiith.vlabs.ac.in",
  "discipline": "Design Engineering",
  "institute": "IIITH"
}
```

`experiment_id` must match `<meta name="experiment-short-name">` on the live page — view source
and copy it, do not guess. `origin` plus `experiment_id` is the lookup key the widget resolves
with, and it is what disambiguates two labs that happen to use the same slug.

## 2. Steps

One entry per thing a student does, in the order they should do it. Order defines what
"out of sequence" means, so it is the most consequential field in the file.

```json
{
  "id": "select-image",
  "order": 5,
  "task": "Simulation",
  "title": "Select an image from the gallery",
  "requires": ["open-simulator"],
  "detect": { "action": "click", "selector": ".image-thumbnail", "frame": "sim" },
  "hints": {
    "nudge": "Pick one of the images above to get started.",
    "specific": "Click any thumbnail. The image loads onto the canvas showing normal colour vision — that is your reference before you apply any filter.",
    "interactive": {
      "highlight": ".thumbnail-row .image-thumbnail",
      "frame": "sim",
      "text": "Click any of these thumbnails."
    }
  },
  "milestone": true,
  "concept": "The unfiltered image is your control condition…"
}
```

**`task`** must match `<meta name="task-name">` on the page the step happens on. Most labs use the
classic eight (Aim → Feedback); learning-unit labs such as `ds1-iiith` define their own (`Demo`,
`Practice`, `Exercise`). List whatever the lab actually uses in the top-level `tasks` array.

**`detect`** is how the observer recognises the step. Find the selector by opening the simulator,
right-clicking the control and inspecting it.

| `frame`          | Means                                                                         |
| ---------------- | ----------------------------------------------------------------------------- |
| `host`           | The experiment page itself                                                    |
| `sim`            | Anywhere inside the simulator iframe — use this unless you need to be precise |
| `sim:half_adder` | A specific nested simulator frame                                             |

If a control has no stable id, target its **visible label** instead — the observer reports it, and
`selector` matches against it:

```json
{ "action": "click", "selector": "ADD", "frame": "sim:half_adder" }
```

Use `"count": 4` when one control stands for repeated work (log four rows, take six readings)
rather than inventing four near-identical steps.

**The three hint levels are three different jobs.** Level 1 asks, level 2 tells, level 3 shows.
Writing the same sentence three times wastes the escalation — a student who did not act on the
nudge needs new information, not the same information louder.

**`milestone: true`** marks a good moment for a "why did that happen" prompt. Note that a
milestone whose `detect.action` is `navigate` will not fire one: arriving on the Theory page means
the student opened it, not that they read it, and volunteering the explanation there gives away
the thing the page is meant to teach.

**Every non-optional step needs a `detect` block.** Without one it can never be completed, and
everything that `requires` it is blocked forever. The validator enforces this.

## 3. Errors

The interesting part. Each entry is a pattern the rules engine matches exactly — no inference, so
it cannot fire spuriously.

```json
{
  "id": "mode-before-image",
  "severity": "recoverable",
  "when": {
    "action": "click",
    "selector": "#protonopiaBtn, #tritanopiaBtn, #colorblindBtn",
    "frame": "sim",
    "unless_completed": ["select-image"]
  },
  "message": "Pick an image first — there is nothing on the canvas for the filter to transform yet.",
  "correction_step": "select-image",
  "concept": "The filter is a per-pixel transform of whatever is on the canvas…"
}
```

All present keys in `when` must hold. The useful ones:

| Key                  | Detects                                                       |
| -------------------- | ------------------------------------------------------------- |
| `unless_completed`   | **Out of order** — fires only if none of these steps are done |
| `after_completed`    | A mistake only possible later in the procedure                |
| `value_out_of_range` | A parameter outside its valid range                           |
| `repeat_count`       | **Thrashing** — the same action N times without progress      |
| `on_task`            | A mistake specific to one page                                |
| `idle_seconds`       | Combined with the above, "stuck _and_ did this"               |

**`severity` is a pedagogical judgement, so you make it, not the model.**

- `fatal` — cannot obtain valid results without correcting. Powering nothing, no indicator, no
  data. Firm wording.
- `recoverable` — can proceed, results may vary. Softer wording.

**`confidence` below 0.9 turns a warning into a hint.** Use it deliberately. If you are inferring
intent rather than observing a fact — "they are probably rushing" — set 0.7 and let it be
delivered as a nudge. It is the honest encoding of an uncertain rule, and it protects the
false-positive budget.

### Writing the message

This is the part students actually read.

- Say what is wrong **and** why it matters, in one or two sentences.
- Address them directly. "Pick an image first", not "An image must be selected".
- Explain the mechanism, not just the rule. _"the LEDs will not respond however you set A and B"_
  teaches something; _"connect the supply first"_ does not.
- No blame, no exclamation marks, no "Oops!".

## 4. Theory chunks

The retrieval corpus for chat. Draw them from the lab's **own** Theory and Procedure pages so
answers stay grounded in the material the student is being assessed on.

```json
{
  "id": "tc-trichromacy",
  "heading": "How colour vision works",
  "text": "Normal colour vision uses all three types of cone…",
  "tags": ["cones", "trichromacy", "mechanism"],
  "source": "https://pp-iiith.vlabs.ac.in/exp/colour-blindness/theory.html"
}
```

One idea per chunk, 3–6 sentences. Five to eight chunks is usually enough — retrieval is scoped to
a single experiment, so precision matters far more than volume. Include a chunk for the simulator
controls themselves; "what does this button do" is one of the most common questions students ask.

## 5. Quiz bank

Authored questions with **verified** answers. Never model-generated: a subtly wrong question that
tells a student their correct answer is wrong destroys trust in everything else the assistant says.

Six items spanning beginner → advanced lets selection adapt to where the student actually
struggled. Write the `explanation` to teach, not just to confirm — it is shown for right answers
too.

---

## Preview before you ship

Open **Author Studio** in the console, pick your experiment, and replay the student behaviour your
error pattern is supposed to catch. The Studio runs the same rules engine that serves students, so
what you see is what they would get.

```json
[{ "action": "click", "selector": "#protonopiaBtn", "frame": "sim", "task": "Simulation" }]
```

Check both directions:

1. **The mistake fires.** Your pattern produces the WARN you expect, with the right severity.
2. **The correct path is silent.** Replay the procedure done properly and confirm nothing fires.

The second check is the one people skip, and it is the one that protects the product. An assistant
that catches every error and also interrupts students doing everything right is worse than no
assistant.

---

## Checklist

- [ ] `experiment_id` copied from the live page's meta tag
- [ ] Every step has a `detect` block, or is marked `optional`
- [ ] `requires` reflects real dependencies, not just ordering
- [ ] Three hint levels each say something different
- [ ] Every `correction_step` points at a step that exists
- [ ] `severity` reviewed by someone who teaches the experiment
- [ ] Uncertain rules carry `confidence` below 0.9
- [ ] Theory chunks cite their `source` URL
- [ ] Quiz answers verified against the lab's own material
- [ ] `python3 kb/validate.py` passes
- [ ] Scenario replayed in Author Studio — mistake fires, correct path silent
