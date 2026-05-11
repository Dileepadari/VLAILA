import { Link } from "@tanstack/react-router";
import { useRole } from "@/lib/role";
import { Bell, ChevronDown, Search } from "lucide-react";
import { useState } from "react";
import type { Role } from "@/lib/mock-data";

export function VlabsHeader() {
  const { role, setRole, name } = useRole();
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="bg-vlabs-footer text-white text-xs">
        <div className="max-w-7xl mx-auto px-4 py-1.5 flex justify-between">
          <span>11 May, 2026 | 04:21:20 PM</span>
          <span>Visitors: 51,141,861 · Logged in as <strong>{name}</strong> ({role})</span>
        </div>
      </div>
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-6 flex-wrap">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-vlabs-cyan to-vlabs-blue grid place-items-center text-white font-bold text-xl">VL</div>
            <div>
              <div className="text-vlabs-blue font-bold text-xl leading-none">Virtual Labs</div>
              <div className="text-[10px] text-muted-foreground">An MoE Govt of India Initiative</div>
            </div>
          </Link>
          <div className="hidden md:block flex-1 text-sm">
            <div>An Initiative of <strong>Ministry of Education</strong></div>
            <div className="text-muted-foreground">Under the National Mission on Education through <span className="text-vlabs-rose font-semibold">ICT</span></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center border rounded px-2 py-1.5 text-sm">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input placeholder="Search Lab" className="bg-transparent outline-none px-2 w-40" />
            </div>
            <Link to="/dashboard/notifications" className="relative p-2 rounded hover:bg-muted">
              <Bell className="w-5 h-5 text-vlabs-blue" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-vlabs-rose" />
            </Link>
            <div className="relative">
              <button onClick={() => setOpen(!open)} className="flex items-center gap-2 px-3 py-2 rounded bg-muted text-sm">
                <span className="w-7 h-7 rounded-full bg-vlabs-blue text-white grid place-items-center text-xs font-bold">{name.split(" ").map(w => w[0]).slice(0,2).join("")}</span>
                <span className="hidden sm:inline">{role}</span>
                <ChevronDown className="w-4 h-4" />
              </button>
              {open && (
                <div className="absolute right-0 mt-1 bg-white border rounded shadow-lg w-56 z-50">
                  <div className="p-3 border-b text-xs text-muted-foreground">Switch role (mock)</div>
                  {(["student", "faculty", "admin", "guest"] as Role[]).map((r) => (
                    <button key={r} onClick={() => { setRole(r); setOpen(false); }} className={`w-full text-left px-3 py-2 text-sm hover:bg-muted ${role===r?"bg-accent":""}`}>{r}</button>
                  ))}
                  <div className="border-t">
                    <Link to="/login" onClick={() => setOpen(false)} className="block px-3 py-2 text-sm hover:bg-muted">Login / Sign up</Link>
                    <Link to="/onboarding" onClick={() => setOpen(false)} className="block px-3 py-2 text-sm hover:bg-muted">Onboarding</Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <nav className="bg-vlabs-blue text-white">
          <div className="max-w-7xl mx-auto px-4 flex flex-wrap gap-1 text-sm">
            {[
              ["/", "HOME"],
              ["/about", "ABOUT US"],
              ["/outreach", "OUTREACH PORTAL"],
              ["/partners", "PARTICIPATING INSTITUTES"],
              ["/nmeict", "NMEICT"],
              ["/contact", "CONTACT US"],
              ...(role === "student" || role === "faculty" || role === "admin"
                ? [["/dashboard", role === "student" ? "MY DASHBOARD" : role === "faculty" ? "FACULTY" : "ADMIN"]]
                : []),
            ].map(([to, label]) => (
              <Link key={to} to={to} className="px-4 py-2.5 hover:bg-white/10" activeProps={{ className: "bg-white/15 font-semibold" }}>{label}</Link>
            ))}
          </div>
        </nav>
        <div className="vlabs-divider" />
      </header>
    </>
  );
}

export function VlabsFooter() {
  return (
    <footer className="bg-vlabs-footer text-white/90 mt-12">
      <div className="max-w-7xl mx-auto px-4 py-10 grid md:grid-cols-4 gap-8 text-sm">
        <div>
          <h3 className="font-semibold mb-3 border-b border-white/20 pb-2">Quick Links</h3>
          <ul className="space-y-1.5">
            <li>Lab Feedback Form</li>
            <li>Lab Assessment Form</li>
            <li>FAQ</li>
            <li>Shakshat Portal</li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold mb-3 border-b border-white/20 pb-2">About VLAB</h3>
          <ul className="space-y-1.5">
            <li><Link to="/" className="hover:underline">Home</Link></li>
            <li><Link to="/about" className="hover:underline">About us</Link></li>
            <li><Link to="/contact" className="hover:underline">Contact Us</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold mb-3 border-b border-white/20 pb-2">Get In Touch With Us</h3>
          <p>support@vlab.co.in</p>
          <p>Phone(O): +91-9211460624</p>
          <p className="mt-2">Wireless Research Lab, Bharti School of Telecom, IIT Delhi, Hauz Khas, New Delhi-110016</p>
        </div>
        <div>
          <h3 className="font-semibold mb-3 border-b border-white/20 pb-2">Follow Us</h3>
          <div className="flex gap-2">
            {["T", "F", "Y", "L"].map(s => (
              <span key={s} className="w-8 h-8 grid place-items-center rounded-full bg-white/10">{s}</span>
            ))}
          </div>
          <p className="mt-4 text-xs text-white/60">AGPL 3.0 & Creative Commons (CC BY-NC-SA 4.0)</p>
        </div>
      </div>
    </footer>
  );
}
