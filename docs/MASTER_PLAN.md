# VLAILA — Virtual Labs AI Lab Assistant

**Master Plan & Delivery Architecture**
_Version 2.0 — supersedes the original proposal's Section 5 (System Architecture) and Section 8 (Plan of Action) with a deployment-accurate design._

---

## 0. What changed from the proposal, and why

The original proposal assumed VLAILA would be built _into_ the Virtual Labs platform. Reconnaissance of the live platform shows that is neither necessary nor desirable.

**Finding: Virtual Labs is not one application. It is ~200 independently-hosted static sites.**

`vlab.co.in` is a directory portal. Every actual lab lives on its own subdomain — `pp-iiith.vlabs.ac.in`, `de-iitr.vlabs.ac.in`, `cse15-iiith.vlabs.ac.in` … — one per lab, across the ten broad areas. Each is a static site generated from the common `ph3-lab-mgmt` template and served from S3/CloudFront.

**Finding: that common template is a gift.** Every experiment page on every lab, in every discipline, exposes the same machine-readable context:

| Signal            | Location                                                                                 | Example                                                                            |
| ----------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Lab name          | `window.dataLayer[0].labName`                                                            | `Digital Electronics IITR`                                                         |
| Discipline        | `window.dataLayer[0].discipline`                                                         | `Electronics and Communication Engineering`                                        |
| Institute         | `window.dataLayer[0].college`                                                            | `IITR`                                                                             |
| Experiment name   | `window.dataLayer[0].expName`                                                            | `Construction of half and full adder…`                                             |
| Experiment slug   | `<meta name="experiment-short-name">`                                                    | `half-full-adder`                                                                  |
| **Current step**  | `<meta name="task-name">`                                                                | `Simulation`                                                                       |
| Task navigation   | `.nav-menu a[href$=".html"]`, active = `.current-item`                                   | Aim → Theory → Pretest → Procedure → Simulation → Posttest → References → Feedback |
| **Simulator DOM** | `iframe#fraDisabled.responsive-iframe` — **same-origin** (`src="simulation/index.html"`) | fully readable via `contentDocument`                                               |

Verified against `pp-iiith.vlabs.ac.in/exp/colour-blindness/` and `de-iitr.vlabs.ac.in/exp/half-full-adder/` — different labs, different disciplines, different institutes, byte-identical structure.

**Three consequences that shape this entire plan:**

1. **VLAILA ships as one line of HTML, not as a platform fork.**

   ```html
   <script src="https://vlaila.vlabs.ac.in/vlaila.js" defer></script>
   ```

   No config. No per-lab integration work. The widget self-identifies lab, experiment, discipline, institute and current step on load. A lab maintainer adds one line to the template footer and every experiment in that lab is covered. Add it to `ph3-lab-mgmt` itself and **all ~200 labs are covered by a single upstream commit.**

2. **The Screen Observer's "vision fallback" drops from critical path to edge case.** Because the simulator iframe is same-origin, the observer reads real interaction events out of the simulator — clicks, input changes, canvas actions — not a screenshot. The proposal budgeted Week 10 for vision fallback; it is now a Phase 4 nice-to-have, reserved for the handful of Flash-legacy and Unity/WebGL labs.

3. **Cross-origin is now the hard constraint, not the DOM.** ~200 origins talk to one API. That drives the CORS allowlist, the anonymous-by-default identity model, and the "degrade to fully-local rules engine" requirement below.

---

## 1. Product principles

These are the tie-breakers. When a design decision is close, these decide it.

