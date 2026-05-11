import { createFileRoute } from "@tanstack/react-router";
import { PageLayout } from "@/components/vlabs/PageLayout";

export const Route = createFileRoute("/about")({
  head: () => ({ meta: [{ title: "About — Virtual Labs" }, { name: "description", content: "About Virtual Labs and its mission." }] }),
  component: () => (
    <PageLayout>
      <Banner title="About Virtual Labs" />
      <div className="max-w-5xl mx-auto px-4 py-10 prose prose-sm">
        <h2 className="text-vlabs-blue text-2xl font-bold mb-4">Our Mission</h2>
        <p>Virtual Labs is an initiative of the Ministry of Education, Government of India, under the National Mission on Education through Information and Communication Technology (NMEICT). The project aims to provide remote-access to simulation-based labs in various disciplines of Science and Engineering.</p>
        <p>The Virtual Labs project addresses the need for cost-effective, scalable laboratory access to students across India regardless of their location. Over <strong>1,500+ experiments</strong> are available across 12 participating institutes.</p>
        <h3 className="text-vlabs-blue font-semibold mt-6">Why Virtual Labs?</h3>
        <ul>
          <li>Remote access to laboratory experiments</li>
          <li>Self-paced learning environment</li>
          <li>Wide variety of experiments across disciplines</li>
          <li>Cost-effective alternative for under-resourced institutes</li>
          <li>Now enhanced with VLAILA — an AI Lab Assistant</li>
        </ul>
      </div>
    </PageLayout>
  ),
});

export function Banner({ title, crumbs }: { title: string; crumbs?: string[] }) {
  return (
    <>
      <div className="bg-vlabs-blue text-white">
        <div className="max-w-7xl mx-auto px-4 py-4 text-xl font-semibold">{title}</div>
      </div>
      {crumbs && (
        <div className="max-w-7xl mx-auto px-4 py-2 text-sm text-muted-foreground">
          {crumbs.map((c, i) => <span key={i}>{i > 0 && " » "}{c}</span>)}
        </div>
      )}
    </>
  );
}
