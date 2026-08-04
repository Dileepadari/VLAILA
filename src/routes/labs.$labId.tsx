/**
 * Lab landing page, on the *.vlabs.ac.in lab template.
 *
 * The live template splits a lab across separate pages -- Introduction,
 * Objective, List of experiments, Target Audience, Course Alignment, Feedback
 * -- each with the sidebar highlighting the current one. That is reproduced
 * with a `page` search param so the URLs stay shareable.
 */

import { createFileRoute, Link, Outlet, notFound, useLocation } from "@tanstack/react-router";
import { LabShell, type LabNavItem } from "@/components/vlabs/LabShell";
import { BROAD_AREAS, LABS } from "@/lib/mock-data";

const PAGES = [
  "introduction",
  "objective",
  "experiments",
  "audience",
  "alignment",
  "feedback",
] as const;

type LabPage = (typeof PAGES)[number];

const PAGE_LABELS: Record<LabPage, string> = {
  introduction: "Introduction",
  objective: "Objective",
  experiments: "List of experiments",
  audience: "Target Audience",
  alignment: "Course Alignment",
  feedback: "Feedback",
};

export const Route = createFileRoute("/labs/$labId")({
  head: ({ params }) => {
    const lab = LABS.find((l) => l.id === params.labId);
    return { meta: [{ title: lab ? `${lab.name} — Virtual Labs` : "Virtual Labs" }] };
  },
  validateSearch: (search: Record<string, unknown>): { page?: LabPage } => {
    const page = search.page as LabPage | undefined;
    return page && PAGES.includes(page) ? { page } : {};
  },
  component: LabLayout,
});

function LabLayout() {
  const { labId } = Route.useParams();
  const { page = "introduction" } = Route.useSearch();
  const lab = LABS.find((l) => l.id === labId);
  if (!lab) throw notFound();

  const loc = useLocation();
  // The experiment route renders its own copy of the shell.
  if (loc.pathname.includes("/experiments/")) return <Outlet />;

  const area = BROAD_AREAS.find((a) => a.slug === lab.area);

  const nav: LabNavItem[] = PAGES.map((p) => ({
    label: PAGE_LABELS[p],
    to: "/labs/$labId",
    params: { labId },
    search: { page: p },
    current: p === page,
  }));

  return (
    <LabShell
      crumbs={[
        {
          label: area?.name ?? lab.area,
          to: "/broad-areas/$area",
          params: { area: lab.area },
        },
        { label: lab.name },
      ]}
      nav={nav}
    >
      <div className="text-center fix-spacing">
        <h2>{lab.name}</h2>
      </div>

      {page === "introduction" && <p>{lab.intro}</p>}
      {page === "objective" && <p>{lab.objective}</p>}
      {page === "audience" && <p>{lab.audience}</p>}
      {page === "alignment" && <p>{lab.courseAlignment}</p>}

      {page === "experiments" && (
        <ol>
          {lab.experiments.map((e) => (
            <li key={e.id}>
              <Link to="/labs/$labId/experiments/$expId" params={{ labId: lab.id, expId: e.id }}>
                {e.name}
              </Link>
            </li>
          ))}
        </ol>
      )}

      {page === "feedback" && (
        <>
          <p>
            Your feedback helps the lab authors improve this content. Tell us what worked and what
            did not.
          </p>
          <form onSubmit={(e) => e.preventDefault()}>
            <textarea rows={5} className="form-control mb-3" placeholder="Your feedback…" />
            <button type="submit" className="btn btn-primary">
              Submit
            </button>
          </form>
        </>
      )}
    </LabShell>
  );
}
