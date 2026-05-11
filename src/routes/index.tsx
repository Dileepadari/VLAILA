import { createFileRoute, Link } from "@tanstack/react-router";
import { PageLayout } from "@/components/vlabs/PageLayout";
import { BROAD_AREAS, ORG_STATS } from "@/lib/mock-data";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useRole } from "@/lib/role";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Virtual Labs — An MoE Govt of India Initiative" },
      { name: "description", content: "Free browser-based simulation labs from IITs, IIITs and NITs across India." },
    ],
  }),
  component: Home,
});

function Home() {
  const { role } = useRole();
  return (
    <PageLayout>
      {/* Hero carousel mock */}
      <section className="relative bg-gradient-to-br from-vlabs-navy to-vlabs-blue text-white">
        <div className="max-w-7xl mx-auto px-4 py-16 md:py-24 grid md:grid-cols-2 gap-8 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-xs mb-4">
              <Sparkles className="w-3.5 h-3.5" /> Now powered by VLAILA — your AI Lab Assistant
            </div>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">Learn by experimenting,<br/>from anywhere in India.</h1>
            <p className="mt-4 text-white/85 max-w-lg">1,500+ free simulation labs from IITs, IIITs and NITs. With Lab Buddy and VLAILA, you're never stuck.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/broad-areas/computer-science" className="bg-white text-vlabs-blue font-semibold px-5 py-2.5 rounded">Explore Labs</Link>
              {role === "guest" ? <Link to="/login" className="border border-white/40 px-5 py-2.5 rounded">Sign in</Link> : <Link to="/dashboard" className="border border-white/40 px-5 py-2.5 rounded">My Dashboard</Link>}
            </div>
          </div>
          <div className="hidden md:block bg-white/10 rounded-2xl p-6 backdrop-blur">
            <div className="flex items-center justify-between mb-3"><span className="text-xs uppercase tracking-wider opacity-70">Live snapshot</span><span className="w-2 h-2 rounded-full bg-vlabs-green animate-pulse" /></div>
            <Stat label="Active users (30d)" value={ORG_STATS.activeUsers30d.toLocaleString()} />
            <Stat label="Experiments run (all-time)" value={ORG_STATS.experimentsAllTime.toLocaleString()} />
            <Stat label="This month" value={ORG_STATS.experimentsThisMonth.toLocaleString()} />
          </div>
        </div>
        <button className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/20"><ChevronLeft /></button>
        <button className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/20"><ChevronRight /></button>
      </section>

      {/* Tabs */}
      <section className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 flex gap-6">
          <button className="px-4 py-3 border-b-2 border-vlabs-blue font-semibold text-vlabs-blue">OBJECTIVES</button>
          <button className="px-4 py-3 text-muted-foreground">THE PHILOSOPHY</button>
        </div>
      </section>

      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <h2 className="text-center text-2xl font-bold text-vlabs-blue mb-8">Objectives</h2>
          <ol className="space-y-3 max-w-4xl mx-auto text-sm">
            <li>1. To provide remote-access to simulation-based Labs in various disciplines of Science and Engineering.</li>
            <li>2. To enthuse students to conduct experiments by arousing their curiosity. This would help them in learning basic and advanced concepts through remote experimentation.</li>
            <li>3. To provide a complete Learning Management System around the Virtual Labs where the students/ teachers can avail the various tools for learning, including additional web-resources, video-lectures, animated demonstrations and self-evaluation.</li>
          </ol>
        </div>
      </section>

      {/* Broad areas */}
      <section className="bg-muted/40">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <h2 className="text-center text-2xl font-bold text-vlabs-blue mb-8">Broad Areas of Virtual Labs</h2>
          <div className="grid md:grid-cols-2 gap-3 max-w-4xl mx-auto">
            {BROAD_AREAS.map((a) => (
              <Link key={a.slug} to="/broad-areas/$area" params={{ area: a.slug }} className="bg-white rounded shadow-sm px-4 py-3 flex items-center gap-3 hover:shadow-md transition group">
                <span className="w-3 h-3 rounded-full" style={{ background: a.color }} />
                <span className="vlabs-link font-medium group-hover:underline">{a.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">{a.labs} labs</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Participating institutes */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <h2 className="text-center text-2xl font-bold text-vlabs-blue mb-8">Participating Institutes</h2>
          <div className="flex gap-6 justify-center flex-wrap">
            {["NITK SURATHKAL", "COEP PUNE", "IIT KHARAGPUR", "IIIT HYDERABAD", "IIT GUWAHATI", "IIT DELHI", "IIT BOMBAY", "IIT KANPUR", "IIT MADRAS", "IIT ROORKEE"].map(n => (
              <div key={n} className="text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-vlabs-cyan to-vlabs-blue grid place-items-center text-white font-bold mb-2">{n.split(" ").map(w => w[0]).slice(0,2).join("")}</div>
                <div className="text-xs">{n}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-muted/40">
        <div className="max-w-7xl mx-auto px-4 py-10 grid md:grid-cols-2 gap-6">
          <div className="bg-white p-5 rounded shadow-sm">
            <h3 className="font-semibold text-vlabs-blue mb-3">Announcements</h3>
            <ul className="space-y-3 text-sm">
              <li>* Various projects/ICT initiatives of the Ministry of Education are available on the link given here. <span className="vlabs-link">Please click here for more details.</span></li>
              <li>* Please click here to see the tutorial for using the Flash-based Labs through Virtual Box</li>
              <li>* Find the Expression of Interest (EoI) 2026 to enroll as the Virtual Labs' Nodal Center at your institute. ✋</li>
            </ul>
          </div>
          <div className="bg-vlabs-navy text-white p-5 rounded shadow-sm grid place-items-center">
            <div className="text-center">
              <div className="text-6xl mb-3">▶</div>
              <div>Watch the Virtual Labs intro video</div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <h2 className="text-center text-2xl font-bold text-vlabs-blue mb-8">Testimonials</h2>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            {[
              ["Virtual Labs enables self-paced learning that fits anywhere.", "Dr. Mohd Zubair Ansari", "NIT Srinagar"],
              ["The platform helps students realize the look and feel of real labs.", "Dr. Khyati Chopra", "USAR, GGSIPU"],
              ["A platform that opens up the science and technology domain.", "Dr. Pankaj K. Goswami", "Amity University Lucknow"],
            ].map(([q, name, org]) => (
              <div key={name} className="bg-white border rounded p-4">
                <p className="italic mb-3">"{q}"</p>
                <div className="text-vlabs-blue font-semibold">{name}</div>
                <div className="text-xs text-muted-foreground">{org}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-vlabs-cyan text-white">
        <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-3 text-center">
          <div><div className="text-xs">Vlabs Outreach</div></div>
          <div><div className="text-xs">Website PageViews</div><div className="text-2xl font-bold">81,330,147</div></div>
          <div><div className="text-xs">Participants Attended</div><div className="text-2xl font-bold">8,560,251</div></div>
        </div>
      </section>
    </PageLayout>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-2 border-b border-white/10 last:border-0 flex justify-between text-sm">
      <span className="opacity-80">{label}</span><strong>{value}</strong>
    </div>
  );
}
