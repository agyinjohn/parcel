import { useState } from "react";
import { Info, X } from "lucide-react";

type Swatch =
    | { kind: "line"; color: string; width?: number }
    | { kind: "dot"; color: string; label?: string; size?: number; ring?: string }
    | { kind: "pin"; color: string };

export interface LegendItem {
    swatch: Swatch;
    label: string;
}

const SwatchIcon = ({ s }: { s: Swatch }) => {
    if (s.kind === "line") {
        return <span className="inline-block w-6 rounded-full" style={{ height: s.width ?? 4, background: s.color }} />;
    }
    if (s.kind === "pin") {
        return (
            <svg width="14" height="18" viewBox="0 0 14 18" aria-hidden>
                <path d="M7 17s6-6.2 6-10A6 6 0 0 0 1 7c0 3.8 6 10 6 10z" fill={s.color} stroke="#fff" strokeWidth="1.5" />
                <circle cx="7" cy="7" r="2.2" fill="#fff" />
            </svg>
        );
    }
    const size = s.size ?? 14;
    return (
        <span
            className="inline-flex items-center justify-center rounded-full text-[8px] font-bold text-white"
            style={{ width: size, height: size, background: s.color, boxShadow: `0 0 0 2px ${s.ring ?? "#fff"}` }}
        >
            {s.label}
        </span>
    );
};

/** Key for what the lines and markers on the Rider Map mean. Collapsible so it never hides much of the map. */
export const MapLegend = ({ title, items }: { title: string; items: LegendItem[] }) => {
    // Starts collapsed on small screens, where it would cover much of the map.
    const [open, setOpen] = useState(() => typeof window === "undefined" || window.innerWidth >= 1024);
    if (!open) {
        return (
            <button
                onClick={() => setOpen(true)}
                className="absolute left-3 bottom-3 z-10 flex items-center gap-1.5 rounded-lg bg-white/95 px-2.5 py-1.5 text-xs font-medium text-neutral-700 shadow-md ring-1 ring-black/5"
            >
                <Info className="w-3.5 h-3.5" /> Map key
            </button>
        );
    }
    return (
        <div className="absolute left-3 bottom-3 z-10 max-w-[230px] max-h-[calc(100%-1.5rem)] overflow-y-auto rounded-lg bg-white/95 p-3 shadow-md ring-1 ring-black/5 backdrop-blur">
            <div className="flex items-center justify-between gap-3 mb-2">
                <p className="text-xs font-semibold text-neutral-800">{title}</p>
                <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-neutral-700" aria-label="Hide map key">
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>
            <ul className="space-y-1.5">
                {items.map((it) => (
                    <li key={it.label} className="flex items-center gap-2.5 text-xs text-neutral-700">
                        <span className="w-6 flex justify-center shrink-0"><SwatchIcon s={it.swatch} /></span>
                        {it.label}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export const LIVE_LEGEND: LegendItem[] = [
    { swatch: { kind: "dot", color: "#16a34a", label: "KA", size: 16 }, label: "Live (GPS in the last 5 min)" },
    { swatch: { kind: "dot", color: "#d97706", label: "KA", size: 16 }, label: "Last seen earlier" },
];

export const HISTORY_LEGEND: LegendItem[] = [
    { swatch: { kind: "line", color: "#2563eb" }, label: "Planned route (when one was set)" },
    { swatch: { kind: "line", color: "#9ca3af" }, label: "Route the rider rode" },
    { swatch: { kind: "line", color: "#ea690c", width: 5 }, label: "Route covered so far in playback" },
    { swatch: { kind: "dot", color: "#ea690c", size: 14 }, label: "Rider at the playback time" },
    { swatch: { kind: "dot", color: "#16a34a", label: "S" }, label: "Start of the route" },
    { swatch: { kind: "dot", color: "#111827", label: "E" }, label: "End of the route" },
    { swatch: { kind: "line", color: "#dc2626", width: 6 }, label: "Detour away from the day's deliveries" },
    { swatch: { kind: "dot", color: "#d97706", size: 10 }, label: "Stop longer than 5 min" },
    { swatch: { kind: "dot", color: "#7c3aed", label: "?", size: 14 }, label: "Stop away from any drop-off" },
    { swatch: { kind: "pin", color: "#16a34a" }, label: "Drop-off the rider reached" },
    { swatch: { kind: "pin", color: "#dc2626" }, label: "Drop-off not reached" },
    { swatch: { kind: "pin", color: "#6b7280" }, label: "Not finished yet, or no GPS" },
];
