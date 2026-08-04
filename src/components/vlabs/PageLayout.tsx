import type { ReactNode } from "react";
import { VlabsHeader, VlabsFooter } from "./Shell";
import { useVlaila } from "@/lib/vlaila";

/**
 * Console page shell.
 *
 * Deliberately has no assistant of its own. The assistant is the embedded
 * widget (`embed/dist/vlaila.js`), loaded here for every page: it runs as a
 * navigator across the portal and as a lab assistant once it detects an
 * experiment. A second, mock assistant living in the console would drift from
 * the real one and make the demo lie about the product.
 */
export function PageLayout({ children }: { children: ReactNode }) {
  useVlaila();

  return (
    <div className="min-h-screen flex flex-col">
      <VlabsHeader />
      <main className="flex-1">{children}</main>
      <VlabsFooter />
    </div>
  );
}
