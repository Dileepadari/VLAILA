import { createFileRoute } from "@tanstack/react-router";
import { InnerPage } from "@/components/vlabs/InnerPage";

export const Route = createFileRoute("/outreach")({
  head: () => ({ meta: [{ title: "Outreach Portal — Virtual Labs" }] }),
  component: Outreach,
});

function Outreach() {
  return (
    <InnerPage title="Outreach Portal">
      <div className="obj-text-inner">
        <p>
          The Virtual Labs Outreach Programme brings the platform to colleges across India through
          Nodal Centres, workshops and on-site training. Nodal Centres run awareness sessions,
          collect usage feedback and help faculty map Virtual Labs experiments onto their own
          syllabus.
        </p>
        <p>
          The live portal is hosted separately at{" "}
          <a href="https://centraloutreach.vlabs.co.in/" className="text-blue">
            centraloutreach.vlabs.co.in
          </a>
          .
        </p>
      </div>

      <table className="vl-tbl">
        <thead>
          <tr>
            <th>Programme</th>
            <th>Who it is for</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Nodal Centre enrolment</td>
            <td>Colleges wishing to host and champion Virtual Labs on campus</td>
          </tr>
          <tr>
            <td>Faculty workshops</td>
            <td>Teaching staff mapping experiments onto their syllabus</td>
          </tr>
          <tr>
            <td>Student awareness sessions</td>
            <td>Undergraduate cohorts new to the platform</td>
          </tr>
        </tbody>
      </table>
    </InnerPage>
  );
}
