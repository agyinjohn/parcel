import type { Balances, DriverPayout, FeeLine, PayoutAdjustment, Trip } from "../../services/driverPaymentsService";

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Deductions and advance repayments reduce the payout; bonuses add to it. */
export const adjustmentSign = (type: PayoutAdjustment["type"]) => (type === "BONUS" ? 1 : -1);

export const ADJUSTMENT_LABEL: Record<PayoutAdjustment["type"], string> = {
    DEDUCTION: "Deduction",
    BONUS: "Bonus",
    ADVANCE_REPAID: "Advance repaid",
    ADVANCE: "Advance given",
};

export const readyLines = (trips: Trip[]) => trips.flatMap((t) => (t.lines ?? []).filter((l) => l.state === "READY"));

export interface PayoutTotals {
    gross: number;
    deductions: number;
    bonuses: number;
    net: number;
}

export const payoutTotals = (lines: Pick<FeeLine, "amount">[], adjustments: Pick<PayoutAdjustment, "type" | "amount">[]): PayoutTotals => {
    const gross = round2(lines.reduce((s, l) => s + (l.amount || 0), 0));
    let deductions = 0;
    let bonuses = 0;
    adjustments.forEach((a) => {
        if (a.type === "BONUS") bonuses += a.amount || 0;
        else if (a.type === "DEDUCTION" || a.type === "ADVANCE_REPAID") deductions += a.amount || 0;
    });
    return { gross, deductions: round2(deductions), bonuses: round2(bonuses), net: round2(gross - deductions + bonuses) };
};

/** The first thing that stops the payout from being confirmed, or null. */
export const payoutProblem = (
    lines: FeeLine[],
    adjustments: PayoutAdjustment[],
    method: "CASH" | "MOMO" | "",
    momoNumber: string,
    momoReference: string,
): string | null => {
    if (lines.length === 0) return "Select at least one ready parcel";
    if (lines.some((l) => l.state !== "READY")) return "Only ready parcels can be paid";
    if (adjustments.some((a) => !(a.amount > 0) || !a.reason.trim())) return "Each adjustment needs an amount and a reason";
    if (adjustments.some((a) => Math.abs(a.amount * 100 - Math.round(a.amount * 100)) > 1e-6)) return "Amounts can't have more than 2 decimal places";
    if (new Set(lines.map((l) => l.id)).size !== lines.length) return "A parcel is selected twice";
    const t = payoutTotals(lines, adjustments);
    if (t.net < 0) return "Deductions are more than the amount owed";
    if (!method) return "Choose cash or mobile money";
    if (method === "MOMO" && !momoNumber.trim()) return "Enter the driver's MoMo number";
    if (method === "MOMO" && !momoReference.trim()) return "Enter the MoMo transaction ID";
    return null;
};

/** "0244118902" -> "0244 118 902" for display. */
export const prettyPhone = (p?: string) => {
    const d = (p ?? "").replace(/\D/g, "").replace(/^233/, "0");
    return d.length === 10 ? `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}` : p ?? "";
};

const sum = (ls: FeeLine[]) => round2(ls.reduce((s, l) => s + (l.amount || 0), 0));

/**
 * Do the balances at the top of a statement match the fee lines listed? They must, because the
 * statement always includes every unpaid line. A mismatch means money is unaccounted for.
 */
export const statementMismatches = (balances: Balances, trips: Trip[]): string[] => {
    const lines = trips.flatMap((t) => t.lines ?? []);
    const by = (st: FeeLine["state"]) => lines.filter((l) => l.state === st);
    const out: string[] = [];
    const check = (label: string, expected: number, listed: FeeLine[]) => {
        if (Math.abs(round2(expected) - sum(listed)) > 0.009) out.push(`${label}: balance says GHC ${expected.toFixed(2)}, parcels listed add up to GHC ${sum(listed).toFixed(2)}`);
    };
    check("Ready to pay", balances.readyAmount, by("READY"));
    check("Waiting", balances.waitingAmount, by("WAITING"));
    check("On hold", balances.onHoldAmount, by("ON_HOLD"));
    const ids = lines.map((l) => l.id);
    if (new Set(ids).size !== ids.length) out.push("The same parcel fee is listed twice");
    return out;
};

/** A recent payout that already covers any of these fee lines (to recover from a lost reply). */
export const payoutCovering = (payouts: DriverPayout[], lineIds: string[]) =>
    payouts.find((p) => !p.reversed && (p.lineIds ?? []).some((id) => lineIds.includes(id)));
