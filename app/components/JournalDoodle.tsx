/* Hand-drawn style mini icons for the journal tabs and path. Decorative only. */

import type { JourneyStep } from "../lib/journey";

export default function JournalDoodle({ name, size = 28 }: { name: JourneyStep["doodle"]; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 32 32", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true, focusable: false };
  switch (name) {
    case "wing":
      return <svg {...common}><path d="M4 18C9 10 19 7 28 8c-1 7-7 13-18 14-3 0-5-1-6-4z" /><path d="M5 18c7-2 14-5 22-9M10 21c3-3 6-7 8-12M16 19c2-3 4-6 5-9" /></svg>;
    case "tree":
      return <svg {...common}><path d="M6 26V6M6 10h8M6 18h8M14 10V6h8M14 10v4h8M14 18v4h8M14 18v-2h8" /></svg>;
    case "pair":
      return <svg {...common}><path d="M3 16c4-6 11-8 17-7-1 5-5 9-12 9-2 0-4-1-5-2z" /><path d="M12 22c4-6 11-8 17-7-1 5-5 9-12 9-2 0-4-1-5-2z" strokeDasharray="3 2" /></svg>;
    case "lens":
      return <svg {...common}><circle cx="13" cy="13" r="8" /><path d="M19 19l8 8M9 13c1-3 3-4 5-4" /></svg>;
    case "pencil":
      return <svg {...common}><path d="M6 26l2-7L21 6l5 5-13 13z" /><path d="M18 9l5 5M6 26l7-2" /></svg>;
    default:
      return <svg {...common}><path d="M16 4l3.5 7.5L28 13l-6 6 1.5 8.5L16 23.5 8.5 27.5 10 19l-6-6 8.5-1.5z" /></svg>;
  }
}