1. **Ambient, not attentional.** VLAILA's success state is a student who finishes the experiment and barely noticed it was there. Every intervention has a cost paid in attention; the agent must earn it. Default posture is silence.
2. **Never wrong, sometimes quiet.** A false warning costs more trust than a missed hint costs learning. The agent declines to fire when confidence is low. Target: <5% false-positive rate, accepting a higher false-negative rate as the price.
3. **Works when nothing else does.** Rural connectivity, GPU server down, API key expired, LLM rate-limited — the student still gets step validation. The deterministic rules engine is the floor, the LLM is the ceiling. Never a hard dependency.
4. **Zero friction to adopt.** One script tag. No student login required. No lab code changes. No build step for the lab maintainer.
5. **Privacy by construction.** Student identity never leaves the browser unless the institution opts in. Prompts sent to any external model carry pseudonymous session IDs and experiment context only.
6. **Explain, don't answer.** For conceptual questions the agent teaches the reasoning. It will not hand over a posttest answer.

---

## 2. System architecture

```
┌───────────────────────────────────────────────────────────────────────────┐
│  ~200 Virtual Labs origins   pp-iiith · de-iitr · cse15-iiith · …          │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  Experiment page (ph3-lab-mgmt static template)                     │  │
│  │  ┌───────────────────────────┐   <script src=".../vlaila.js" defer> │  │
│  │  │ iframe#fraDisabled        │            │                         │  │
│  │  │  (same-origin simulator)  │◄───────────┤                         │  │
│  │  └───────────────────────────┘            ▼                         │  │
│  │                              ┌──────────────────────────────────┐   │  │
│  │                              │  VLAILA widget (Shadow DOM)      │   │  │
│  │                              │  ┌────────────────────────────┐  │   │  │
│  │                              │  │ Detector  → who/what/where │  │   │  │
│  │                              │  │ Observer  → step events    │  │   │  │
│  │                              │  │ Local Rules Engine (floor) │  │   │  │
│  │                              │  │ Session Memory (local)     │  │   │  │
│  │                              │  │ UI: orb · panel · chat     │  │   │  │
│  │                              │  └────────────────────────────┘  │   │  │
│  │                              └───────────────┬──────────────────┘   │  │
│  └──────────────────────────────────────────────┼──────────────────────┘  │
└─────────────────────────────────────────────────┼─────────────────────────┘
                                     HTTPS / CORS │ (allowlist *.vlabs.ac.in)
                                                  ▼
┌───────────────────────────────────────────────────────────────────────────┐
│  VLAILA API — FastAPI                                                     │
│  ┌─────────────┬──────────────┬───────────────┬────────────────────────┐  │
│  │ Session svc │ Agent Core   │ RAG / Chat    │ Analytics + NL-Query   │  │
│  │ start/event │ NO_ACTION /  │ experiment-   │ instructor heatmaps,   │  │
│  │ /end        │ WARN / HINT /│ scoped        │ admin org stats,       │  │
│  │             │ CONCEPT      │ retrieval     │ NL→SQL, CSV/PDF        │  │
│  └─────────────┴──────┬───────┴───────┬───────┴────────────────────────┘  │
│                       │               │                                    │
│         ┌─────────────▼──────┐  ┌─────▼─────────────────┐                  │
│         │ LLM Router         │  │ Knowledge Base        │                  │
│         │ claude │ openai    │  │ kb/experiments/*.json │                  │
│         │ ollama │ offline   │  │ + BM25 index          │                  │
│         └────────────────────┘  └───────────────────────┘                  │
│                       │                                                    │
│         ┌─────────────▼──────────────────────────────────┐                 │
│         │ Postgres (prod) / SQLite (dev)                 │                 │
│         │ sessions · events · interventions · quiz · fb  │                 │
│         └───────────────────────────────────────────────┘                  │
└───────────────────────────────────────────────────────────────────────────┘
                                                  ▲
┌─────────────────────────────────────────────────┴─────────────────────────┐
│  VLAILA Console (this repo's React app) — instructor & admin surfaces,     │
│  KB authoring studio, embed playground, agent health monitor               │
└───────────────────────────────────────────────────────────────────────────┘
```

### 2.1 The four-tier reasoning ladder

