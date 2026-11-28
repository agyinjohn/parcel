import type { CashupReportRow, PayoutTotals } from "../../../services/adminReportsService";

const round2 = (n: number) => Math.round(n * 100) / 100;

export const localDate = (t: number) => {
    const d = new Date(t);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Days with money at the counter: how many closed, how many still open, and the net difference. */
export const cashupSummary = (rows: CashupReportRow[]) => {
    const closed = rows.filter((r) => r.closed);
    const short = closed.filter((r) => (r.difference ?? 0) < 0);
    return {
        days: rows.length,
        closed: closed.length,
        open: rows.length - closed.length,
        shortDays: short.length,
        difference: round2(closed.reduce((s, r) => s + (r.difference ?? 0) + (r.adjustmentTotal ?? 0), 0)),
        expectedCash: round2(rows.reduce((s, r) => s + (r.expectedCash ?? 0), 0)),
        momo: round2(rows.reduce((s, r) => s + (r.expectedMomo ?? 0), 0)),
    };
};

export const sumPayouts = (rows: PayoutTotals[]): PayoutTotals => {
    const t = rows.reduce(
        (a, r) => ({
            payouts: a.payouts + (r.payouts || 0), gross: a.gross + (r.gross || 0), deductions: a.deductions + (r.deductions || 0), bonuses: a.bonuses + (r.bonuses || 0),
            net: a.net + (r.net || 0), cash: a.cash + (r.cash || 0), momo: a.momo + (r.momo || 0), unconfirmed: a.unconfirmed + (r.unconfirmed || 0),
        }),
        { payouts: 0, gross: 0, deductions: 0, bonuses: 0, net: 0, cash: 0, momo: 0, unconfirmed: 0 },
    );
    return { ...t, gross: round2(t.gross), deductions: round2(t.deductions), bonuses: round2(t.bonuses), net: round2(t.net), cash: round2(t.cash), momo: round2(t.momo) };
};

/** CSV with quoted cells (Excel-friendly). */
export const toCsv = (headers: string[], rows: (string | number | null | undefined)[][]) =>
    [headers, ...rows].map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");

export const downloadCsv = (name: string, csv: string) => {
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};
