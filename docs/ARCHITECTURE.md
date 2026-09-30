# Architecture

Module-level detail. For the product rationale see [`MASTER_PLAN.md`](MASTER_PLAN.md); for the
platform findings that shaped it see [`PLATFORM_AUDIT.md`](PLATFORM_AUDIT.md).

---

## Request flow

A student clicks a control inside the simulator.

```
1  Observer (browser)      capture-phase listener on the simulator's document
                           → normalize to a StepEvent
2  Rules engine (browser)  evaluate against the cached KB → verdict in <5 ms
3  UI                      render immediately if the verdict is not NO_ACTION
4  API POST /session/event  ─┐  fire-and-forget from the student's point of view
5  Rules engine (server)     │  authoritative evaluation + session memory write
6  Model tier                │  only if the server's Tier 1 could not classify
7  Response                 ─┘  supersedes the local verdict; carries progress
```

Steps 1-3 happen with no network. Steps 4-7 improve the answer and record it for the dashboards.
If the network is down, the student loses the model tier and keeps everything else.

---

## The knowledge base is the contract

`kb/experiments/*.json` is the only source of truth about an experiment, and it is consumed by
four things that must agree:

| Consumer                    | Uses                                                    |
| --------------------------- | ------------------------------------------------------- |
| `server/app/agent/rules.py` | steps, errors                                           |
| `embed/src/rules.ts`        | steps, errors (shipped to the browser at session start) |
| `server/app/agent/rag.py`   | theory_chunks, concepts, misconceptions                 |
| `server/app/agent/quiz.py`  | quiz_bank                                               |

`ExperimentKB.client_rules()` decides what the browser gets. It deliberately excludes
`theory_chunks` (large) and `quiz_bank` - shipping the quiz answers to the client would let a
student read them out of the network tab.

### Why Tier 1 is implemented twice

`rules.py` and `rules.ts` are line-for-line equivalents. Two implementations is a maintenance cost
paid on purpose: it is what makes the browser able to validate steps with no connectivity, which
is the difference between an assistant that works in a rural college computer lab and one that
does not. The 20-case suite in `server/tests/test_agent_suite.py` is the shared contract - if the
two ever disagree, that suite is where it should surface.

---

## Server modules

```
app/
  config.py        Settings. Every value defaults to something that runs with no .env
  kb.py            Loads + indexes entries; resolve(experiment_id, origin)
  db.py            5 tables: sessions, events, interventions, chat_turns, custom_hints
  schemas.py       Wire contracts
  ratelimit.py     Per-session sliding window
  agent/
    rules.py       Tier 1. Pure functions, no I/O
    core.py        The ladder: Tier 1 → confidence gate → Tier 2/3 → effects → persistence
    memory.py      The only place session counters are mutated
    rag.py         BM25 over one experiment
    chat.py        Grounded Q&A
    quiz.py        Adaptive selection from an authored bank
    prompts.py     System prompts + the structured-output schema
  llm/
    base.py        Interface + PII scrubbing
    offline.py     Composes answers from the KB - a real adapter, not a stub
    anthropic_client.py / openai_client.py / ollama_client.py
  analytics/
    aggregates.py  Instructor + admin roll-ups
    nl_query.py    NL→SQL with a validator that runs before the SQL does
    export.py      CSV + PDF
  routers/         session, chat, dashboards, kb
```

### Agent core invariants

- **Session state is mutated in exactly one place** (`memory.py`). The "never repeats a hint"
  guarantee is a property of that data structure - an error id in `shown_errors` cannot fire twice,
  and `set_hint_level` is monotonic - rather than a behaviour a prompt asks for.
- **The confidence gate applies to authored rules too**, not just to model output. A KB author who
  marks a pattern below 0.9 is saying they are not certain, and an uncertain warning is exactly the
  false positive that costs a student's trust. It is delivered as a hint: same information, framing
  that survives being wrong.
- **The model tier is consulted only for events Tier 1 could not place at all.** An event that
  matched a step is understood; there is nothing for a model to add.
- **Nothing in the agent path can fail the request.** Every model call is wrapped; the fallback is
  silence, which is also the safe answer.

### NL→SQL safety

The model proposes SQL; `validate_sql` decides whether it runs. Rejected: anything that is not a
single `SELECT`, any write or DDL keyword, comments, unknown tables, and any reference to
`user_key`. A `LIMIT` is appended if absent. A model asked nicely not to write `DELETE` usually
complies; a validator that refuses to execute it always does. With no model available the endpoint
falls back to a curated keyword-routed query set, so the admin console still works.

---

## Widget modules

```
embed/src/
  index.ts      Boot, event flow, lifecycle
  detect.ts     Zero-config identification + simulator frame discovery
  observer.ts   Delegated listeners, debounce, event budget
  rules.ts      Tier 1 in the browser
  api.ts        Client; every call degrades rather than throws
  character.ts  The assistant: rigged SVG + pose table
  ui.ts         Shadow DOM surface
  styles.ts     Scoped CSS
  i18n.ts       Chrome strings (en, hi)
```

### Observer constraints

Consequences of running inside pages we do not own:

- **Delegated listeners on the document**, never per-element. Several simulators rebuild their DOM
  on every action, so anything bound to an element is gone after the first click.
