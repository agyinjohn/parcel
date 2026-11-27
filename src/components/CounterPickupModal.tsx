import { useEffect, useMemo, useState } from "react";
import { Loader, X, Banknote, Smartphone } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useToast } from "./ui/toast";
import frontdeskService from "../services/frontdeskService";
import { useStation } from "../contexts/StationContext";
import { useLocation as useLocations } from "../contexts/LocationContext";
import { formatCurrency, normalizePhoneNumber, validatePhoneNumber } from "../utils/dataHelpers";
import {
    COUNTER_VARIANCE_REASONS, buildCounterPayment, counterCharges, initialPickupFee, parseReceived, sumCharges,
    type CounterPaymentMethod, type CounterVarianceReason,
} from "../utils/counterPickup";

interface PickupParcel {
    parcelId: string;
    receiverName?: string | null;
    recieverPhoneNumber?: string | null;
    inboundCost?: number | null;
    storageCost?: number | null;
    pickUpCost?: number | null;
    itemCost?: number | null;
    pod?: boolean | null;
    /** Some responses give the office as an object. */
    officeId?: string | { id: string } | null;
}

interface Props {
    parcel: PickupParcel;
    onClose: () => void;
    /** Called after the backend accepted the pickup. */
    onDone: () => void;
}

/**
 * "Mark Picked Up" at the counter: who collected the parcel and what they paid.
 * The payment goes to the backend with the pickup (handoff Part L) and feeds the daily cash-up.
 */