The single most important design decision. Every incoming step event walks down this ladder and stops at the first tier that can answer confidently.

| Tier                   | Runs where         | Latency | Handles                                                                                                                 | Cost    |
| ---------------------- | ------------------ | ------- | ----------------------------------------------------------------------------------------------------------------------- | ------- |
| **0 — Detector**       | Browser            | ~0 ms   | Which experiment, which step, what did the student just touch                                                           | free    |
| **1 — Rules engine**   | Browser + server   | <5 ms   | Prerequisite violations, out-of-order steps, out-of-range parameters, missed steps. Deterministic, derived from the KB. | free    |
| **2 — Small model**    | Ollama / self-host | ~300 ms | Ambiguous step classification, "is this deviation fatal or recoverable"                                                 | ~0      |
| **3 — Frontier model** | Claude API         | ~1.2 s  | Conceptual Q&A, personalised summaries, quiz generation, NL→SQL, teaching suggestions                                   | metered |

**Roughly 80% of interventions never leave Tier 1.** Wrong-order and out-of-range detection is genuinely a rules problem — the KB already encodes the correct sequence and the valid parameter ranges. Spending a frontier-model call to discover that a student clicked "Run" before setting voltage is waste, and it introduces a second of latency into the exact moment learning flow matters most.

This is the concrete form of the proposal's "Option C — Hybrid," and it is the default from day one rather than a scaling migration.

### 2.2 Component responsibilities

**Detector** (`embed/src/detect.ts`) — reads `dataLayer`, meta tags, hostname and path; produces a stable `ExperimentRef {labId, expId, discipline, institute, taskName}`. Falls back to URL parsing, then to a `data-vlaila-*` attribute override for non-template labs.

**Observer** (`embed/src/observer/`) — attaches to the host document and, when reachable, to `iframe#fraDisabled.contentDocument`. Emits normalized `StepEvent`s. Uses delegated listeners plus a `MutationObserver` so it survives simulators that rebuild their DOM. Debounced, deduplicated, and capped at 60 events/min per session.

**Rules engine** (`server/app/agent/rules.py`, mirrored in `embed/src/rules.ts`) — pure function `(kb, sessionState, event) → Verdict | None`. Identical semantics on both sides so the offline path and online path never disagree.

**Agent Core** (`server/app/agent/core.py`) — orchestrates the ladder, applies the confidence gate, consults session memory for repetition suppression, and emits exactly one of `NO_ACTION | WARN | HINT | CONCEPT` with a severity and an optional UI target selector.

**Session Memory** (`server/app/agent/memory.py`) — per-session vector of: steps completed correctly, hints shown (by step + level), hints accepted/dismissed, dwell times, deviation count. Drives hint escalation (nudge → specific → interactive) and guarantees no hint repeats.

**RAG** (`server/app/agent/rag.py`) — BM25 over the current experiment's KB entry only. Hard-scoped: chunks from other experiments are physically not in the candidate set, so cross-experiment contamination is impossible by construction rather than by prompt instruction.

**LLM Router** (`server/app/llm/`) — one interface, four adapters. `offline` is a real adapter, not a stub: it composes responses from KB hint templates, so the whole system runs and demos with no API key at all.

---

## 3. Knowledge Base

One JSON document per experiment, validated against `kb/schema/experiment.schema.json`.

