/**
 * Experiment page, on the *.vlabs.ac.in lab template.
 *
 * The live template gives each experiment a sidebar of nine pages -- Aim,
 * Objective, Theory, Pretest, Procedure, Simulation, Posttest, References,
 * Feedback -- under breadcrumbs back to the broad area, the lab and its
 * experiment list. A `page` search param stands in for the separate HTML
 * files the template ships.
 */

import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LabShell, type LabNavItem } from "@/components/vlabs/LabShell";
import { BROAD_AREAS, LABS, EXPERIMENT } from "@/lib/mock-data";
import ReactMarkdown from "react-markdown";

const PAGES = [
  "aim",
  "objective",
  "theory",
  "pretest",
  "procedure",
  "simulation",
  "posttest",
  "references",
  "feedback",
] as const;

type ExpPage = (typeof PAGES)[number];

const PAGE_LABELS: Record<ExpPage, string> = {
  aim: "Aim",
  objective: "Objective",
  theory: "Theory",
  pretest: "Pretest",
  procedure: "Procedure",
  simulation: "Simulation",
  posttest: "Posttest",
  references: "References",
  feedback: "Feedback",
};

export const Route = createFileRoute("/labs/$labId/experiments/$expId")({
  validateSearch: (search: Record<string, unknown>): { tab?: ExpPage } => {
    const tab = search.tab as ExpPage | undefined;
    return tab && PAGES.includes(tab) ? { tab } : {};
  },
  head: ({ params }) => ({
    meta: [
      { title: `${params.expId} - Experiment` },
      // The same markers the live ph3-lab-mgmt template publishes. The widget
      // reads these and needs nothing else, which is the point: this page
      // integrates the real assistant exactly the way a real lab would.
      { name: "experiment-short-name", content: params.expId },
      { name: "developer-institute", content: "IIITH" },
    ],
  }),
  component: ExperimentPage,
});

/**
 * Load the real widget, not a mock of it.
 *
 * `public/vlaila.js` is the shipping bundle built from `embed/`. Running it
 * here means the console demonstrates the actual product: if the widget
 * regresses, this page regresses with it.
 */
function useVlailaWidget(experimentId: string, task: string) {
  useEffect(() => {
    const meta =
      document.querySelector<HTMLMetaElement>('meta[name="task-name"]') ??
      document.head.appendChild(
        Object.assign(document.createElement("meta"), { name: "task-name" }),
      );
    meta.content = task;
  }, [task]);

  useEffect(() => {
    (window as any).dataLayer = [
      {
        labName: "Psychological Process",
        discipline: "Design Engineering",
        college: "IIITH",
        expName: EXPERIMENT.title,
        expShortName: experimentId,
      },
    ];
    if (document.getElementById("vlaila-script")) return;
    const script = document.createElement("script");
    script.id = "vlaila-script";
    script.src = "/vlaila.js";
    script.dataset.vlailaApi = import.meta.env?.VITE_VLAILA_API ?? "http://localhost:8000";
    script.defer = true;
    document.body.appendChild(script);
  }, [experimentId]);
}

