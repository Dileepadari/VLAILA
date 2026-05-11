export type Role = "guest" | "student" | "faculty" | "admin";

export const BROAD_AREAS = [
  { slug: "computer-science", name: "Computer Science & Engineering", color: "#0B6493", labs: 14 },
  { slug: "electronics", name: "Electronics & Communications", color: "#3298CA", labs: 11 },
  { slug: "electrical", name: "Electrical Engineering", color: "#1E88A8", labs: 9 },
  { slug: "mechanical", name: "Mechanical Engineering", color: "#0E7C9C", labs: 8 },
  { slug: "civil", name: "Civil Engineering", color: "#2E6E8C", labs: 7 },
  { slug: "chemical", name: "Chemical Engineering", color: "#16607E", labs: 6 },
  { slug: "biotech", name: "Biotechnology and Biomedical Engineering", color: "#3FA37A", labs: 10 },
  { slug: "physical", name: "Physical Sciences", color: "#7E5BB0", labs: 8 },
  { slug: "chemical-sciences", name: "Chemical Sciences", color: "#B05B7E", labs: 7 },
  { slug: "design", name: "Design Engineering", color: "#C97A3A", labs: 5 },
];

export const LABS = [
  {
    id: "psychological-process",
    area: "computer-science",
    institute: "IIIT HYDERABAD",
    name: "Psychological Process and Application in Everyday Life",
    intro: "An interdisciplinary lab exploring perception, cognition and behavior through interactive experiments.",
    objective: "To enable learners to understand foundational psychological processes through hands-on virtual experiments.",
    audience: "UG/PG students of Computer Science, Cognitive Science, and Psychology.",
    courseAlignment: "AICTE / UGC psychology and HCI electives.",
    experiments: [
      { id: "colour-blindness", name: "Colour Blindness", rating: 4 },
      { id: "simons-effect", name: "Simons Effect (Herbert A Simon - 1969)", rating: 4.5 },
      { id: "stroop-effect", name: "Stroop Effect - Stroop Colour and Word Test", rating: 5 },
      { id: "cueing-posner", name: "Cueing/Posner Task", rating: 5 },
      { id: "visual-search", name: "Visual Search - Singleton & Conjunctive", rating: 5 },
      { id: "george-miller", name: "George Miller Experiment 1956: Capacity of Short-term Memory", rating: 5 },
      { id: "nback", name: "Visual Memory - nBack Test", rating: 5 },
    ],
  },
  {
    id: "drone-tech",
    area: "design",
    institute: "IIT DELHI",
    name: "Drone Technology Lab",
    intro: "Hands-on virtual experiments on UAV mechanics, control, and applications.",
    objective: "Understand drone subsystems, flight dynamics, and mission planning.",
    audience: "UG students in Aerospace, Mechanical, and Design Engineering.",
    courseAlignment: "AICTE Drone Technology elective.",
    experiments: [
      { id: "drone-anatomy", name: "Drone Anatomy & Components", rating: 4.5 },
      { id: "flight-dynamics", name: "Flight Dynamics Simulation", rating: 4 },
      { id: "mission-planning", name: "Mission Planning", rating: 4 },
    ],
  },
  {
    id: "vr-lab",
    area: "design",
    institute: "IIT DELHI",
    name: "Virtual Reality (VR) Laboratory",
    intro: "Explore immersive computing concepts and stereoscopic rendering.",
    objective: "Understand VR rendering pipelines and interaction paradigms.",
    audience: "UG/PG students in CSE, Design.",
    courseAlignment: "Computer Graphics and HCI courses.",
    experiments: [
      { id: "stereo-rendering", name: "Stereoscopic Rendering", rating: 4 },
      { id: "head-tracking", name: "Head Tracking", rating: 4 },
    ],
  },
];

export const EXPERIMENT = {
  id: "colour-blindness",
  labId: "psychological-process",
  title: "Colour Blindness: How colour-blind population perceive/see colours",
  aim: "To simulate and understand how individuals with different forms of colour vision deficiency (CVD) perceive everyday images.",
  theory: `Colors are an effective mode of communication that influence perception and emotion. **Color blindness**, also known as **color vision deficiency (CVD)**, affects a significant portion of the population:

- **Globally:** About 1 in 12 men (8%) and 1 in 200 women (0.5%) are color-blind.
- **In India:** 8% of men and 0.4% of women experience color blindness.

This means around **300 million people worldwide** live with CVD.

### How Color Vision Works
Normal color vision uses all three types of light cones correctly and is known as **trichromacy**. Color blindness occurs when one type of cone doesn't work right.

There are three main types of CVD:
1. **Protanomaly (Protanopia):** Trouble seeing shades of red clearly.
2. **Deuteranomaly (Deuteranopia):** Trouble seeing shades of green clearly (most common).
3. **Tritanomaly (Tritanopia):** Trouble seeing shades of blue clearly (extremely rare).

### Why This Matters
This helps in coming up with designs that can be used by all, ensuring equal usability and engagement.`,
  procedure: [
    "Read the Aim and Theory sections to understand color vision deficiency.",
    "Open the Simulator.",
    "Select an image from the gallery, OR upload your own.",
    "Switch between the three CVD modes (Protanopia / Deuteranopia / Tritanopia).",
    "Observe the rendered transformation and note differences vs. the original.",
    "Take the Posttest to verify your understanding.",
  ],
  pretest: [
    { q: "Which type of color blindness affects red perception?", opts: ["Protanopia", "Deuteranopia", "Tritanopia", "Achromatopsia"], a: 0 },
    { q: "What percentage of men globally are color-blind (approx)?", opts: ["1%", "8%", "20%", "0.5%"], a: 1 },
    { q: "Color vision relies on which cells in the retina?", opts: ["Rods", "Cones", "Bipolar cells", "Ganglion cells"], a: 1 },
  ],
  posttest: [
    { q: "The most common form of color blindness is:", opts: ["Protanopia", "Deuteranopia", "Tritanopia", "Monochromacy"], a: 1 },
    { q: "Tritanopia affects perception of:", opts: ["Red", "Green", "Blue", "Yellow"], a: 2 },
    { q: "Designing for color-blind users improves:", opts: ["Aesthetics only", "Universal accessibility", "Print quality", "Storage cost"], a: 1 },
  ],
  references: [
    "Sharpe, L. T., et al. (1999). Opsin genes, cone photopigments, color vision and color blindness.",
    "Brettel, H., Viénot, F., & Mollon, J. D. (1997). Computerized simulation of color appearance for dichromats.",
    "https://www.color-blindness.com/",
  ],
};

