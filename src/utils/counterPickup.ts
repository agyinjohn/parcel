/**
 * Taking payment when a customer collects a parcel at the station counter ("Mark Picked Up").
 * See docs/BACKEND_HANDOFF.md, Part L.
 */

export type CounterPaymentMethod = "CASH" | "MOMO";

export const COUNTER_VARIANCE_REASONS = [
    "Customer paid less",
    "Charge waived by manager",
    "Already paid (e.g. by the sender)",
    "Overpaid",
    "Other",
] as const;
export type CounterVarianceReason = (typeof COUNTER_VARIANCE_REASONS)[number];

export interface ChargeLine {
    key: "inbound" | "storage" | "pickup" | "pod";
    label: string;
    amount: number;
}

interface ParcelCosts {
    inboundCost?: number | null;
    storageCost?: number | null;
    pickUpCost?: number | null;
    itemCost?: number | null;
    pod?: boolean | null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const money = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? round2(v) : 0);

/**
 * What the customer owes at the counter. Delivery cost is left out: they came to collect.
 * On cash-on-delivery (POD) parcels the item value is collected for the sender.
 */
export const counterCharges = (p: ParcelCosts): ChargeLine[] =>
    ([
        { key: "inbound", label: "Inbound", amount: money(p.inboundCost) },
        { key: "storage", label: "Storage", amount: money(p.storageCost) },
        { key: "pickup", label: "Pickup fee", amount: money(p.pickUpCost) },
        { key: "pod", label: "Item value (POD, for the sender)", amount: p.pod ? money(p.itemCost) : 0 },
    ] as ChargeLine[]).filter((l) => l.amount > 0);

export const sumCharges = (lines: ChargeLine[]) => round2(lines.reduce((s, l) => s + l.amount, 0));

export interface CounterPaymentInput {
    /** What the staff member typed; empty means "the full amount due". */
    received: string;
    method: CounterPaymentMethod | "";
    momoReference: string;
    reason: CounterVarianceReason | "";
    note: string;
}

export interface CounterPayment {
    amountDue: number;
    amountPaid: number;
    varianceAmount: number;
    paymentMethod?: CounterPaymentMethod;
    momoReference?: string;
    varianceReason?: CounterVarianceReason;
    varianceNote?: string;
    charges: ChargeLine[];
}

export const parseReceived = (input: string, due: number): number | null => {
    if (input.trim() === "") return due;
    const n = Number(input);
    return Number.isFinite(n) && n >= 0 ? round2(n) : null;
};

/** The payment to send, or the first thing staff must fix before confirming. */
export const buildCounterPayment = (
    charges: ChargeLine[],
    input: CounterPaymentInput,
): { payment: CounterPayment; problem: null } | { payment: null; problem: string } => {
    const amountDue = sumCharges(charges);
    const amountPaid = parseReceived(input.received, amountDue);
    if (amountPaid === null) return { payment: null, problem: "Enter a valid amount received" };
    const varianceAmount = round2(amountPaid - amountDue);
    if (amountPaid > 0 && !input.method) return { payment: null, problem: "Choose how the customer paid" };
    if (amountPaid > 0 && input.method === "MOMO" && !input.momoReference.trim()) {
        return { payment: null, problem: "Enter the mobile money transaction ID" };
    }
    if (varianceAmount !== 0 && !input.reason) return { payment: null, problem: "Choose a reason for the difference" };
    if (varianceAmount !== 0 && input.reason === "Other" && !input.note.trim()) {
        return { payment: null, problem: "Add a note explaining the difference" };
    }
    return {
        problem: null,
        payment: {
            amountDue,
            amountPaid,
            varianceAmount,
            ...(amountPaid > 0 && input.method ? { paymentMethod: input.method } : {}),
            ...(amountPaid > 0 && input.method === "MOMO" ? { momoReference: input.momoReference.trim() } : {}),
            ...(varianceAmount !== 0 && input.reason ? { varianceReason: input.reason } : {}),
            ...(varianceAmount !== 0 && input.note.trim() ? { varianceNote: input.note.trim() } : {}),
            charges,
        },
    };
};

/** One counter collection as returned by GET /api-frontdesk/counter-collections (proposed). */
export interface CounterCollection {
    parcelId: string;
    receiverName?: string;
    collectedByName?: string;
    collectedByPhone?: string;
    pickedUpAt: number;
    amountDue: number;
    amountPaid: number;
    varianceAmount: number;
    paymentMethod?: CounterPaymentMethod;
    momoReference?: string;
    varianceReason?: string;
    varianceNote?: string;
    recordedByName?: string;
}

/** Day totals for the cash-up: what should be in the drawer and on the MoMo account. */
export const cashUpTotals = (rows: CounterCollection[]) => {
    const t = { count: rows.length, due: 0, paid: 0, cash: 0, momo: 0, variance: 0, short: 0 };
    rows.forEach((r) => {
        t.due += r.amountDue || 0;
        t.paid += r.amountPaid || 0;
        t.variance += r.varianceAmount || 0;
        if (r.varianceAmount < 0) t.short += 1;
        if (r.paymentMethod === "MOMO") t.momo += r.amountPaid || 0;
        else if (r.paymentMethod === "CASH") t.cash += r.amountPaid || 0;
    });
    (["due", "paid", "cash", "momo", "variance"] as const).forEach((k) => (t[k] = round2(t[k])));
    return t;
};
