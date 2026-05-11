import { useState, useEffect, useRef } from "react";
import { Bot, X, Send, Sparkles, AlertTriangle, Lightbulb, CheckCircle2, BookOpen, BarChart3, Volume2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useRole } from "@/lib/role";

type OrbState = "idle" | "hint" | "error" | "ok";

const STATE_COLOR: Record<OrbState, string> = {
  idle: "bg-vlabs-blue",
  hint: "bg-vlabs-amber",
  error: "bg-vlabs-rose",
  ok: "bg-vlabs-green",
};

const ROLE_GREETING = {
  student: "Hi! I'm VLAILA. I'll watch your steps and help when you get stuck.",
  faculty: "Welcome instructor — ask me anything about your class performance.",
  admin: "Hello admin. Try: 'show usage trends across IITs this month'.",
  guest: "Sign in to unlock proactive guidance and class analytics.",
};

const STUDENT_HINTS = [
  { type: "ok" as OrbState, title: "Looking good!", body: "You've finished the Theory section. Ready for the simulator?" },
  { type: "hint" as OrbState, title: "Quick nudge", body: "Looks like you may have skipped selecting an image. Want a hint?" },
  { type: "error" as OrbState, title: "Procedural deviation", body: "You started the simulation before choosing a CVD mode. **This is recoverable** — pick Protanopia/Deuteranopia/Tritanopia first." },
  { type: "hint" as OrbState, title: "Concept hint", body: "**Why does Deuteranopia look this way?** It's caused by the M-cone (green-sensitive) being absent or shifted." },
];

