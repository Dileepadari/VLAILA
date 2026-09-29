import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ApiDown, Empty, Loading, Panel } from "@/components/console/primitives";
import {
  useCreateHint,
  useCustomHints,
  useDeleteHint,
  useKbEntry,
  useKnowledgeBase,
} from "@/lib/api";
import type { KbStep } from "@/lib/api";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/faculty/hints")({ component: CustomHints });

const INSTITUTION = "IIIT Hyderabad";
const AUTHOR = "Dr. Aruna Sharma";

function CustomHints() {
  const kb = useKnowledgeBase();
  const [experimentId, setExperimentId] = useState("");
  const selected = experimentId || kb.data?.[0]?.experiment_id || "";

  const entry = useKbEntry(selected);
  const hints = useCustomHints(selected, INSTITUTION);
  const create = useCreateHint();
  const remove = useDeleteHint();

  const [stepId, setStepId] = useState("");
  const [text, setText] = useState("");
  const [level, setLevel] = useState<"nudge" | "specific">("nudge");

  const steps: KbStep[] = entry.data?.steps ?? [];
  const activeStep = stepId || steps[0]?.id || "";
  const kbStep = steps.find((s) => s.id === activeStep);
  const defaultHint = kbStep?.hints?.[level];

  if (kb.isError) return <ApiDown error={kb.error} />;
  if (kb.isLoading) return <Loading />;

  const submit = () => {
    if (!text.trim() || !activeStep) return;
    create.mutate(
      {
        experiment_id: selected,
        step_id: activeStep,
        institution: INSTITUTION,
        author: AUTHOR,
        text: text.trim(),
        level,
      },
      { onSuccess: () => setText("") },
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-vlabs-blue">Custom hints</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Wording you write here is served to your students ahead of the default hint for that step.
          It applies to <strong>{INSTITUTION}</strong> only - nothing you write reaches another
          college's students.
        </p>
      </div>

      <Panel title="Write a hint">
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="text-sm">
            <span className="block text-xs text-muted-foreground mb-1">Experiment</span>
            <select
              value={selected}
              onChange={(e) => {
                setExperimentId(e.target.value);
                setStepId("");
              }}
              className="w-full border rounded-lg px-3 py-2 bg-white"
            >
              {(kb.data ?? []).map((e) => (
                <option key={e.experiment_id} value={e.experiment_id}>
                  {e.title.length > 44 ? `${e.title.slice(0, 43)}…` : e.title}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="block text-xs text-muted-foreground mb-1">Step</span>
            <select
              value={activeStep}
              onChange={(e) => setStepId(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 bg-white"
              disabled={!steps.length}
            >
              {steps.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.task} · {s.title}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex gap-2 mt-3">
          {(["nudge", "specific"] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLevel(l)}
              className={`text-xs px-3 py-1.5 rounded-full border ${
                level === l
                  ? "border-vlabs-blue bg-accent text-vlabs-blue font-medium"
                  : "text-muted-foreground"
              }`}
            >
              {l === "nudge" ? "Level 1 · nudge" : "Level 2 · specific"}
            </button>
          ))}
        </div>

        {/* Showing the default the instructor is about to override is what
            stops them re-writing something that was already fine. */}
        {defaultHint && typeof defaultHint === "string" && (
          <p className="text-xs text-muted-foreground mt-3 border-l-2 border-border pl-3">
            <span className="font-medium">Default for this step:</span> {defaultHint}
          </p>
        )}

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder={
            kbStep
              ? `What should students hear at "${kbStep.title}"?`
              : "Pick a step to write a hint for."
          }
          className="w-full border rounded-lg p-3 text-sm mt-3 resize-y"
        />

        <div className="flex items-center gap-3 mt-2">
          <button
            onClick={submit}
            disabled={create.isPending || !text.trim()}
            className="bg-vlabs-blue text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {create.isPending ? "Saving…" : "Save hint"}
          </button>
          {create.isError && (
            <span className="text-xs text-vlabs-rose">
              {create.error instanceof Error ? create.error.message : "Could not save."}
            </span>
          )}
        </div>
      </Panel>

      <Panel title={`Your hints for ${INSTITUTION}`}>
        {hints.isLoading ? (
          <Loading />
        ) : hints.data?.length ? (
          <ul className="divide-y">
            {hints.data.map((h) => (
              <li key={h.id} className="py-3 first:pt-0 last:pb-0 flex gap-3">
                <div className="flex-1">
                  <div className="text-xs text-muted-foreground mb-1">
                    {steps.find((s) => s.id === h.step_id)?.title ?? h.step_id} · {h.level}
                  </div>
                  <p className="text-sm">{h.text}</p>
                  <div className="text-xs text-muted-foreground mt-1">by {h.author}</div>
                </div>
                <button
                  onClick={() => h.id && remove.mutate(h.id)}
                  className="text-muted-foreground hover:text-vlabs-rose h-fit p-1.5 rounded-lg hover:bg-muted"
                  aria-label="Delete hint"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <Empty
            title="No custom hints yet"
            body="Until you add one, students see the knowledge base default for every step."
          />
        )}
      </Panel>
    </div>
  );
}
