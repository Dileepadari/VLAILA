/**
 * Broad-area lab listing.
 *
 * Reproduces the live page's row layout element for element: a `row row-flex
 * labs` block per lab, with the grey title cell carrying the lab name in
 * purple above the Reference Books / Syllabus Mapping disclosures, and the
 * dark institute cell on the right. Both disclosure panels are hidden until
 * toggled, as they are on vlab.co.in.
 */

import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { InnerPage, ContactRail } from "@/components/vlabs/InnerPage";
import { BROAD_AREAS, LABS } from "@/lib/mock-data";

export const Route = createFileRoute("/broad-areas/$area")({
  head: ({ params }) => {
    const a = BROAD_AREAS.find((x) => x.slug === params.area);
    return { meta: [{ title: `${a?.name ?? "Broad Area"} — Virtual Labs` }] };
  },
  component: AreaPage,
});

function AreaPage() {
  const { area } = Route.useParams();
  const a = BROAD_AREAS.find((x) => x.slug === area);
  if (!a) throw notFound();

  const labs = LABS.filter((l) => l.area === area);

  return (
    <InnerPage title={a.name} breadcrumb="Broad Areas of Virtual Labs" rail={<ContactRail />}>
      {labs.length ? (
        labs.map((lab) => <LabRow key={lab.id} lab={lab} />)
      ) : (
        <div className="row row-flex labs">
          <div className="col-md-9 col-sm-9 col-xs-12 lab-col-1">
            <div className="content">
              <h4>Labs for this area are being migrated</h4>
            </div>
          </div>
          <div className="col-md-3 col-sm-3 col-xs-12 lab-col-2">
            <div className="content" style={{ textAlign: "center" }}>
              <h4>Various institutes</h4>
            </div>
          </div>
        </div>
      )}

      <p className="hlh" style={{ paddingBottom: 0 }}>
        <a href="#nptel">
          Click here for related NPTEL video lectures
        </a>
      </p>
    </InnerPage>
  );
}

function LabRow({ lab }: { lab: (typeof LABS)[number] }) {
  const [open, setOpen] = useState<"books" | "syllabus" | null>(null);
  const toggleStyle = {
    background: "none",
    border: 0,
    color: "inherit",
    font: "inherit",
    padding: 0,
    cursor: "pointer",
  };

  return (
    <div className="row row-flex labs">
      <div className="col-md-9 col-sm-9 col-xs-12 lab-col-1">
        <div className="content">
          <Link to="/labs/$labId" params={{ labId: lab.id }}>
            <h4 style={{ color: "#430079" }}>{lab.name}</h4>
          </Link>
        </div>
        <div className="row row-flex">
          <div className="col-md-12 col-sm-12 col-xs-12 ref-main-div">
            <div className="content">
              <div className="row ref-div">
                <button
                  className="ref-book"
                  style={toggleStyle}
                  onClick={() => setOpen(open === "books" ? null : "books")}
                  aria-expanded={open === "books"}
                >
                  {" "}
                  Reference Books <i className="fa fa-chevron-down ref-icon" />
                </button>
                <button
                  className="syll-map"
                  style={toggleStyle}
                  onClick={() => setOpen(open === "syllabus" ? null : "syllabus")}
                  aria-expanded={open === "syllabus"}
                >
                  Syllabus Mapping <i className="fa fa-chevron-down syll-icon" />
                </button>
              </div>
            </div>
            {open === "books" && (
              <div className="ref-book-detail" style={{ display: "block" }}>
                <p>Reference Books</p>
                <ol>
                  {lab.experiments.slice(0, 2).map((e) => (
                    <li key={e.id}>Standard text covering {e.name}</li>
                  ))}
                </ol>
              </div>
            )}
            {open === "syllabus" && (
              <div className="syll-map-detail" style={{ display: "block" }}>
                <p>Syllabus Mapping</p>
                <ol>
                  <li>{lab.courseAlignment}</li>
                </ol>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="col-md-3 col-sm-3 col-xs-12 lab-col-2">
        <div className="content" style={{ textAlign: "center" }}>
          <h4>
            <Link to="/labs/$labId" params={{ labId: lab.id }}>
              {lab.institute}
            </Link>
          </h4>
        </div>
      </div>
    </div>
  );
}
