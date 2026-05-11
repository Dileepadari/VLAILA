import { createFileRoute } from "@tanstack/react-router";
import { PageLayout } from "@/components/vlabs/PageLayout";
import { Banner } from "./about";

export const Route = createFileRoute("/nmeict")({
  head: () => ({ meta: [{ title: "NMEICT — Virtual Labs" }] }),
  component: () => (
    <PageLayout>
      <Banner title="NMEICT" />
      <div className="max-w-4xl mx-auto px-4 py-10 prose prose-sm">
        <p>The <strong>National Mission on Education through Information and Communication Technology (NMEICT)</strong> is a centrally sponsored scheme to leverage the potential of ICT in teaching and learning.</p>
        <p>Virtual Labs is one of the flagship projects under NMEICT, alongside SWAYAM, e-Yantra, NPTEL and many others.</p>
      </div>
    </PageLayout>
  ),
});