```jsonc
{
  "experiment_id": "colour-blindness",
  "lab_id": "psychological-process",
  "origin": "https://pp-iiith.vlabs.ac.in",     // enables auto-lookup by hostname
  "discipline": "Design Engineering",
  "institute": "IIITH",
  "steps": [
    {
      "id": "select-image",
      "order": 3,
      "task": "Simulation",                      // maps to <meta name="task-name">
      "title": "Select an image",
      "requires": ["read-theory"],               // prerequisite step ids
      "selectors": [".image-thumbnail"],         // what to watch, and what to highlight
      "expected_action": "click",
      "hints": {
        "nudge":       "Pick one of the images above to begin.",
        "specific":    "Click any thumbnail in the gallery — the image loads onto the canvas.",
        "interactive": { "highlight": ".thumbnail-row img:first-child", "text": "Try this one." }
      },
      "concept": "Colour-vision deficiency is easiest to see on images with red–green contrast…"
    }
  ],
  "errors": [
    {
      "id": "mode-before-image",
      "severity": "recoverable",                 // fatal | recoverable
      "when": { "action": "click", "selector": "#protonopiaBtn", "unless_completed": ["select-image"] },
      "message": "Choose an image first — the filter has nothing to transform yet.",
      "correction_step": "select-image"
    }
  ],
  "theory_chunks": [ ... ],                      // RAG corpus, grounded in the live lab content
  "quiz_bank": [ ... ]
}
```

Design notes:

- **`errors[].when` is data, not code.** A domain expert authoring a KB entry never writes a line of Python or JS. This is what makes 1,500 experiments tractable.
- **`severity` is authored, not inferred.** The proposal's fatal-vs-recoverable distinction is a pedagogical judgement, so it belongs with the subject-matter expert, not the model.
- **`origin` + `experiment_id` is the lookup key**, so the widget needs no configuration to find its own KB entry.

Ships with **6 entries across 5 disciplines**, each grounded in the live lab content (see `kb/experiments/`).

---

## 4. User experience

### 4.1 Student — the flagship surface

**Orb.** 56 px, bottom-right, above the lab's own float button so it never collides. Four states, each with a distinct shape _and_ colour (never colour alone — WCAG 1.4.1):

| State | Colour | Glyph | Meaning                       |
| ----- | ------ | ----- | ----------------------------- |
| idle  | slate  | ●     | present, watching, silent     |
| ok    | green  | ✓     | milestone confirmed           |
| hint  | amber  | ◆     | has a nudge available         |
| warn  | rose   | ▲     | procedural deviation detected |

Motion: a single 400 ms scale-and-settle on state change. No looping pulse — a permanent animation in the corner of a learning screen is an attention tax. `prefers-reduced-motion` removes it entirely.

**Intervention panel.** 320 px, slides from the right, never overlaps the simulator (the widget measures the iframe and shifts itself if it would). Anatomy: severity chip → one-line title → two-to-three-line body → three actions (`Show me` · `Got it` · `Why?`). Auto-retracts after 30 s if the observer sees the student correct the action unprompted — the assistant noticing you fixed it yourself, and getting out of the way, is the single most trust-building behaviour in the product.

**Escalation.** Same step, repeated trouble: nudge → specific instruction → interactive highlight (the widget draws a ring on the real element inside the simulator iframe). Escalation state is per-step and resets on success.

**Chat.** Expands from the panel. Experiment-scoped. Off-topic questions get a one-line redirect, not a lecture. Streaming responses. Voice in/out via Web Speech API — zero infrastructure, and it matters for the mobile-first rural users the proposal calls out.

**Summary card.** On completion: time on task, precision score (% of steps correct first try), hints used, deviations recovered, two concepts to revisit, and a 3-question quiz generated from the KB quiz bank with per-question feedback.

### 4.2 Instructor

Class completion, step-level confusion heatmap, drop-off analysis, per-student session drill-down, natural-language class queries, and custom hint authoring that overrides defaults for that instructor's students only.

### 4.3 Admin

Org dashboard (DAU, sessions by discipline, trending/struggling labs, institute comparison), natural-language stats query with NL→SQL and auto-charting, CSV/PDF export from any view, and the Agent Health Monitor — intervention volume, acceptance rate, false-positive rate, p50/p95 latency, LLM spend, and a flag queue for experiments whose hints get dismissed repeatedly.

### 4.4 Experiment Author (fourth role, from proposal §11)

