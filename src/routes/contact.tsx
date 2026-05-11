import { createFileRoute } from "@tanstack/react-router";
import { PageLayout } from "@/components/vlabs/PageLayout";
import { Banner } from "./about";

export const Route = createFileRoute("/contact")({
  head: () => ({ meta: [{ title: "Contact — Virtual Labs" }] }),
  component: () => (
    <PageLayout>
      <Banner title="Contact Us" />
      <div className="max-w-5xl mx-auto px-4 py-10 grid md:grid-cols-2 gap-6">
        <div className="bg-white border rounded p-6 text-sm">
          <h3 className="text-vlabs-blue font-semibold mb-2">Reach us</h3>
          <p>📧 support@vlab.co.in</p>
          <p>📞 +91-9211460624</p>
          <p>📞 011-26582050 (General Information)</p>
          <p className="mt-3">Wireless Research Lab, Room No 206/IIA, Bharti School of Telecom, Indian Institute of Technology Delhi, Hauz Khas, New Delhi-110016</p>
        </div>
        <form className="bg-white border rounded p-6 space-y-3">
          <h3 className="text-vlabs-blue font-semibold">Send a message</h3>
          <input className="w-full border rounded px-3 py-2 text-sm" placeholder="Name" />
          <input className="w-full border rounded px-3 py-2 text-sm" placeholder="Email" />
          <textarea rows={4} className="w-full border rounded px-3 py-2 text-sm" placeholder="Message" />
          <button type="button" className="bg-vlabs-blue text-white px-4 py-2 rounded text-sm">Send</button>
        </form>
      </div>
    </PageLayout>
  ),
});
