# Platform Audit & Gap Analysis

_IS deliverable #1. Findings from hands-on inspection of the live Virtual Labs platform, and a
comparison of VLAILA against existing AI-assisted learning systems._

---

## 1. What Virtual Labs actually is

The single most consequential finding, and the one that reshaped the architecture:

> **Virtual Labs is not one application. It is roughly 200 independently-hosted static sites.**

`vlab.co.in` is a directory portal. Each lab lives on its own subdomain and is served as static
files. Labs sampled during the audit:

| Broad area                     | Labs found | Examples                                            |
| ------------------------------ | ---------: | --------------------------------------------------- |
| Computer Science & Engineering |         43 | `ds1-iiith`, `nlp-iiith`, `cn-iiith`, `python-iitk` |
| Electrical Engineering         |         30 | `bee-iitk`, `me-iitr`, `pe1-iitd`, `plc-coep`       |
| Physical Sciences              |         25 | `bop-iitk`, `ps-iitd`, `qtm-iitd`, `va-iitk`        |
| Chemical Sciences              |         15 | `inoc-amrt`, `pcv-amrt`, `bc1-iitk`, `csc-iiith`    |
| Electronics & Communication    |        30+ | `de-iitr`, `dld-iitb`, `dsp-iitkgp`                 |

There is no shared runtime, no shared session, and no server-side application to extend. Any
assistant that requires platform integration would need ~200 separate integrations.

## 2. The template is the integration surface

Every lab is generated from the same `ph3-lab-mgmt` static template. Confirmed by fetching pages
from three different labs, three different institutes and three different disciplines:

| Marker                                 | `pp-iiith` (Design)              | `de-iitr` (Electronics)            | `ds1-iiith` (CSE)              |
| -------------------------------------- | -------------------------------- | ---------------------------------- | ------------------------------ |
| `window.dataLayer[0]`                  |  Psychological Process / IIITH |  Digital Electronics IITR / IITR |  Data Structures - 1 / IIITH |
| `<meta name="experiment-short-name">`  | `colour-blindness`               | `half-full-adder`                  | `bubble-sort`                  |
| `<meta name="task-name">`              | `Simulation`                     | `Simulation`                       | `Demo`                         |
| `<meta name="developer-institute">`    | `IIITH`                          | `IITR`                             | `IIITH`                        |
| `iframe#fraDisabled.responsive-iframe` |  `simulation/index.html`       |  `simulation/index.html`         |  `simulation/bsdemo.html`    |
| Task nav (`.nav-menu a`)               | 8 pages                          | 8 pages                            | learning units                 |

**Three consequences.**

1. **Zero-configuration detection is possible.** Lab, experiment, discipline, institute and current
   step are all readable with no per-lab setup.
2. **The simulator iframe is same-origin.** Its DOM is fully readable, so the Screen Observer works
   on real interaction events. The original proposal treated a screenshot + vision fallback as
   critical path; this finding demotes it to a long-tail concern for the Flash-legacy and
   Unity/WebGL labs.
3. **Task naming is not universal.** The classic eight pages (Aim → Feedback) cover most labs, but
   `ds1-iiith` and its siblings define their own learning units (`Demo`, `Practice`, `Exercise`,
   `Quiz`, `Analysis`). The knowledge base schema therefore treats `task` as free text validated
   against a per-experiment list, not as a fixed enum. This was found late enough to have already
   been encoded as an enum, and the schema was corrected.

## 3. Simulator heterogeneity

The outer template is uniform. The simulators inside it are not - this is where the real
engineering variance lives.

| Lab                               | Simulator technology          | Selectors                                          | Observation                                    |
| --------------------------------- | ----------------------------- | -------------------------------------------------- | ---------------------------------------------- |
| `pp-iiith` / colour-blindness     | Plain JS + canvas             | `#protonopiaBtn`, `.image-thumbnail`, `#imageFile` | Clean ids; ideal case                          |
| `bop-iitk` / energy-band-gap      | Plain JS, ~40 ids             | `#btn_main`, `#eg_button`, `#calc_volt`            | Rich but undocumented                          |
| `inoc-amrt` / acid-base-titration | AngularJS + Angular Material  | `md-select`, `md-slider`, `#startExp`              | Framework components, no stable ids on options |
| `bee-iitk` / thevenin-theorem     | Nested chooser → form         | `#r1`, `#r2`, `#v1` inside a second frame          | Requires nested frame traversal                |
| `de-iitr` / half-full-adder       | Nested chooser → nested frame | `#Supply`, `#A`, `#B`, `#button` two levels deep   | Deepest nesting found                          |

