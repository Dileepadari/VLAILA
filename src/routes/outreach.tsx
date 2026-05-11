import { createFileRoute } from "@tanstack/react-router";
import { PageLayout } from "@/components/vlabs/PageLayout";
import { Banner } from "./about";

export const Route = createFileRoute("/outreach")({
  head: () => ({ meta: [{ title: "Outreach Portal — Virtual Labs" }] }),
  component: () => (
    <PageLayout>
      <Banner title="Outreach Portal" />
      <div className="max-w-6xl mx-auto px-4 py-10 grid md:grid-cols-3 gap-4">
        {[
          ["Workshops", "200+ workshops conducted across India in 2025–26."],
          ["Nodal Centers", "350+ nodal centers actively supporting students."],
          ["Skill Development", "Tie-ups with NSDC for skill certification."],
          ["Faculty Training", "Quarterly faculty development programs."],
          ["Outreach Reports", "Quarterly impact reports published openly."],
          ["Partner with Us", "Apply to become a Nodal Center for your institute."],
        ].map(([t, d]) => (
          <div key={t} className="bg-white border rounded p-5">
            <h3 className="font-semibold text-vlabs-blue">{t}</h3>
            <p className="text-sm text-muted-foreground mt-2">{d}</p>
          </div>
        ))}
      </div>
    </PageLayout>
  ),
});
