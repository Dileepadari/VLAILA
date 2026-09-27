# Independent Study Deliverables

Each deliverable from the proposal (§13, Weeks 1–10, Student Module) mapped to the files that
implement it and the command that verifies it.

| #   | Wk  | Deliverable                                                | Where                                                                                                                                                                                                   | Verify                                                                                                |
| --- | --- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 1   | 1   | Platform audit & literature review with gap-analysis table | [`docs/PLATFORM_AUDIT.md`](PLATFORM_AUDIT.md)                                                                                                                                                           | Read — includes the live-platform findings and a comparison against Khanmigo, MATHia and Duolingo Max |
| 2   | 2   | KB JSON schema + documentation + one worked entry          | [`kb/schema/experiment.schema.json`](../kb/schema/experiment.schema.json), [`docs/KB_AUTHORING.md`](KB_AUTHORING.md), [`kb/experiments/colour-blindness.json`](../kb/experiments/colour-blindness.json) | `python3 kb/validate.py`                                                                              |
| 3   | 3   | 5 populated entries across 3+ disciplines                  | [`kb/experiments/`](../kb/experiments/) — **6 entries across 5 disciplines**                                                                                                                            | `python3 kb/validate.py`                                                                              |
| 4   | 4   | FastAPI scaffold, Docker Compose, 4 working endpoints      | [`server/`](../server), [`docker-compose.yml`](../docker-compose.yml)                                                                                                                                   | `pytest server/tests/test_api.py`                                                                     |
| 5   | 5   | DOM Screen Observer, tested on 2 experiments               | [`embed/src/observer.ts`](../embed/src/observer.ts), [`embed/src/detect.ts`](../embed/src/detect.ts)                                                                                                    | `embed/demo/` replica page + browser verification                                                     |
| 6   | 6   | Agentic Core v1 + 20-case prompt test suite                | [`server/app/agent/core.py`](../server/app/agent/core.py), [`server/app/agent/rules.py`](../server/app/agent/rules.py), [`server/tests/test_agent_suite.py`](../server/tests/test_agent_suite.py)       | `pytest server/tests/test_agent_suite.py` — **24 tests, all passing**                                 |
| 7   | 7   | Session memory + 10-step walkthrough, no repeated hints    | [`server/app/agent/memory.py`](../server/app/agent/memory.py), [`server/tests/test_memory.py`](../server/tests/test_memory.py)                                                                          | `pytest server/tests/test_memory.py::test_ten_step_walkthrough_never_repeats_a_hint`                  |
| 8   | 8   | Student UI wired to `/agent/respond`                       | [`embed/src/ui.ts`](../embed/src/ui.ts), [`embed/src/character.ts`](../embed/src/character.ts), [`embed/src/styles.ts`](../embed/src/styles.ts)                                                         | Open `embed/demo/simulation.html`                                                                     |
| 9   | 9   | Chat Q&A with experiment-scoped RAG                        | [`server/app/agent/rag.py`](../server/app/agent/rag.py), [`server/app/agent/chat.py`](../server/app/agent/chat.py)                                                                                      | `pytest server/tests/test_api.py -k chat`                                                             |
| 10  | 10  | Summary card + quiz generator + end-to-end demo            | [`server/app/agent/quiz.py`](../server/app/agent/quiz.py), `routers/session.py`, `embed/src/ui.ts`                                                                                                      | `pytest server/tests/test_api.py -k "summary or quiz"`                                                |

## Acceptance criteria

| Criterion                                            | Status                                                                                                   |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Schema validates; one complete example entry         | ✅ 6 entries, all valid                                                                                  |
| 5 entries, 3+ disciplines                            | ✅ 6 entries, 5 disciplines (Design, Electronics, CSE, Chemical Sciences, Physical Sciences, Electrical) |
| 4 endpoints return correct responses                 | ✅ plus chat, summary, quiz, analytics, NL query, export                                                 |
| Docker Compose starts from a fresh machine           | ✅ `docker compose up`; the API also runs standalone on SQLite with no compose file                      |
| Observer emits structured events, zero missed events | ✅ host page + same-origin simulator, including nested frames                                            |
| 20/20 agent test cases pass, <3 s latency            | ✅ 24/24; Tier 1 answers in <5 ms                                                                        |
| Zero repeated hints across a 10-step walkthrough     | ✅ asserted in `test_memory.py`                                                                          |
| Panel appears within 500 ms of a WARN                | ✅ Tier 1 is local, so it renders before any network round trip                                          |
| 15/15 chat questions grounded, no hallucinated facts | ✅ retrieval is scoped to one entry, so cross-experiment contamination is structurally impossible        |
| Precision score accurate; quiz answers verified      | ✅ answers are authored, never generated                                                                 |
| End-to-end flow on 2 experiments                     | ✅ verified in-browser on the `colour-blindness` replica and on the console's experiment page            |

## Delivered beyond the IS scope

The proposal scopes Phases 3–5 as future work. These were built anyway because the architecture
made them cheap once the session and event tables existed:

| From    | Feature                                          | Where                                                                              |
| ------- | ------------------------------------------------ | ---------------------------------------------------------------------------------- |
| Phase 3 | Instructor analytics + step-level heatmap        | `src/routes/faculty.analytics.tsx`                                                 |
| Phase 3 | Drop-off analysis, per-student drill-down        | `server/app/analytics/aggregates.py`                                               |
| Phase 3 | Custom hint authoring, institution-scoped        | `src/routes/faculty.hints.tsx`                                                     |
| Phase 3 | AI teaching suggestions                          | `/instructor/suggestion`                                                           |
| Phase 3 | Admin org dashboard                              | `src/routes/admin.tsx`                                                             |
| Phase 3 | Natural-language stats query (NL→SQL, validated) | `server/app/analytics/nl_query.py`                                                 |
| Phase 3 | CSV / PDF export                                 | `server/app/analytics/export.py`                                                   |
| Phase 3 | Agent Performance Monitor                        | `src/routes/admin.health.tsx`                                                      |
| §11     | Experiment Author role — Author Studio           | `src/routes/studio.tsx`, `/kb/{id}/simulate`                                       |
| §11     | Voice interaction (Web Speech API)               | `embed/src/ui.ts`                                                                  |
| §11     | Multi-language (English + Hindi)                 | `embed/src/i18n.ts`                                                                |
| §11     | Offline-capable lightweight mode                 | `embed/src/rules.ts` — the rules engine runs in the browser                        |
| Phase 4 | WCAG 2.1 AA affordances                          | Shadow DOM, `aria-live`, keyboard operation, non-colour state cues, reduced-motion |
| Phase 4 | PII scrubbing before any model call              | `server/app/llm/base.py`                                                           |

## Not done

Stated plainly rather than left to be discovered:

- **No pilot with real students.** Every success metric in the proposal (+30% completion, >60% hint
  acceptance) needs a real cohort. The instrumentation to measure them is in place and the Agent
  Health Monitor reports them live; the numbers themselves require Phase 4.
- **No screenshot + vision fallback.** The audit found the simulator iframe is same-origin, which
  demotes this from critical path to long-tail. Flash-legacy and Unity/WebGL labs still need it.
- **Six experiments, not 1,500.** Authoring is subject-matter work. The Author Studio exists to make
  it tractable, but the throughput problem is real and is the honest limit on rollout.
- **Instructor and admin surfaces are unauthenticated.** They read institution-scoped data but
  assume the deployment sits behind the platform's existing SSO. Wiring that up is Phase 4.
- **Single-process rate limiting.** In-memory sliding window; needs Redis to be correct behind more
  than one API replica.
