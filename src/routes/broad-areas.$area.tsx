import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { PageLayout } from "@/components/vlabs/PageLayout";
import { Banner } from "./about";
import { BROAD_AREAS, LABS } from "@/lib/mock-data";
import { ChevronDown } from "lucide-react";

export const Route = createFileRoute("/broad-areas/$area")({
  head: ({ params }) => {
    const a = BROAD_AREAS.find(x => x.slug === params.area);
    return { meta: [{ title: `${a?.name ?? "Broad Area"} — Virtual Labs` }] };
  },
  component: AreaPage,
});

function AreaPage() {
  const { area } = Route.useParams();
  const a = BROAD_AREAS.find(x => x.slug === area);
  if (!a) throw notFound();
  const labs = LABS.filter(l => l.area === area);
  // pad with placeholder labs
  const display = labs.length ? labs : [{ id: "intro", name: `${a.name} — Coming soon`, institute: "TBA", area } as any];
  return (
    <PageLayout>
      <Banner title={a.name} crumbs={["Home", "Broad Areas of Virtual Labs"]} />
      <div className="max-w-6xl mx-auto px-4 py-8 grid md:grid-cols-[1fr_280px] gap-6">
        <div className="space-y-3">
          {display.map((l) => (
            <Link key={l.id} to="/labs/$labId" params={{ labId: l.id }} className="bg-white border rounded flex items-stretch hover:shadow-md transition">
              <div className="flex-1 p-4">
                <div className="text-vlabs-blue font-semibold">{l.name} {labs.length === 0 ? "" : "(New)"}</div>
                <div className="flex gap-3 mt-2 text-xs text-vlabs-orange">
                  <span className="flex items-center gap-1">Reference Books <ChevronDown className="w-3 h-3" /></span>
                  <span className="flex items-center gap-1">Syllabus Mapping <ChevronDown className="w-3 h-3" /></span>
                </div>
              </div>
              <div className="bg-muted-foreground/80 text-white grid place-items-center w-32 text-sm font-semibold">{l.institute}</div>
            </Link>
          ))}
          {labs.length > 0 && (
            <a href="#" className="text-vlabs-blue inline-flex items-center gap-2 mt-4">👉 Click here for related NPTEL video lectures</a>
          )}
        </div>
        <aside className="bg-white border rounded p-4">
          <div className="font-semibold border-b pb-2 mb-2">Announcements</div>
          <p className="text-sm text-muted-foreground">* Various projects/ICT initiatives of the Ministry of Education are available — <span className="vlabs-link">click here for more details</span>.</p>
        </aside>
      </div>
    </PageLayout>
  );
}
