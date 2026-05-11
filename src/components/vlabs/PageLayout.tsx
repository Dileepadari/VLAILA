import type { ReactNode } from "react";
import { VlabsHeader, VlabsFooter } from "./Shell";
import { VlailaOrb } from "@/components/vlaila/Orb";
import { LabBuddy } from "@/components/vlaila/LabBuddy";

export function PageLayout({ children, vlailaContext = "site" }: { children: ReactNode; vlailaContext?: "site" | "experiment" }) {
  return (
    <div className="min-h-screen flex flex-col">
      <VlabsHeader />
      <main className="flex-1">{children}</main>
      <VlabsFooter />
      <LabBuddy />
      <VlailaOrb context={vlailaContext} />
    </div>
  );
}
