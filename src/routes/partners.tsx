import { createFileRoute } from "@tanstack/react-router";
import { InnerPage, ContactRail } from "@/components/vlabs/InnerPage";
import { INSTITUTES } from "@/lib/mock-data";

export const Route = createFileRoute("/partners")({
  head: () => ({ meta: [{ title: "Participating Institutes — Virtual Labs" }] }),
  component: Partners,
});

/**
 * Layout from https://www.vlab.co.in/participating-institutes: a four-per-row
 * grid of crests, each a submit button posting the institute's nodal-centre
 * code. The button styling is the live page's own inline reset.
 */
function Partners() {
  const rows: (typeof INSTITUTES)[] = [];
  for (let i = 0; i < INSTITUTES.length; i += 4) rows.push(INSTITUTES.slice(i, i + 4));

  return (
    <InnerPage
      title="Participating Institutes"
      breadcrumb="Participating Institutes"
      rail={<ContactRail />}
    >
      <div className="obj-heading-inner">Participating Institutes</div>
      <div className="obj-text-inner">
        {rows.map((row, i) => (
          <div className="row" key={i}>
            {row.map((inst) => (
              <div className="col-md-3 col-xs-6" style={{ marginBottom: 20 }} key={inst.img}>
                <center>
                  <button
                    type="button"
                    style={{ border: "none", outline: "none", background: "none" }}
                  >
                    <img
                      src={`/vl/Inst_logo/${inst.img}`}
                      style={{ width: 90, height: 90 }}
                      alt=""
                    />
                    <br />
                    <b>{inst.name}</b>
                  </button>
                </center>
              </div>
            ))}
          </div>
        ))}
      </div>
    </InnerPage>
  );
}
