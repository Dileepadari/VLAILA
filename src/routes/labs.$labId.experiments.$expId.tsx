import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { PageLayout } from "@/components/vlabs/PageLayout";
import { LABS, EXPERIMENT } from "@/lib/mock-data";
import ReactMarkdown from "react-markdown";
import { Star, AlertOctagon, Bug, ChevronDown } from "lucide-react";

export const Route = createFileRoute("/labs/$labId/experiments/$expId")({
  head: ({ params }) => ({ meta: [{ title: `${params.expId} — Experiment` }] }),
  component: ExperimentPage,
});

const TABS = ["Aim", "Theory", "Pretest", "Procedure", "Simulation", "Posttest", "References", "Feedback"] as const;

function ExperimentPage() {
  const { labId } = Route.useParams();
  const lab = LABS.find(l => l.id === labId);
  if (!lab) throw notFound();
  const [tab, setTab] = useState<typeof TABS[number]>("Simulation");
  const [showInstr, setShowInstr] = useState(true);
  return (
    <PageLayout vlailaContext="experiment">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <button className="text-2xl">☰</button>
          <h1 className="flex-1 text-center text-vlabs-cyan font-semibold text-lg md:text-xl">{EXPERIMENT.title}</h1>
          <div className="hidden md:flex items-center gap-1 text-vlabs-amber">{[1,2,3,4].map(i=><Star key={i} className="w-4 h-4 fill-current" />)}<Star className="w-4 h-4" /></div>
          <button className="bg-vlabs-cyan text-white px-3 py-1.5 rounded text-xs flex items-center gap-1"><AlertOctagon className="w-3 h-3" /> Rate Me</button>
          <button className="bg-vlabs-cyan text-white px-3 py-1.5 rounded text-xs flex items-center gap-1"><Bug className="w-3 h-3" /> Report a Bug</button>
        </div>
      </div>
      <div className="vlabs-divider" />
      <div className="max-w-7xl mx-auto px-4 py-6 grid md:grid-cols-[180px_1fr] gap-6">
        <aside className="space-y-1 text-sm">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} className={`block w-full text-left py-1.5 px-2 rounded ${tab === t ? "text-vlabs-orange font-semibold" : "text-vlabs-blue hover:bg-muted"}`}>{t}</button>
          ))}
          <Link to="/labs/$labId" params={{ labId }} className="block mt-3 text-xs text-muted-foreground">← Back to lab</Link>
        </aside>
        <div className="bg-white border rounded p-6">
          {tab === "Simulation" && (
            <>
              {showInstr && (
                <div className="border-2 border-vlabs-green rounded px-4 py-3 mb-6 flex items-center justify-between bg-green-50/50">
                  <strong className="text-sm">Instructions for Using the Colour Blindness Simulator</strong>
                  <button onClick={() => setShowInstr(false)} className="text-vlabs-rose"><ChevronDown /></button>
                </div>
              )}
              <h2 className="text-2xl font-bold text-center mb-6">Color Blindness Simulator</h2>
              <Simulator />
              <div className="text-center mt-6">
                <p className="text-sm">Select an Image from Your System:</p>
                <div className="inline-flex items-center gap-2 mt-2 border rounded px-3 py-1.5 text-sm"><button className="bg-muted px-2 rounded">Browse...</button>No file selected.</div>
              </div>
              <div className="text-center mt-4">
                <button className="bg-vlabs-cyan text-white px-4 py-2 rounded text-sm">Try Again</button>
              </div>
            </>
          )}
          {tab === "Aim" && <Section title="Aim">{EXPERIMENT.aim}</Section>}
          {tab === "Theory" && <div className="prose prose-sm max-w-none"><h2 className="text-vlabs-blue underline">Theory</h2><ReactMarkdown>{EXPERIMENT.theory}</ReactMarkdown></div>}
          {tab === "Procedure" && (
            <Section title="Procedure">
              <ol className="list-decimal pl-5 space-y-2">{EXPERIMENT.procedure.map((p, i) => <li key={i}>{p}</li>)}</ol>
            </Section>
          )}
          {tab === "Pretest" && <Quiz items={EXPERIMENT.pretest} />}
          {tab === "Posttest" && <Quiz items={EXPERIMENT.posttest} />}
          {tab === "References" && (
            <Section title="References">
              <ul className="list-disc pl-5 space-y-1">{EXPERIMENT.references.map((r, i) => <li key={i}>{r}</li>)}</ul>
            </Section>
          )}
          {tab === "Feedback" && (
            <div>
              <h2 className="text-vlabs-blue text-xl font-semibold mb-3">Feedback</h2>
              <div className="flex gap-1 mb-3 text-vlabs-amber">{[1,2,3,4,5].map(i=><Star key={i} className="w-6 h-6" />)}</div>
              <textarea rows={4} className="w-full border rounded p-2 text-sm" placeholder="Tell us about your experience..." />
              <button className="mt-2 bg-vlabs-blue text-white px-4 py-2 rounded text-sm">Submit Feedback</button>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="prose prose-sm max-w-none">
      <h2 className="text-vlabs-blue underline">{title}</h2>
      <div className="text-foreground">{children}</div>
    </div>
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
    { bg: "conic-gradient(from 0deg,#ef476f,#ffd166,#06d6a0,#118ab2,#7209b7,#ef476f)", label: "Spectrum" },
    { bg: "linear-gradient(135deg,#7209b7,#f72585,#4cc9f0)", label: "Burst" },
    { bg: "linear-gradient(135deg,#000,#dc2626 50%,#16a34a,#2563eb)", label: "Lights" },
  ];
  return (
    <div>
      <svg width="0" height="0" className="absolute">
        <defs>
          <filter id="protan"><feColorMatrix values="0.567 0.433 0 0 0  0.558 0.442 0 0 0  0 0.242 0.758 0 0  0 0 0 1 0" /></filter>
          <filter id="deutan"><feColorMatrix values="0.625 0.375 0 0 0  0.7 0.3 0 0 0  0 0.3 0.7 0 0  0 0 0 1 0" /></filter>
          <filter id="tritan"><feColorMatrix values="0.95 0.05 0 0 0  0 0.433 0.567 0 0  0 0.475 0.525 0 0  0 0 0 1 0" /></filter>
        </defs>
      </svg>
      <div className="grid grid-cols-4 gap-3">
        {images.map((img, i) => (
          <button key={i} onClick={() => setPicked(i)} className={`aspect-[4/3] rounded shadow-sm border-2 ${picked===i?"border-vlabs-orange":"border-transparent"}`} style={{ background: img.bg, filter: filters[mode] }}>
            <span className="sr-only">{img.label}</span>
          </button>
        ))}
      </div>
      <div className="flex gap-2 justify-center mt-5">
        {(["normal", "protan", "deutan", "tritan"] as const).map(m => (
          <button key={m} onClick={() => setMode(m)} className={`px-3 py-1.5 rounded text-sm border ${mode===m?"bg-vlabs-blue text-white":"bg-white"}`}>{m === "normal" ? "Normal" : m === "protan" ? "Protanopia" : m === "deutan" ? "Deuteranopia" : "Tritanopia"}</button>
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
            <div className="font-medium mb-2">{i + 1}. {it.q}</div>
            <div className="space-y-1">
              {it.opts.map((o, j) => (
                <label key={j} className={`block px-3 py-1.5 border rounded cursor-pointer text-sm ${submitted && it.a === j ? "border-vlabs-green bg-green-50" : submitted && ans[i]===j ? "border-vlabs-rose bg-red-50" : ""}`}>
                  <input type="radio" name={`q${i}`} className="mr-2" onChange={() => { const c=[...ans]; c[i]=j; setAns(c); }} /> {o}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      <button onClick={() => setSubmitted(true)} className="mt-4 bg-vlabs-blue text-white px-4 py-2 rounded text-sm">Submit</button>
      {submitted && <div className="mt-3 text-sm">Score: <strong>{ans.filter((a,i)=>a===items[i].a).length} / {items.length}</strong></div>}
    </div>
  );
}