A KB authoring studio: structured editor over the schema, live selector picker, and a scenario runner that replays common student error paths against the entry so the author sees exactly what VLAILA will say before it ships.

---

## 5. Design language

The live Virtual Labs sites are Bootstrap-era: `#4076e0` blue, Open Sans / Raleway, flat cards. VLAILA must feel like it belongs there _and_ like it is from this decade. The resolution is to **inherit their hue and reject their era**.

- **Colour.** Anchored on the platform blue, extended into a proper OKLCH ramp so tints stay perceptually even. Semantic roles only — `--vl-accent`, `--vl-warn`, `--vl-danger`, `--vl-ok`. Full light and dark themes; dark follows `prefers-color-scheme` and is overridable.
- **Type.** Inter for UI. The widget ships no webfont — it uses the system stack so it adds zero network cost to a page it does not own.
- **Surface.** One elevation system: `--vl-shadow-1` for the orb, `--vl-shadow-2` for panels. Radius 14 px on panels, full on the orb. Generous 16 px internal padding.
- **Isolation.** The entire widget renders inside a **Shadow DOM root**, so Bootstrap's global `h1`/`button`/`.btn` rules cannot leak in and VLAILA's styles cannot leak out. This is non-negotiable when injecting into 200 sites you do not control.
- **Motion.** 180 ms `cubic-bezier(.32,.72,0,1)` for panel transitions. Everything gated on `prefers-reduced-motion`.
- **Accessibility.** WCAG 2.1 AA: 4.5:1 text contrast throughout, full keyboard operation, focus trap in the panel, `role="status"` + `aria-live="polite"` on interventions so screen readers announce hints without stealing focus, ESC to dismiss.

---

## 6. Data, privacy & security

- **Anonymous by default.** A session gets a random UUID stored in `sessionStorage`. No cookie, no cross-site identifier, no login required to benefit from the student features.
- **Identity is opt-in and institution-scoped.** Instructor and admin analytics require an explicit institutional enrolment; only then is a session bound to a student record.
- **Nothing identifying reaches a model.** Prompt payloads contain experiment ID, step ID, action, values, and hint history. Never name, roll number, email, or free-text that has not been typed by the user into the chat.
- **Chat is scrubbed** for email/phone/roll-number patterns before it leaves the browser.
- **Origin allowlist** (`*.vlabs.ac.in`, `vlab.co.in`) on CORS, plus per-session rate limits: 60 events/min, 20 chat messages/min.
- **Data residency.** Option B (Ollama on consortium hardware) is a config flag, not a rebuild — `VLAILA_LLM_PROVIDER=ollama` and no byte leaves the network.
- **Retention.** Raw events 90 days, aggregates indefinitely, chat transcripts session-only unless the student saves them.

---

## 7. Delivery plan

### Independent Study scope — Phases 1 & 2, Weeks 1–10, Student Module

| Wk  | Deliverable                                             | Acceptance                            |
| --- | ------------------------------------------------------- | ------------------------------------- |
| 1   | Platform audit + literature review, gap-analysis table  | Report reviewed by supervisor         |
| 2   | KB JSON schema + docs + Ohm's Law example entry         | Validates against schema              |
| 3   | 5 populated KB entries, 3+ disciplines                  | Domain-reviewed and validated         |
| 4   | FastAPI scaffold, Postgres, Docker Compose, 4 endpoints | Clean start from fresh machine        |
| 5   | DOM Screen Observer, tested on 2 experiments            | Zero missed events for defined types  |
| 6   | Agentic Core v1 + 20-case prompt test suite             | 20/20 pass, <3 s latency              |
| 7   | Session memory system, 10-step walkthrough              | Zero repeated hints                   |
| 8   | Orb + intervention panel, wired to `/agent/respond`     | Panel within 500 ms; all 4 states     |
| 9   | Chat Q&A with experiment-scoped RAG                     | 15/15 grounded, no hallucinated facts |
| 10  | Summary card + quiz + end-to-end demo, 2 experiments    | Full flow on 2 experiments            |

