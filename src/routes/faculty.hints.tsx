import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
export const Route = createFileRoute("/faculty/hints")({
  component: () => {
    const [hints, setHints] = useState<{ step: string; text: string }[]>([
      { step: "Pretest Q3", text: "Remember: cones (not rods) detect color." },
    ]);
    const [step, setStep] = useState(""); const [text, setText] = useState("");
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-vlabs-blue">Custom Hints (per experiment)</h1>
        <p className="text-sm text-muted-foreground">VLAILA will serve these to <strong>your students</strong> in priority over default hints.</p>
        <div className="bg-white border rounded p-4 space-y-2 text-sm">
          <input value={step} onChange={e=>setStep(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="Step (e.g. 'Simulation: Switch CVD mode')" />
          <textarea value={text} onChange={e=>setText(e.target.value)} rows={3} className="w-full border rounded px-3 py-2" placeholder="Hint text shown to students..." />
          <button onClick={()=>{ if(step&&text){setHints([...hints,{step,text}]); setStep(""); setText("");} }} className="bg-vlabs-blue text-white px-4 py-2 rounded">Save hint</button>
        </div>
        <div className="bg-white border rounded divide-y text-sm">
          {hints.map((h,i) => (<div key={i} className="p-3"><div className="font-semibold text-vlabs-blue">{h.step}</div><div className="text-muted-foreground">{h.text}</div></div>))}
        </div>
      </div>
    );
  },
});