function ExperimentPage() {
  const { labId, expId } = Route.useParams();
  const { tab = "aim" } = Route.useSearch();
  const lab = LABS.find((l) => l.id === labId);
  if (!lab) throw notFound();
  const experiment = lab.experiments.find((e) => e.id === expId);
  if (!experiment) throw notFound();

  useVlailaWidget(expId, PAGE_LABELS[tab]);

  const area = BROAD_AREAS.find((a) => a.slug === lab.area);

  const nav: LabNavItem[] = PAGES.map((p) => ({
    label: PAGE_LABELS[p],
    to: "/labs/$labId/experiments/$expId",
    params: { labId, expId },
    search: { tab: p },
    current: p === tab,
  }));

  return (
    <LabShell
      crumbs={[
        { label: area?.name ?? lab.area, to: "/broad-areas/$area", params: { area: lab.area } },
        { label: lab.name, to: "/labs/$labId", params: { labId } },
        {
          label: "Experiments",
          to: "/labs/$labId",
          params: { labId },
          search: { page: "experiments" },
        },
      ]}
      nav={nav}
    >
      <div className="text-center fix-spacing">
        <h2>{experiment.name}</h2>
      </div>

      {tab === "aim" && <p>{EXPERIMENT.aim}</p>}

      {tab === "objective" && (
        <p>
          To observe how each form of colour vision deficiency transforms an image, and to reason
          about which colour pairings remain distinguishable for affected users.
        </p>
      )}

      {tab === "theory" && <ReactMarkdown>{EXPERIMENT.theory}</ReactMarkdown>}

      {tab === "procedure" && (
        <ol>
          {EXPERIMENT.procedure.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ol>
      )}

      {tab === "pretest" && <Quiz items={EXPERIMENT.pretest} />}
      {tab === "posttest" && <Quiz items={EXPERIMENT.posttest} />}

      {tab === "simulation" && (
        <>
          <h3>Color Blindness Simulator</h3>
          <Simulator />
        </>
      )}

      {tab === "references" && (
        <ul>
          {EXPERIMENT.references.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      )}

      {tab === "feedback" && (
        <>
          <p>Tell us about your experience with this experiment.</p>
          <form onSubmit={(e) => e.preventDefault()}>
            <textarea rows={5} className="form-control mb-3" placeholder="Your feedback…" />
            <button type="submit" className="btn btn-primary">
              Submit Feedback
            </button>
          </form>
        </>
      )}
    </LabShell>
  );
}

function Simulator() {
  const [picked, setPicked] = useState<number | null>(null);
  const [mode, setMode] = useState<"normal" | "protan" | "deutan" | "tritan">("normal");
  const filters: Record<string, string> = {
    normal: "none",
    protan: "url(#protan)",
    deutan: "url(#deutan)",
    tritan: "url(#tritan)",
  };
  const images = [
    { bg: "linear-gradient(135deg,#ff8c42,#ffd166)", label: "Festival" },
    { bg: "linear-gradient(135deg,#06d6a0,#118ab2)", label: "Flag" },
    { bg: "linear-gradient(135deg,#ef476f,#ffd166)", label: "Holi" },
    { bg: "linear-gradient(135deg,#ffd166,#06d6a0)", label: "Fields" },
    { bg: "radial-gradient(circle,#ef476f 0%,#06d6a0 60%,#118ab2 100%)", label: "Ishihara" },
    {
      bg: "conic-gradient(from 0deg,#ef476f,#ffd166,#06d6a0,#118ab2,#7209b7,#ef476f)",
      label: "Spectrum",
    },
    { bg: "linear-gradient(135deg,#7209b7,#f72585,#4cc9f0)", label: "Burst" },
    { bg: "linear-gradient(135deg,#000,#dc2626 50%,#16a34a,#2563eb)", label: "Lights" },
  ];
  return (
    <div>
      <svg width="0" height="0" className="absolute">
        <defs>
          <filter id="protan">
            <feColorMatrix values="0.567 0.433 0 0 0  0.558 0.442 0 0 0  0 0.242 0.758 0 0  0 0 0 1 0" />
          </filter>
          <filter id="deutan">
            <feColorMatrix values="0.625 0.375 0 0 0  0.7 0.3 0 0 0  0 0.3 0.7 0 0  0 0 0 1 0" />
          </filter>
          <filter id="tritan">
            <feColorMatrix values="0.95 0.05 0 0 0  0 0.433 0.567 0 0  0 0.475 0.525 0 0  0 0 0 1 0" />
          </filter>
        </defs>
      </svg>
      <div className="grid grid-cols-4 gap-3">
        {images.map((img, i) => (
          <button
            key={i}
            onClick={() => setPicked(i)}
            className={`aspect-[4/3] rounded shadow-sm border-2 ${picked === i ? "border-vlabs-orange" : "border-transparent"}`}
            style={{ background: img.bg, filter: filters[mode] }}
          >
            <span className="sr-only">{img.label}</span>
          </button>
        ))}
      </div>
      <div className="flex gap-2 justify-center mt-5">
        {(["normal", "protan", "deutan", "tritan"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-3 py-1.5 rounded text-sm border ${mode === m ? "bg-vlabs-blue text-white" : "bg-white"}`}
          >
            {m === "normal"
              ? "Normal"
              : m === "protan"
                ? "Protanopia"
                : m === "deutan"
                  ? "Deuteranopia"
                  : "Tritanopia"}
          </button>
        ))}
      </div>
    </div>
  );
}

function Quiz({ items }: { items: { q: string; opts: string[]; a: number }[] }) {
  const [ans, setAns] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState(false);
  return (
    <div>
      <h2 className="text-vlabs-blue text-xl font-semibold mb-4">Test your understanding</h2>
      <div className="space-y-5">
        {items.map((it, i) => (
          <div key={i}>
            <div className="font-medium mb-2">
              {i + 1}. {it.q}
            </div>
            <div className="space-y-1">
              {it.opts.map((o, j) => (
                <label
                  key={j}
                  className={`block px-3 py-1.5 border rounded cursor-pointer text-sm ${submitted && it.a === j ? "border-vlabs-green bg-green-50" : submitted && ans[i] === j ? "border-vlabs-rose bg-red-50" : ""}`}
                >
                  <input
                    type="radio"
                    name={`q${i}`}
                    className="mr-2"
                    onChange={() => {
                      const c = [...ans];
                      c[i] = j;
                      setAns(c);
                    }}
                  />{" "}
                  {o}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={() => setSubmitted(true)}
        className="mt-4 bg-vlabs-blue text-white px-4 py-2 rounded text-sm"
      >
        Submit
      </button>
      {submitted && (
        <div className="mt-3 text-sm">
          Score:{" "}
          <strong>
            {ans.filter((a, i) => a === items[i].a).length} / {items.length}
          </strong>
        </div>
      )}
    </div>
  );
}
