import { createFileRoute, Link, Outlet, notFound, useLocation } from "@tanstack/react-router";
import { PageLayout } from "@/components/vlabs/PageLayout";
import { LABS } from "@/lib/mock-data";

export const Route = createFileRoute("/labs/$labId")({
  component: LabLayout,
});

function LabLayout() {
  const { labId } = Route.useParams();
  const lab = LABS.find(l => l.id === labId);
  if (!lab) throw notFound();
  const loc = useLocation();
  const isExperiment = loc.pathname.includes("/experiments/");
  if (isExperiment) return <Outlet />;
  return (
    <PageLayout>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="text-vlabs-blue text-xl font-semibold mb-4">{lab.area === "computer-science" ? "Computer Science and Engineering" : lab.area}</div>
        <div className="grid md:grid-cols-[200px_1fr] gap-6">
          <aside className="space-y-1 text-sm border-l-2 border-vlabs-orange pl-3">
            {[
              ["", "Introduction"],
              ["objective", "Objective"],
              ["experiments", "List of experiments"],
              ["audience", "Target Audience"],
              ["alignment", "Course Alignment"],
              ["feedback", "Feedback"],
            ].map(([h, label]) => (
              <a key={label} href={`#${h}`} className="block py-1 hover:text-vlabs-orange">{label}</a>
            ))}
          </aside>
          <div className="space-y-8 text-sm">
            <h1 className="text-2xl text-vlabs-cyan font-bold text-center">{lab.name.replace(" Lab", "")}</h1>
            <Section id="" title="Introduction">{lab.intro}</Section>
            <Section id="objective" title="Objective">{lab.objective}</Section>
            <div id="experiments">
              <h3 className="font-semibold text-base mb-2">List of experiments</h3>
              <ol className="space-y-2">
                {lab.experiments.map((e, i) => (
                  <li key={e.id}>{i + 1}. <Link to="/labs/$labId/experiments/$expId" params={{ labId: lab.id, expId: e.id }} className="vlabs-link font-medium">{e.name}</Link> <span className="text-vlabs-amber">{"★".repeat(Math.round(e.rating))}</span></li>
                ))}
              </ol>
            </div>
            <Section id="audience" title="Target Audience">{lab.audience}</Section>
            <Section id="alignment" title="Course Alignment">{lab.courseAlignment}</Section>
            <div id="feedback" className="bg-white border rounded p-4">
              <h3 className="font-semibold mb-2">Feedback</h3>
              <textarea rows={3} className="w-full border rounded p-2 text-sm" placeholder="Your feedback helps us improve this lab..." />
              <button className="mt-2 bg-vlabs-blue text-white px-4 py-1.5 rounded text-sm">Submit</button>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <div id={id}>
      <h3 className="font-semibold text-base mb-2">{title}</h3>
      <p className="text-muted-foreground">{children}</p>
    </div>
  );
}
