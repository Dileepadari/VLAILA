import { createFileRoute } from "@tanstack/react-router";
import { InnerPage } from "@/components/vlabs/InnerPage";

export const Route = createFileRoute("/nmeict")({
  head: () => ({ meta: [{ title: "NMEICT - Virtual Labs" }] }),
  component: Nmeict,
});

function Nmeict() {
  return (
    <InnerPage title="NMEICT">
      <div className="obj-heading-inner">
        National Mission on Education through Information and Communication Technology
      </div>
      <div className="obj-text-inner">
        <p>
          Virtual Labs is funded by the Ministry of Education under the National Mission on
          Education through Information and Communication Technology (NMEICT). The Mission aims to
          leverage the potential of ICT in teaching and learning for the benefit of all learners in
          higher education institutions, at any time and any place.
        </p>
        <p>
          More information is available at{" "}
          <a href="http://www.nmeict.ac.in" className="text-blue">
            nmeict.ac.in
          </a>
          .
        </p>
      </div>
    </InnerPage>
  );
}