**Milestone gate (Wk 4):** schema locked, backend verified.
**Milestone gate (Wk 10):** student opens experiment → makes deliberate error → VLAILA fires correctly → student chats → receives summary. Two experiments, two disciplines.

### Beyond the IS semester

| Phase          | Weeks | Scope                                                                                           |
| -------------- | ----- | ----------------------------------------------------------------------------------------------- |
| 3 — Roles      | 11–14 | Instructor dashboard, admin org stats, NL→SQL, custom hints, CSV/PDF export                     |
| 4 — Hardening  | 15–18 | Institution pilot, load test, security review, WCAG audit, vision fallback for Flash/Unity labs |
| 5 — Production | 19+   | Upstream the script tag into `ph3-lab-mgmt`, monitoring, KB expansion, Author Studio GA         |

**The Phase 5 unlock:** because integration is one line in the shared template, going from 6 labs to all ~200 is a single upstream PR plus KB authoring throughput. KB authoring — not engineering — is the scaling bottleneck, which is exactly why the Author Studio (§4.4) is a first-class deliverable and not an afterthought.

---

## 8. Risks

| Risk                                                 | Mitigation                                                                                                                                                                                                                        |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| False-positive warnings destroy trust                | Rules engine is exact-match on authored conditions, never inferential. LLM tier must clear a confidence gate to fire a WARN. Every intervention logged with accept/dismiss; >30% dismiss rate on a hint auto-flags it for review. |
| KB entries wrong or stale                            | Schema validation in CI; domain sign-off required; "Report incorrect hint" in every panel routed to the flag queue; live-content diffing to catch upstream lab changes.                                                           |
| Cloud LLM vs. government data policy                 | Nothing identifying is ever in a prompt (§6). `VLAILA_LLM_PROVIDER=ollama` gives full on-prem with no code change.                                                                                                                |
| Heterogeneous experiment tech (Flash, Unity, canvas) | Same-origin iframe covers the template majority. Canvas-only sims fall back to coarse task-level tracking, which still supports prerequisites and concept prompts. Vision fallback reserved for the true long tail.               |
| Latency breaks learning flow                         | Tier 1 answers in <5 ms with no network. Server has a 2 s hard timeout falling back to the KB static hint. Streaming for chat.                                                                                                    |
| Students dismiss and ignore it                       | Silence is the default. Auto-retract on self-correction. Opt-out is one click and it is respected for the whole session. Success is measured on acceptance rate, not intervention volume.                                         |
| 200 origins, one API                                 | Origin allowlist, per-session rate limits, stateless API, CDN-cached widget bundle.                                                                                                                                               |

---

## 9. Success metrics

| Metric                         | Target                  |
| ------------------------------ | ----------------------- |
| Experiment completion rate     | +30% vs. control        |
| First-attempt step correctness | +15%                    |
| Hint acceptance rate           | >60%                    |
| Agent false-positive rate      | <5%                     |
| p95 intervention latency       | <2 s (Tier 1: <50 ms)   |
| Post-experiment quiz score     | VLAILA cohort > control |
| In-app satisfaction            | ≥4.0 / 5                |
| Labs integrated                | 6 (IS) → 200 (Phase 5)  |

---

## 10. Repository map

```
docs/          Plan, architecture, platform audit, KB authoring guide, API reference
kb/            schema/ + experiments/*.json + validate.py
server/        FastAPI: agent core, rules, memory, RAG, analytics, NL→SQL, exports
embed/         Zero-config <script> widget → dist/vlaila.js (Shadow DOM, offline-capable)
src/           VLAILA Console — instructor/admin dashboards, KB studio, embed playground
```

See `docs/ARCHITECTURE.md` for module-level detail and `docs/DELIVERABLES.md` for the
IS checklist mapped to concrete files and test commands.
