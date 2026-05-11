import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/faculty/assignments")({
  component: () => (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-vlabs-blue">Assign an Experiment</h1>
      <div className="bg-white border rounded p-4 space-y-3 text-sm">
        <div><label>Lab</label><select className="w-full border rounded px-3 py-2 mt-1"><option>Psychological Process</option><option>Drone Technology</option></select></div>
        <div><label>Experiment</label><select className="w-full border rounded px-3 py-2 mt-1"><option>Colour Blindness</option><option>Stroop Effect</option></select></div>
        <div><label>Class</label><select className="w-full border rounded px-3 py-2 mt-1"><option>B.Tech CSE 3rd yr A</option><option>B.Tech CSE 3rd yr B</option></select></div>
        <div><label>Due date</label><input type="date" className="w-full border rounded px-3 py-2 mt-1" /></div>
        <button className="bg-vlabs-blue text-white px-4 py-2 rounded">Assign</button>
      </div>
    </div>
  ),
});