- **Capture phase, `passive: true`.** VLAILA must be unobservable to the experiment it watches.
- **Duck-typed element checks.** `target instanceof Element` fails for elements inside the
  simulator iframe - they belong to that frame's realm, not this window's. This was a real bug: it
  silently dropped every simulator interaction, which is the most important path in the product.
- **A MutationObserver plus timed re-scans** find the simulator frame, which is often absent when
  the script first runs and is replaced when a student picks a sub-simulator.
- **60 events/minute ceiling**, so a `mousemove`-driven canvas cannot flood the API.

### Widget isolation

The entire UI renders inside a Shadow root. Non-negotiable when injecting into ~200 sites you do
not control: the labs style bare `button`, `h1` and `.btn` globally, and without a shadow boundary
the widget would look different on every lab. Theme follows the _host page's_ background rather
than the OS, because a dark panel over a white lab page reads as a stray browser extension.

Bundle: IIFE, ES2019, 29 kB gzipped, no webfont, no external request.

---

## Data model

```
sessions       one per student per experiment visit; carries denormalised state
               so resuming is a single read and analytics never replay the log
events         every observed interaction, resolved to a step id where possible
interventions  every time the agent spoke, with tier, latency, confidence
               and the student's response - this is the false-positive ledger
chat_turns     questions and answers, PII-scrubbed
custom_hints   instructor overrides, scoped to (experiment, step, institution)
```

`interventions.outcome` is what makes the Agent Health Monitor possible: acceptance rate,
false-positive rate, and the flag queue for experiments whose hints keep getting dismissed. That
last one is the loop that keeps the knowledge base honest as the platform's own labs change.

---

## Privacy

- Sessions are pseudonymous by default - a random UUID in `sessionStorage`, no cookie, no
  cross-site identifier, no login required to benefit.
- `user_key` is set only when an institution has explicitly enrolled, and never appears in a model
  prompt or an NL query result.
- Chat text is scrubbed for email, phone, roll-number and ID patterns before leaving the browser's
  request.
- Prompt payloads carry experiment ID, step ID, action, values and hint history. Nothing else.
- `VLAILA_LLM_PROVIDER=ollama` makes the whole system on-premise with no code change.

## What the overhaul pass changed

**Every route was open.** The student-facing ones are open by design - the
widget is embedded in ~200 independently hosted lab pages and has no identity to
present, which is why they are rate limited instead. The instructor and admin
ones were open by omission. `/instructor/students` returns per-student rows
keyed by `user_key` with a behavioural "strained" flag on each,
`/admin/query` runs natural-language queries over the session store and
`/admin/export` dumps it. Anyone who could reach the host could read all of it.

CORS was the only thing in front of them, and CORS is a browser policy: it does
nothing about curl.

`app/auth.py` adds a `require_staff` dependency, applied to the whole
dashboards router rather than per route so a new endpoint is gated by default
instead of by remembering. `/kb/reload` is gated too: re-reading every entry
from disk on an unauthenticated POST is both an author-only action and a free
way to make the API do work on demand. The gate fails closed - with no key
configured it refuses everyone and says which variable to set, because
defaulting open is how this was wrong in the first place.

`server/tests/test_staff_auth.py` asserts each staff route refuses an anonymous
caller, accepts the key, rejects a wrong one, and that the student-facing routes
stay open. Nine of its nineteen tests fail if the dependency is removed.

**The rate limiter's memory grew with total sessions, not concurrent ones.**
`SlidingWindow` kept a deque per session id forever. It now drops empty windows
as it notices them and sweeps stale ones periodically; `tracked_keys()` and
`sweep_now()` exist so a test can prove it.

**eslint was linting the Python virtualenv**, reporting prettier violations in
pip's vendored urllib3. With `.venv`, `.pytest_cache`, `embed/dist` and the
generated route tree ignored, and the project's own `npm run format` run once,
lint went from 918 errors to 0 and can be a CI gate.

**Two route components were inline arrows named `component`**, so the hooks
lint rule could not tell they were components and flagged every hook inside
them. Named now, which also helps stack traces.

**A critical audit backlog.** High-severity advisories in undici, sharp,
js-yaml, nanoid, fast-uri, wrangler and miniflare. All cleared; the audit job in
CI is there so the next one is noticed.

**`@typescript-eslint/no-explicit-any` is an error, and there are none left.**
Seven of the nine were the same thing: a knowledge base entry typed as
`Record<string, any>`, so the console read an authored document the compiler
knew nothing about. The fix was to stop hand-keeping a shape and generate it:

```sh
npm run kb:types      # kb/schema/experiment.schema.json -> src/lib/kb.types.ts
```

`src/lib/api.ts` re-exports that as `KbEntry` and `KbStep`, and
`embed/src/rules.ts` types an error's `when` clause as the generated
`Condition` - which matters, because that clause is what decides whether a
student made a mistake and it was previously outside the type checker
altogether. The generated file is committed, and `ops/hygiene.sh` regenerates
it and compares, so a schema change that skips the generator fails CI rather
than drifting.

The remaining two were DOM interop: the Web Speech API, which is not in
TypeScript's DOM library and is declared in `embed/src/speech.d.ts`, and the
page template's `dataLayer`, typed where it is written to match what
`embed/src/detect.ts` reads back.
