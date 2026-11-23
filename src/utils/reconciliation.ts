/**
 * Rider cash reconciliation with per-parcel actual amounts.
 *
 * For each delivered parcel the system knows what the rider should hand over ("system amount").
 * The manager enters what was actually collected; any difference is a variance that needs a reason.
 * See docs/BACKEND_HANDOFF.md, Part K.
 */

export const VARIANCE_REASONS = [
    "Customer paid less",
    "Customer didn't pay",
    "Rider short on cash",
    "Discount approved",
    "Paid by mobile money to a different number",
    "Overpaid / tip",
    "Other",
] as const;
export type VarianceReason = (typeof VARIANCE_REASONS)[number];

export interface CollectionLine {
    parcelId: string;
    systemAmount: number;
    collectedAmount: number;
    variance: number;
    varianceReason?: VarianceReason;
    varianceNote?: string;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Parses the manager's input; an empty box means "same as the system amount". */
export const parseCollected = (input: string | undefined, systemAmount: number): number | null => {
    if (input === undefined || input.trim() === "") return systemAmount;
    const n = Number(input);
    return Number.isFinite(n) && n >= 0 ? round2(n) : null;
};

export const makeLine = (
    parcelId: string,
    systemAmount: number,
    input: string | undefined,
    reason?: { reason?: VarianceReason | ""; note?: string },
): CollectionLine | null => {
    const collected = parseCollected(input, systemAmount);
    if (collected === null) return null;
    const variance = round2(collected - systemAmount);
    return {
        parcelId,
        systemAmount: round2(systemAmount),
        collectedAmount: collected,
        variance,
        ...(variance !== 0 && reason?.reason ? { varianceReason: reason.reason as VarianceReason } : {}),
        ...(variance !== 0 && reason?.note?.trim() ? { varianceNote: reason.note.trim() } : {}),
    };
};

/** Problems that must be fixed before the reconciliation can be confirmed, keyed by parcel id. */
export const lineProblems = (line: CollectionLine | null, parcelId: string): string | null => {
    if (!line) return `Enter a valid amount for ${parcelId}`;
    if (line.variance === 0) return null;
    if (!line.varianceReason) return "Choose a reason for the difference";
    if (line.varianceReason === "Other" && !line.varianceNote) return "Add a note explaining the difference";
    return null;
};

export const sumVariance = (lines: CollectionLine[]) => round2(lines.reduce((s, l) => s + l.variance, 0));

/**
 * One reconciliation item per assignment. `payedAmount` (what the rider actually handed over) is
 * the system's expected amount adjusted by the parcel variances.
 */
export const buildReconciliationItem = (assignmentId: string, expectedAmount: number, lines: CollectionLine[], now = Date.now()) => {
    const varianceAmount = sumVariance(lines);
    return {
        assignmentId,
        reconciledAt: now,
        expectedAmount: round2(expectedAmount),
        payedAmount: round2(expectedAmount + varianceAmount),
        varianceAmount,
        lines,
    };
};