export function VlailaOrb({ context = "site" }: { context?: "site" | "experiment" }) {
  const { role } = useRole();
  const [state, setState] = useState<OrbState>("idle");
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"chat" | "hints" | "summary">("chat");
  const [hintIdx, setHintIdx] = useState(0);
  const [showIntervention, setShowIntervention] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "agent"; text: string }[]>([
    { role: "agent", text: ROLE_GREETING[role === "guest" ? "guest" : role] },
  ]);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  // Mock proactive intervention loop on experiment pages
  useEffect(() => {
    if (context !== "experiment" || role !== "student") return;
    const t = setTimeout(() => {
      setState(STUDENT_HINTS[hintIdx].type);
      setShowIntervention(true);
    }, 9000);
    return () => clearTimeout(t);
  }, [context, role, hintIdx]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, open]);

  const send = () => {
    if (!input.trim()) return;
    const user = input.trim();
    setMessages((m) => [...m, { role: "user", text: user }]);
    setInput("");
    setTimeout(() => {
      const reply = mockReply(user, role);
      setMessages((m) => [...m, { role: "agent", text: reply }]);
    }, 600);
  };

  const dismissIntervention = () => {
    setShowIntervention(false);
    setHintIdx((i) => Math.min(i + 1, STUDENT_HINTS.length - 1));
    setState("idle");
  };

  const acceptIntervention = () => {
    setOpen(true);
    setTab("chat");
    setMessages((m) => [...m, { role: "agent", text: STUDENT_HINTS[hintIdx].body }]);
    setShowIntervention(false);
    setState("ok");
    setHintIdx((i) => Math.min(i + 1, STUDENT_HINTS.length - 1));
  };

  return (
    <>
      {/* Intervention panel */}
      {showIntervention && context === "experiment" && (
        <div className="fixed bottom-28 right-6 z-40 w-80 bg-white border-l-4 border-vlabs-amber rounded-lg shadow-xl p-4 animate-in slide-in-from-right">
          <div className="flex items-start gap-2 mb-2">
            {state === "error" ? <AlertTriangle className="w-5 h-5 text-vlabs-rose" /> : <Lightbulb className="w-5 h-5 text-vlabs-amber" />}
            <div className="font-semibold text-sm">{STUDENT_HINTS[hintIdx].title}</div>
            <button onClick={dismissIntervention} className="ml-auto text-muted-foreground"><X className="w-4 h-4" /></button>
          </div>
          <div className="text-sm prose-chat"><ReactMarkdown>{STUDENT_HINTS[hintIdx].body}</ReactMarkdown></div>
          <div className="flex gap-2 mt-3">
            <button onClick={acceptIntervention} className="flex-1 px-3 py-1.5 bg-vlabs-blue text-white rounded text-sm">Show me</button>
            <button onClick={dismissIntervention} className="px-3 py-1.5 border rounded text-sm">Dismiss</button>
          </div>
        </div>
      )}

      {/* Floating orb */}
      <button
        onClick={() => setOpen(!open)}
        aria-label="Open VLAILA assistant"
        className={`fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full text-white shadow-lg grid place-items-center vlaila-orb-pulse ${STATE_COLOR[state]}`}
        style={{ color: state === "hint" ? "#d4a017" : state === "error" ? "#c0392b" : state === "ok" ? "#27ae60" : "#1e88a8" }}
      >
        <Bot className="w-7 h-7" />
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[360px] max-h-[70vh] bg-white rounded-xl shadow-2xl border flex flex-col overflow-hidden">
          <div className="px-4 py-3 bg-gradient-to-r from-vlabs-blue to-vlabs-cyan text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            <div className="flex-1">
              <div className="font-semibold">VLAILA</div>
              <div className="text-[10px] opacity-80">{role === "faculty" ? "Class context" : role === "admin" ? "Org-wide context" : "Experiment context"}</div>
            </div>
            <button onClick={() => setOpen(false)}><X className="w-5 h-5" /></button>
          </div>
          <div className="flex border-b text-sm">
            {(["chat", ...(context === "experiment" ? (["hints", "summary"] as const) : [])] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 ${tab === t ? "border-b-2 border-vlabs-blue font-semibold text-vlabs-blue" : "text-muted-foreground"}`}>
                {t === "chat" ? "Chat" : t === "hints" ? "Hints" : "Summary"}
              </button>
            ))}
          </div>

          {tab === "chat" && (
            <>
              <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-muted/30">
                {messages.map((m, i) => (
                  <div key={i} className={`max-w-[85%] rounded-lg px-3 py-2 text-sm prose-chat ${m.role === "user" ? "bg-vlabs-blue text-white ml-auto" : "bg-white border"}`}>
                    <ReactMarkdown>{m.text}</ReactMarkdown>
                  </div>
                ))}
                <div ref={endRef} />
              </div>
              <div className="flex gap-2 p-3 border-t">
                <button title="Voice input" className="p-2 border rounded text-muted-foreground"><Volume2 className="w-4 h-4" /></button>
                <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder={role === "admin" ? "Ask anything about your platform..." : "Ask about this experiment..."} className="flex-1 border rounded px-3 py-2 text-sm" />
                <button onClick={send} className="bg-vlabs-blue text-white p-2 rounded"><Send className="w-4 h-4" /></button>
              </div>
            </>
          )}

          {tab === "hints" && (
            <div className="p-4 space-y-3 overflow-y-auto">
              <div className="text-xs text-muted-foreground">Adaptive hints unlocked as you progress.</div>
              {STUDENT_HINTS.slice(0, hintIdx + 1).map((h, i) => (
                <div key={i} className="border-l-4 border-vlabs-amber bg-amber-50 p-3 rounded">
                  <div className="font-semibold text-sm flex items-center gap-2"><Lightbulb className="w-4 h-4" />{h.title}</div>
                  <div className="text-sm prose-chat mt-1"><ReactMarkdown>{h.body}</ReactMarkdown></div>
                </div>
              ))}
            </div>
          )}

          {tab === "summary" && (
            <div className="p-4 overflow-y-auto space-y-3 text-sm">
              <div className="flex items-center gap-2 font-semibold"><CheckCircle2 className="w-5 h-5 text-vlabs-green" /> Post-Experiment Summary</div>
              <div className="bg-muted p-3 rounded">
                <div className="flex justify-between"><span>Precision score</span><strong className="text-vlabs-green">88%</strong></div>
                <div className="flex justify-between"><span>Time on task</span><strong>14m 02s</strong></div>
                <div className="flex justify-between"><span>Hints used</span><strong>2</strong></div>
                <div className="flex justify-between"><span>Procedural deviations</span><strong>1 (recovered)</strong></div>
              </div>
              <div className="text-xs text-muted-foreground">
                You did well selecting CVD modes but hesitated on uploading your own image. Recommended review:
                <strong> M-cone vs L-cone deficiency</strong>.
              </div>
              <button className="w-full bg-vlabs-blue text-white py-2 rounded text-sm flex items-center justify-center gap-2">
                <BookOpen className="w-4 h-4" /> Take 3-question reflection quiz
              </button>
              {role === "faculty" && (
                <button className="w-full border py-2 rounded text-sm flex items-center justify-center gap-2">
                  <BarChart3 className="w-4 h-4" /> View class-wide aggregation
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}

function mockReply(input: string, role: string): string {
  const q = input.toLowerCase();
  if (role === "admin") {
    if (q.includes("trend") || q.includes("usage")) return "**Top growing labs (30d):**\n- Stroop Effect (+22%)\n- Colour Blindness (+18%)\n- Ohm's Law (+11%)\n\n_Tap chart to drill down by institute._";
    if (q.includes("struggl") || q.includes("abandon")) return "Labs with abandonment > 55%:\n1. Quantum Tunneling Sim — 69%\n2. Advanced Microprocessor — 62%\n3. Fluid Dynamics CFD — 58%";
    return "I can answer questions about: usage trends, struggling experiments, institute breakdowns, agent health, peak hours. Try one!";
  }
  if (role === "faculty") {
    if (q.includes("fail") || q.includes("stuck")) return "**3 students** are stuck on *'Switch CVD mode'*:\n- CS21B003 Ishaan Kumar\n- CS21B005 Rohan Das\n- CS21B006 Sara Khan\n\n_Suggested:_ Author a custom hint for this step.";
    return "Class avg: **78% completion**. Hottest pain point: *Simulation: Switch CVD mode* (41% confusion). Want a teaching suggestion?";
  }
  if (q.includes("why")) return "Great question. The cone with the deficiency cannot register that wavelength range, so the brain receives reduced signal — colors compress toward grey along that axis.";
  if (q.includes("hint")) return "Try selecting one of the gallery images first, then click a CVD mode button to see the transformation.";
  return "I'm grounded in this experiment's content. You can ask things like _'what is a cone cell?'_ or _'why does my reading not match expected?'_";
}