**Design responses.** The observer walks nested frames to depth 3 and names them
(`sim`, `sim:half_adder`); the knowledge base's `frame` field accepts `sim` as a wildcard for
"anywhere in the simulator"; and selector matching falls back to an element's visible label,
because several simulators give their controls no stable id at all.

## 4. UX gaps observed

From working through 10+ experiments as a student would:

| Gap                            | Observed                                                                  | Consequence                                                        |
| ------------------------------ | ------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| No step validation             | Clicking a CVD filter with no image loaded does nothing at all - silently | Reads as a broken simulator, not a missed step                     |
| No ordering enforcement        | Every task page is reachable directly; a student can open Posttest first  | Assessment before the observation it tests                         |
| Uniform static instructions    | Same text regardless of what the student has done                         | Students who are stuck get the text they already didn't understand |
| No completion signal           | Nothing distinguishes "clicked through" from "understood"                 | Instructors cannot tell engagement from attendance                 |
| No feedback loop to authors    | Bug reports are free text, unlinked to a step                             | Content problems surface slowly, if at all                         |
| Unpowered-circuit failure mode | Toggling inputs before connecting supply produces no response             | The most common electrical-lab error is also the most invisible    |

## 5. Gap analysis against existing systems

| Capability                                  | Khanmigo     | Carnegie Learning MATHia | Duolingo Max | **VLAILA**                           |
| ------------------------------------------- | ------------ | ------------------------ | ------------ | ------------------------------------ |
| Domain                                      | K-12 general | Mathematics              | Language     | **Lab simulations, all disciplines** |
| Proactive without being asked               | Partial      |                        |             |                                    |
| Observes the actual UI the student is using |             |  (own UI)              |             |  **(a UI it does not own)**        |
| Works on third-party pages                  |             |                         |             |  one script tag                    |
| Grounded in per-task ground truth           | Partial      |                        |             |  per-experiment KB                 |
| Functions with no model available           |             |  (rule-based)          |             |  rules engine                      |
| Instructor step-level analytics             | Partial      |                        |             |                                    |
| Authoring tool for domain experts           |             | Internal                 |             |  Author Studio                     |
| Deployable on-premise                       |             |                         |             |  Ollama                            |
| Cost per intervention                       | Model call   | ~0                       | Model call   | **~0 for the majority**              |

MATHia is the closest prior art and the most instructive: its cognitive tutor is rule-based, not
generative, which is why it is dependable and cheap. Its limitation is that it only works inside
Carnegie's own software. VLAILA takes the same "deterministic rules for procedure" insight and
applies it to a UI it does not control, adding a model tier only for the conceptual work rules
genuinely cannot do.

## 6. Risks the audit surfaced

| Risk                                                  | Evidence                                          | Mitigation                                                                                                                |
| ----------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Lab content changes without notice                    | Sites are rebuilt independently by each institute | KB entries carry `origin` + `kb_version`; live-content diffing planned for Phase 4                                        |
| Selector churn breaks detection                       | Several simulators use generated/no ids           | Label-based matching fallback; `frame: sim` wildcard; the "report incorrect hint" queue surfaces breakage from real usage |
| Nested/legacy simulators                              | Flash-era and Unity labs exist in the long tail   | Coarse task-level tracking still supports prerequisites and concept prompts; vision fallback reserved for the true tail   |
| ~200 origins hitting one API                          | Every lab is a separate origin                    | Suffix-matched CORS, stateless API, per-session rate limits, CDN-cached bundle                                            |
| Authoring throughput, not engineering, limits rollout | 6 entries took real subject-matter effort         | Author Studio is a first-class deliverable, not an afterthought                                                           |

## 7. Conclusion

The platform's uniformity at the template level and its heterogeneity at the simulator level point
to one architecture: a **zero-config embedded widget** that detects context from shared metadata,
a **deterministic rules engine** driven by per-experiment authored ground truth, and a **model tier
consulted only for conceptual work**. That is what was built.
