import type { RevenueDashboard, RiderLeaderboardEntry, DashboardFilters } from "../../../services/adminService";

export type ReportType = "station" | "daily" | "driver" | "payment";

export interface BreakdownTable {
    headers: string[];
    /** Raw cell values; numbers are money unless the column is listed in `plainColumns`/`percentColumns`. */
    rows: (string | number)[][];
    plainColumns: number[];
    percentColumns: number[];
}

/**
 * Turns the date inputs into API filters. Dates are local calendar days: "from" starts at 00:00,
 * "to" ends at 23:59:59.999. With either date missing the API's default (last 30 days) applies.
 */
export const reportFilters = (from: string, to: string, officeId: string): DashboardFilters => {
    const filters: DashboardFilters = {};
    if (officeId) filters.officeId = officeId;
    const day = (v: string) => {
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
        return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
    };
    const start = day(from);
    const end = day(to);
    if (start && end) {
        const [a, b] = start <= end ? [start, end] : [end, start];
        filters.startDate = a.getTime();
        filters.endDate = new Date(b.getFullYear(), b.getMonth(), b.getDate() + 1).getTime() - 1;
    }
    return filters;
};

const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const rate = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0);

const METHOD_LABELS: Record<string, string> = { CASH: "Cash", MOMO: "Mobile money", MOBILE_MONEY: "Mobile money", CARD: "Card", OTHER: "Other" };
export const methodLabel = (m: string) => METHOD_LABELS[m?.toUpperCase?.()] ?? m ?? "Other";

export const breakdown = (type: ReportType, revenue: RevenueDashboard | null, riders: RiderLeaderboardEntry[]): BreakdownTable => {
    switch (type) {
        case "daily":
            return {
                headers: ["Date", "Revenue", "Collected", "Outstanding", "Collection rate"],
                rows: (revenue?.revenueVsCollectedTrend ?? [])
                    .filter((d) => n(d.revenue) || n(d.collected) || n(d.outstanding))
                    .map((d) => [d.date, n(d.revenue), n(d.collected), n(d.outstanding), rate(n(d.collected), n(d.revenue))]),
                plainColumns: [],
                percentColumns: [4],
            };
        case "driver":
            return {
                headers: ["Rider", "Deliveries", "Failed", "Revenue", "Outstanding", "Success rate"],
                rows: riders.map((r) => [r.riderName, n(r.deliveries), n(r.failed), n(r.revenue), n(r.outstanding), rate(n(r.deliveries), n(r.deliveries) + n(r.failed))]),
                plainColumns: [1, 2],
                percentColumns: [5],
            };
        case "payment": {
            const methods = revenue?.paymentMethods ?? [];
            const sum = methods.reduce((s, m) => s + n(m.amount), 0);
            return {
                headers: ["Payment method", "Payments", "Amount", "Share"],
                rows: methods.map((m) => [methodLabel(m.method), n(m.count), n(m.amount), rate(n(m.amount), sum)]),
                plainColumns: [1],
                percentColumns: [3],
            };
        }
        default:
            return {
                headers: ["Station", "Parcels", "Revenue", "Collected", "Outstanding", "Collection rate"],
                rows: (revenue?.revenueByStation ?? []).map((s) => [s.stationName, n(s.parcels), n(s.revenue), n(s.collected), n(s.outstanding), n(s.collectionRate)]),
                plainColumns: [1],
                percentColumns: [5],
            };
    }
};

export const toCsv = (table: BreakdownTable) => {
    const cell = (v: string | number, i: number) => {
        const text = typeof v === "number" ? (table.plainColumns.includes(i) ? String(v) : table.percentColumns.includes(i) ? `${v}%` : v.toFixed(2)) : v;
        return `"${String(text).replace(/"/g, '""')}"`;
    };
    return [table.headers.map((h, i) => cell(h, -1 - i)).join(","), ...table.rows.map((r) => r.map(cell).join(","))].join("\n");
};