export const CounterPickupModal = ({ parcel, onClose, onDone }: Props) => {
    const { showToast } = useToast();
    const [isOwner, setIsOwner] = useState(true);
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [received, setReceived] = useState("");
    const [method, setMethod] = useState<CounterPaymentMethod | "">("");
    const [momoReference, setMomoReference] = useState("");
    const [reason, setReason] = useState<CounterVarianceReason | "">("");
    const [note, setNote] = useState("");
    const [saving, setSaving] = useState(false);

    // Pickup fee: the parcel's own, or the station's pickup charge when it's switched on (Branch Settings → Charges).
    const { userOfficeId } = useStation();
    const { stations, refreshLocations } = useLocations();
    useEffect(() => {
        if (stations.length === 0) refreshLocations();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const parcelOffice = typeof parcel.officeId === "string" ? parcel.officeId : parcel.officeId?.id;
    const station = stations.find((s) => s.id === (parcelOffice || userOfficeId));
    const feeStart = initialPickupFee(parcel, station);
    const [feeInput, setFeeInput] = useState<string | null>(null); // null until staff edit it
    const feeText = feeInput ?? (feeStart ? String(feeStart.fee) : "");
    const feeNum = feeText.trim() === "" ? 0 : Number(feeText);
    const feeValid = Number.isFinite(feeNum) && feeNum >= 0;

    const charges = useMemo(
        () => counterCharges({ ...parcel, pickUpCost: feeStart || feeInput !== null ? (feeValid ? feeNum : 0) : parcel.pickUpCost }),
        [parcel, feeStart, feeInput, feeValid, feeNum],
    );
    const due = sumCharges(charges);
    const paid = parseReceived(received, due);
    const variance = paid === null ? 0 : Math.round((paid - due) * 100) / 100;
    const built = buildCounterPayment(charges, { received, method, momoReference, reason, note });
    const whoProblem = !isOwner && (!name.trim() || !validatePhoneNumber(phone)) ? "Enter the name and phone of the person collecting" : null;
    const problem = whoProblem ?? (!feeValid ? "Enter a valid pickup fee" : built.problem);

    const confirm = async () => {
        if (problem || !built.payment) return;
        setSaving(true);
        try {
            const who = isOwner ? (parcel.receiverName || "") : name.trim();
            const tel = isOwner ? (parcel.recieverPhoneNumber || "") : normalizePhoneNumber(phone.trim());
            const payment = feeStart || feeInput !== null ? { ...built.payment, pickUpCost: feeValid ? feeNum : 0 } : built.payment;
            const res = await frontdeskService.markParcelPickedUp(parcel.parcelId, who || undefined, tel || undefined, payment);
            if (res.success) {
                showToast(due > 0 ? `Picked up · ${formatCurrency(built.payment.amountPaid)} received` : "Parcel marked as picked up", "success");
                onDone();
            } else {
                showToast(res.message || "Failed to mark the parcel as picked up", "error");
            }
        } catch {
            showToast("Failed to update the parcel. Please try again.", "error");
        } finally {
            setSaving(false);
        }
    };

    const radio = (active: boolean) =>
        `flex items-center gap-2 p-3 border-2 rounded-lg cursor-pointer transition-colors ${active ? "border-[#ea690c] bg-orange-50" : "border-[#d1d1d1] hover:bg-gray-50"}`;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <Card className="w-full max-w-md border border-[#d1d1d1] bg-white shadow-xl max-h-[92vh] overflow-y-auto">
                <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4 pb-4 border-b border-[#d1d1d1]">
                        <div>
                            <h3 className="text-base font-bold text-neutral-800">Mark as Picked Up</h3>
                            <p className="text-xs text-[#5d5d5d] mt-0.5">{parcel.receiverName || parcel.parcelId} · {parcel.parcelId}</p>
                        </div>
                        <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-neutral-800 p-1 hover:bg-gray-100 rounded">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="space-y-5">
                        {/* Who */}
                        <div className="space-y-3">
                            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Who is collecting</p>
                            <div className="grid grid-cols-2 gap-3">
                                <label className={radio(isOwner)}>
                                    <input type="radio" checked={isOwner} onChange={() => setIsOwner(true)} className="w-4 h-4 text-[#ea690c]" />
                                    <div>
                                        <p className="text-sm font-medium text-neutral-800">Owner</p>
                                        <p className="text-xs text-gray-400">Receiver</p>
                                    </div>
                                </label>
                                <label className={radio(!isOwner)}>
                                    <input type="radio" checked={!isOwner} onChange={() => setIsOwner(false)} className="w-4 h-4 text-[#ea690c]" />
                                    <div>
                                        <p className="text-sm font-medium text-neutral-800">Someone else</p>
                                        <p className="text-xs text-gray-400">On their behalf</p>
                                    </div>
                                </label>
                            </div>
                            {isOwner ? (
                                <div className="bg-gray-50 rounded-lg p-3 border border-[#f0f0f0] space-y-1 text-xs text-gray-600">
                                    <p>Name: <span className="font-medium text-neutral-800">{parcel.receiverName || "N/A"}</span></p>
                                    <p>Phone: <span className="font-medium text-neutral-800">{parcel.recieverPhoneNumber || "N/A"}</span></p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-3">
                                    <Input id="pickup-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name of person collecting" className="border-[#d1d1d1]" />
                                    <Input
                                        id="pickup-phone"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="Phone, e.g. 0541234567"
                                        className={`border ${phone && !validatePhoneNumber(phone) ? "border-red-400" : "border-[#d1d1d1]"}`}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Payment */}
                        <div className="space-y-3">
                            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Payment</p>
                            {feeStart && (
                                <div className="flex items-end gap-3 rounded-lg border border-[#ececec] p-3">
                                    <div className="flex-1 min-w-0">
                                        <label htmlFor="pickup-fee" className="block text-sm font-medium text-neutral-800">Pickup fee (GHC)</label>
                                        <p className="text-[11px] text-neutral-500 mt-0.5">
                                            {feeStart.source === "station"
                                                ? `Station pickup charge (${formatCurrency(feeStart.fee)}). Change it, or set 0 to waive.`
                                                : "Recorded on this parcel. You can change it."}
                                        </p>
                                    </div>
                                    <Input
                                        id="pickup-fee"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        inputMode="decimal"
                                        value={feeText}
                                        onChange={(e) => setFeeInput(e.target.value)}
                                        className={`w-28 tabular-nums ${feeValid ? "border-[#d1d1d1]" : "border-red-400"}`}
                                    />
                                </div>
                            )}
                            {charges.length === 0 ? (
                                <p className="text-sm text-neutral-600 bg-gray-50 border border-[#f0f0f0] rounded-lg p-3">Nothing to pay on this parcel.</p>
                            ) : (
                                <>
                                    <div className="rounded-lg border border-[#ececec] divide-y divide-[#f2f2f2] text-sm">
                                        {charges.map((c) => (
                                            <div key={c.key} className="flex justify-between px-3 py-2">
                                                <span className="text-neutral-600">{c.label}</span>
                                                <span className="tabular-nums text-neutral-800">{formatCurrency(c.amount)}</span>
                                            </div>
                                        ))}
                                        <div className="flex justify-between px-3 py-2 bg-gray-50 font-semibold">
                                            <span>Amount due</span>
                                            <span className="tabular-nums">{formatCurrency(due)}</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setMethod("CASH")}
                                            aria-pressed={method === "CASH"}
                                            className={`${radio(method === "CASH")} justify-center text-sm font-medium`}
                                        >
                                            <Banknote className="w-4 h-4" /> Cash
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setMethod("MOMO")}
                                            aria-pressed={method === "MOMO"}
                                            className={`${radio(method === "MOMO")} justify-center text-sm font-medium`}
                                        >
                                            <Smartphone className="w-4 h-4" /> Mobile money
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label htmlFor="pickup-received" className="block text-xs font-semibold text-neutral-700 mb-1">Amount received (GHC)</label>
                                            <Input
                                                id="pickup-received"
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                inputMode="decimal"
                                                value={received}
                                                onChange={(e) => setReceived(e.target.value)}
                                                placeholder={due.toFixed(2)}
                                                className="border-[#d1d1d1] tabular-nums"
                                            />
                                        </div>
                                        {method === "MOMO" && (
                                            <div>
                                                <label htmlFor="pickup-momo" className="block text-xs font-semibold text-neutral-700 mb-1">MoMo transaction ID</label>
                                                <Input id="pickup-momo" value={momoReference} onChange={(e) => setMomoReference(e.target.value)} placeholder="e.g. 4471825930" className="border-[#d1d1d1]" />
                                            </div>
                                        )}
                                    </div>

                                    {variance !== 0 && paid !== null && (
                                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
                                            <p className="text-xs font-semibold text-amber-800">
                                                {variance < 0 ? `${formatCurrency(-variance)} short` : `${formatCurrency(variance)} over`}: give a reason
                                            </p>
                                            <select
                                                id="pickup-reason"
                                                aria-label="Reason for the difference"
                                                value={reason}
                                                onChange={(e) => setReason(e.target.value as CounterVarianceReason | "")}
                                                className="w-full rounded-md border border-amber-200 bg-white px-2 py-1.5 text-sm"
                                            >
                                                <option value="">Choose a reason…</option>
                                                {COUNTER_VARIANCE_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                                            </select>
                                            <Input id="pickup-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder={reason === "Other" ? "Note (required)" : "Note (optional)"} className="border-amber-200 bg-white" />
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {problem && <p className="text-xs text-neutral-500" role="status">{problem}</p>}

                        <div className="flex gap-3 pt-1">
                            <Button onClick={onClose} variant="outline" className="flex-1 border-[#d1d1d1]" disabled={saving}>Cancel</Button>
                            <Button onClick={confirm} disabled={saving || !!problem} className="flex-1 bg-[#ea690c] text-white hover:bg-[#d45d0a] disabled:opacity-50">
                                {saving ? <><Loader className="w-4 h-4 animate-spin mr-2" />Saving...</> : due > 0 && built.payment ? `Confirm · ${formatCurrency(built.payment.amountPaid)}` : "Confirm Pickup"}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
