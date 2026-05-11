import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/faculty/qa")({
  component: () => (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-vlabs-blue">Ask VLAILA about your class</h1>
      <p className="text-sm text-muted-foreground">Use the floating VLAILA orb (bottom-right). It's grounded in your class data.</p>
      <div className="bg-white border rounded p-4 text-sm space-y-2">
        <div className="font-semibold">Try asking:</div>
        <ul className="list-disc pl-5 text-muted-foreground space-y-1">
          <li>"Which students failed step 3 of Colour Blindness?"</li>
          <li>"Suggest pedagogical improvements for next week."</li>
          <li>"Compare Section A vs Section B on Stroop Effect."</li>
        </ul>
      </div>
    </div>
  ),
});
