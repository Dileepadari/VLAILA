import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageLayout } from "@/components/vlabs/PageLayout";

const STEPS = [
  {
    q: "What's your primary goal here?",
    opts: ["Learn for college", "Independent learning", "Teach my class", "Manage my institute"],
  },
  {
    q: "Which discipline interests you most?",
    opts: ["Engineering", "Pure Sciences", "Design", "Humanities"],
  },
  {
    q: "How much time can you usually spend per session?",
    opts: ["< 15 min", "15-30 min", "30-60 min", "1+ hour"],
  },
  {
    q: "Would you like Lab Buddy to greet you with hints?",
    opts: ["Yes please!", "Only when I'm stuck", "Maybe later"],
  },
];

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Welcome - Virtual Labs" }] }),
  component: Onboarding,
});

function Onboarding() {
  const [step, setStep] = useState(0);
  const [picks, setPicks] = useState<number[]>([]);
  const cur = STEPS[step];
  if (!cur)
    return (
      <PageLayout>
        <div className="max-w-lg mx-auto my-16 text-center bg-white border rounded-xl p-8">
          <div className="text-5xl mb-3"></div>
          <h1 className="text-2xl font-bold text-vlabs-blue">You're all set!</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Lab Buddy will be there if you need help.
          </p>
          <Link
            to="/dashboard"
            className="inline-block mt-6 bg-vlabs-blue text-white px-5 py-2 rounded"
          >
            Go to dashboard
          </Link>
        </div>
      </PageLayout>
    );
  return (
    <PageLayout>
      <div className="max-w-lg mx-auto my-12 bg-white border rounded-xl p-8">
        <div className="flex justify-between items-center mb-4 text-xs text-muted-foreground">
          <span>
            Step {step + 1} of {STEPS.length}
          </span>
          <div className="flex-1 mx-3 h-1 bg-muted rounded">
            <div
              className="h-1 bg-vlabs-blue rounded"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>
        <h2 className="text-xl font-bold mb-4">{cur.q}</h2>
        <div className="space-y-2">
          {cur.opts.map((o, i) => (
            <button
              key={i}
              onClick={() => {
                setPicks([...picks, i]);
                setStep(step + 1);
              }}
              className="w-full text-left border rounded px-4 py-3 hover:border-vlabs-blue hover:bg-accent text-sm"
            >
              {o}
            </button>
          ))}
        </div>
      </div>
    </PageLayout>
  );
}