export const ASSIGNMENTS = [
  { id: "a1", lab: "Psychological Process", experiment: "Colour Blindness", due: "2026-05-18", status: "assigned" },
  { id: "a2", lab: "Psychological Process", experiment: "Stroop Effect", due: "2026-05-25", status: "in-progress" },
  { id: "a3", lab: "Drone Technology Lab", experiment: "Flight Dynamics Simulation", due: "2026-05-12", status: "due-soon" },
  { id: "a4", lab: "Psychological Process", experiment: "nBack Test", due: "2026-04-30", status: "completed" },
];

export const NOTIFICATIONS = [
  { id: "n1", text: "Dr. Aruna Sharma assigned 'Colour Blindness' — due May 18.", time: "2h ago", unread: true },
  { id: "n2", text: "Lab Buddy has a new tip for the Stroop Effect experiment.", time: "5h ago", unread: true },
  { id: "n3", text: "VLAILA: You completed nBack Test with 92% accuracy. Great job!", time: "Yesterday", unread: false },
];

export const STUDENTS = [
  { roll: "CS21B001", name: "Aarav Sharma", batch: "B.Tech CSE 3rd yr", completed: 12, assigned: 15 },
  { roll: "CS21B002", name: "Diya Patel", batch: "B.Tech CSE 3rd yr", completed: 14, assigned: 15 },
  { roll: "CS21B003", name: "Ishaan Kumar", batch: "B.Tech CSE 3rd yr", completed: 9, assigned: 15 },
  { roll: "CS21B004", name: "Meera Iyer", batch: "B.Tech CSE 3rd yr", completed: 15, assigned: 15 },
  { roll: "CS21B005", name: "Rohan Das", batch: "B.Tech CSE 3rd yr", completed: 7, assigned: 15 },
  { roll: "CS21B006", name: "Sara Khan", batch: "B.Tech CSE 3rd yr", completed: 11, assigned: 15 },
];

export const CLASS_ANALYTICS = {
  experiment: "Colour Blindness",
  completionRate: 78,
  avgDuration: "14m 22s",
  steps: [
    { step: "Read Aim", confusion: 5, dropoff: 1 },
    { step: "Theory", confusion: 12, dropoff: 4 },
    { step: "Pretest", confusion: 28, dropoff: 9 },
    { step: "Procedure", confusion: 18, dropoff: 6 },
    { step: "Simulation: Select image", confusion: 22, dropoff: 5 },
    { step: "Simulation: Switch CVD mode", confusion: 41, dropoff: 11 },
    { step: "Simulation: Upload own image", confusion: 33, dropoff: 13 },
    { step: "Posttest", confusion: 25, dropoff: 7 },
  ],
};

export const ORG_STATS = {
  activeUsers30d: 1248231,
  experimentsAllTime: 81330147,
  experimentsThisMonth: 2147893,
  avgSessionMinutes: 21,
  daily: Array.from({ length: 14 }, (_, i) => ({
    day: `D${i + 1}`,
    users: 70000 + Math.round(Math.sin(i / 2) * 12000 + Math.random() * 8000),
  })),
  byDiscipline: BROAD_AREAS.map((a) => ({
    name: a.name.split(" ")[0],
    sessions: Math.round(50000 + Math.random() * 200000),
  })),
  trending: [
    { name: "Stroop Effect", sessions: 18421, trend: "+22%" },
    { name: "Colour Blindness", sessions: 16802, trend: "+18%" },
    { name: "Ohm's Law", sessions: 15990, trend: "+11%" },
    { name: "Half Adder", sessions: 14201, trend: "+9%" },
    { name: "Pendulum", sessions: 13500, trend: "+7%" },
  ],
  struggling: [
    { name: "Quantum Tunneling Sim", completion: 31, abandon: 69 },
    { name: "Advanced Microprocessor", completion: 38, abandon: 62 },
    { name: "Fluid Dynamics CFD", completion: 42, abandon: 58 },
  ],
};

export const HEALTH = {
  uptime: 99.94,
  p50: 412,
  p95: 1108,
  costToday: 24.71,
  hintAcceptance: 64,
  fpRate: 3.2,
};
