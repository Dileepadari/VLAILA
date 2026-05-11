import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { X, MessageCircle } from "lucide-react";
import { useRole } from "@/lib/role";

const SUGGESTIONS: Record<string, { label: string; to: string }[]> = {
  student: [
    { label: "View my dashboard", to: "/dashboard" },
    { label: "See my assignments", to: "/dashboard/assignments" },
    { label: "Browse Computer Science labs", to: "/broad-areas/computer-science" },
    { label: "Open Colour Blindness experiment", to: "/labs/psychological-process/experiments/colour-blindness" },
  ],
  faculty: [
    { label: "Open faculty dashboard", to: "/faculty" },
    { label: "Class analytics", to: "/faculty/analytics" },
    { label: "Author custom hints", to: "/faculty/hints" },
  ],
  admin: [
    { label: "Org-wide analytics", to: "/admin" },
    { label: "Trending experiments", to: "/admin/trending" },
    { label: "Agent health", to: "/admin/health" },
  ],
  guest: [
    { label: "Login", to: "/login" },
    { label: "About Virtual Labs", to: "/about" },
  ],
};

export function LabBuddy() {
  const { role, name } = useRole();
  const [open, setOpen] = useState(false);
  const sugg = SUGGESTIONS[role] || SUGGESTIONS.guest;
  return (
    <div className="fixed bottom-6 left-6 z-40">
      {open && (
        <div className="mb-3 w-72 bg-white border rounded-xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-vlabs-cyan to-vlabs-blue text-white p-3 flex items-center gap-2">
            <BuddyAvatar />
            <div className="flex-1">
              <div className="font-semibold text-sm">Lab Buddy</div>
              <div className="text-[10px] opacity-90">Hi {name.split(" ")[0]}! Where to next?</div>
            </div>
            <button onClick={() => setOpen(false)}><X className="w-4 h-4" /></button>
          </div>
          <div className="p-2 space-y-1">
            {sugg.map((s) => (
              <Link key={s.to} to={s.to} onClick={() => setOpen(false)} className="block px-3 py-2 rounded hover:bg-muted text-sm text-vlabs-blue">{s.label}</Link>
            ))}
          </div>
          <div className="px-3 pb-3 text-[10px] text-muted-foreground">Friendly, welcoming, makes learning easy and fun.</div>
        </div>
      )}
      <button onClick={() => setOpen(!open)} aria-label="Open Lab Buddy" className="bg-white border-2 border-vlabs-cyan rounded-full p-2 shadow-lg buddy-bounce flex items-center gap-2 pr-4">
        <BuddyAvatar />
        <span className="text-xs font-semibold text-vlabs-blue hidden sm:inline">Lab Buddy</span>
        <MessageCircle className="w-4 h-4 text-vlabs-blue sm:hidden" />
      </button>
    </div>
  );
}

function BuddyAvatar() {
  return (
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-vlabs-amber to-vlabs-orange grid place-items-center text-lg shadow-inner relative">
      <span aria-hidden>🧪</span>
      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-vlabs-green border-2 border-white" />
    </div>
  );
}
