import { useEffect, useMemo, useState, type ReactNode } from "react";
import { X, Loader, Banknote, Smartphone, Plus, Trash2, CheckCircle2, Printer, MessageSquare } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { useToast } from "../../components/ui/toast";
import { formatCurrency } from "../../utils/dataHelpers";
import driverPayments, {
    type Driver, type DriverAdjustment, type DriverInput, type DriverPayout, type FeeLine, type MomoNetwork, type PayoutAdjustment, type PayMethod,
} from "../../services/driverPaymentsService";
import { ADJUSTMENT_LABEL, payoutProblem, payoutTotals, prettyPhone } from "./payoutMath";

export const Modal = ({ title, sub, onClose, children, footer, wide }: { title: string; sub?: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) => (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4" role="dialog" aria-modal="true" aria-label={title}>
        <div className={`w-full ${wide ? "max-w-2xl" : "max-w-md"} max-h-[92vh] flex flex-col rounded-2xl bg-white shadow-2xl`}>
            <div className="flex items-start justify-between gap-3 border-b border-[#ececec] px-5 py-4">
                <div>
                    <h3 className="text-base font-bold text-neutral-900">{title}</h3>
                    {sub && <p className="mt-0.5 text-xs text-[#6b7280]">{sub}</p>}
                </div>
                <button onClick={onClose} aria-label="Close" className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-neutral-800"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
            {footer && <div className="flex gap-3 border-t border-[#ececec] px-5 py-3">{footer}</div>}
        </div>
    </div>
);

const optCls = (on: boolean) =>
    `flex items-center justify-center gap-2 rounded-xl border-2 px-3 py-2.5 text-sm font-semibold transition-colors ${on ? "border-[#ea690c] bg-orange-50 text-neutral-900" : "border-[#e5e7eb] text-neutral-600 hover:bg-gray-50"}`;

// ── Pay a driver ────────────────────────────────────────────────

interface PayProps {
    driver: Driver;
    lines: FeeLine[];
    tripCount: number;
    openAdvances: DriverAdjustment[];
    onClose: () => void;
    onPaid: (p: DriverPayout) => void;
}

export const PayDialog = ({ driver, lines, tripCount, openAdvances, onClose, onPaid }: PayProps) => {
    const { showToast } = useToast();
    const advanceOutstanding = (a: DriverAdjustment) => Math.max(0, (a.amount || 0) - (a.repaidAmount || 0));
    // Open items recorded earlier: advances can be recovered; saved deductions/bonuses apply by default.
    const fromOpen = (a: DriverAdjustment): PayoutAdjustment =>
        a.type === "ADVANCE"
            ? { type: "ADVANCE_REPAID", amount: advanceOutstanding(a), reason: a.reason || "Advance", adjustmentId: a.id }
            : { type: a.type, amount: a.amount, reason: a.reason || ADJUSTMENT_LABEL[a.type], adjustmentId: a.id, ...(a.parcelId ? { parcelId: a.parcelId } : {}) };
    const [adjustments, setAdjustments] = useState<PayoutAdjustment[]>(() => openAdvances.filter((a) => a.type !== "ADVANCE").map(fromOpen));
    const [method, setMethod] = useState<PayMethod | "">(driver.momoNumber ? "MOMO" : "");
    const [momoNumber, setMomoNumber] = useState(driver.momoNumber ?? "");
    const [momoReference, setMomoReference] = useState("");
    const [note, setNote] = useState("");
    const [saving, setSaving] = useState(false);

    const totals = payoutTotals(lines, adjustments);
    const problem = payoutProblem(lines, adjustments, method, momoNumber, momoReference);
    const recovering = (a: DriverAdjustment) => adjustments.some((x) => x.adjustmentId === a.id);

    const setAdj = (i: number, patch: Partial<PayoutAdjustment>) => setAdjustments((list) => list.map((a, j) => (j === i ? { ...a, ...patch } : a)));

    const submit = async () => {
        if (problem || !method) return;
        setSaving(true);
        const res = await driverPayments.pay({
            driverId: driver.id,
            lineIds: lines.map((l) => l.id),
            adjustments: adjustments.map((a) => ({ ...a, reason: a.reason.trim() })),
            paymentMethod: method,
            ...(method === "MOMO" ? { momoNumber: momoNumber.trim(), momoReference: momoReference.trim() } : {}),
            ...(note.trim() ? { note: note.trim() } : {}),
        });
        setSaving(false);
        if (res.success && res.data) onPaid(res.data);
        else showToast(res.message || "Couldn't record the payout", "error");
    };

    return (
        <Modal
            title={`Pay ${driver.name}`}
            sub={`${lines.length} parcel${lines.length === 1 ? "" : "s"} · ${tripCount} trip${tripCount === 1 ? "" : "s"}`}
            onClose={onClose}
            wide
            footer={<>
                <Button variant="outline" className="flex-1 border-[#d1d1d1]" onClick={onClose} disabled={saving}>Back</Button>
                <Button className="flex-[2] bg-[#ea690c] text-white hover:bg-[#d45d0a] disabled:opacity-50" onClick={submit} disabled={!!problem || saving}>
                    {saving ? <><Loader className="mr-2 h-4 w-4 animate-spin" />Saving…</> : `Confirm payout · ${formatCurrency(totals.net)}`}
                </Button>
            </>}
        >
            <div className="space-y-4">
                <div className="rounded-xl border border-[#ececec] text-sm tabular-nums">
                    <div className="flex justify-between px-3 py-2"><span>Driver fees ({lines.length} parcels)</span><span>{formatCurrency(totals.gross)}</span></div>
                    {adjustments.filter((a) => a.amount > 0).map((a, i) => (
                        <div key={i} className={`flex justify-between border-t border-[#f2f2f2] px-3 py-2 ${a.type === "BONUS" ? "text-green-700" : "text-red-600"}`}>
                            <span className="truncate pr-3">{a.type === "BONUS" ? "+" : "−"} {ADJUSTMENT_LABEL[a.type]}{a.reason ? `: ${a.reason}` : ""}</span>
                            <span>{a.type === "BONUS" ? "+" : "−"} {formatCurrency(a.amount)}</span>
                        </div>
                    ))}
                    <div className="flex justify-between border-t border-[#ececec] bg-gray-50 px-3 py-2 font-bold"><span>To pay now</span><span>{formatCurrency(totals.net)}</span></div>
                </div>

                {openAdvances.length > 0 && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                        <p className="mb-2 text-xs font-semibold text-amber-900">Recorded earlier for this driver: include in this payout?</p>
                        {openAdvances.map((a) => (
                            <label key={a.id} className="flex items-center gap-2 py-1 text-sm">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4 accent-[#ea690c]"
                                    checked={recovering(a)}
                                    onChange={(e) => setAdjustments((list) => e.target.checked ? [...list, fromOpen(a)] : list.filter((x) => x.adjustmentId !== a.id))}
                                />
                                <span className="flex-1">
                                    <span className="font-medium">{a.type === "ADVANCE" ? "Recover advance" : ADJUSTMENT_LABEL[a.type]}</span>
                                    {a.reason ? `: ${a.reason}` : ""}{a.businessDate ? ` (${a.businessDate})` : ""}
                                </span>
                                <span className={`tabular-nums ${a.type === "BONUS" ? "text-green-700" : "text-red-600"}`}>{a.type === "BONUS" ? "+" : "−"}{formatCurrency(a.type === "ADVANCE" ? advanceOutstanding(a) : a.amount)}</span>
                            </label>
                        ))}
                    </div>
                )}

                {adjustments.map((a, i) => a.adjustmentId ? null : (
                    <div key={i} className="grid grid-cols-[110px_1fr_110px_auto] items-center gap-2">
                        <select aria-label="Adjustment type" value={a.type} onChange={(e) => setAdj(i, { type: e.target.value as PayoutAdjustment["type"] })} className="h-9 rounded-lg border border-[#d1d1d1] px-2 text-sm">
                            <option value="DEDUCTION">Deduction</option>
                            <option value="BONUS">Bonus</option>
                        </select>
                        <Input aria-label="Reason" placeholder="Reason, e.g. damaged item PF247701" value={a.reason} onChange={(e) => setAdj(i, { reason: e.target.value })} className="h-9 border-[#d1d1d1]" />
                        <Input aria-label="Amount" type="number" min="0" step="0.01" placeholder="GHC" value={a.amount || ""} onChange={(e) => setAdj(i, { amount: Number(e.target.value) || 0 })} className="h-9 border-[#d1d1d1] tabular-nums" />
                        <button onClick={() => setAdjustments((l) => l.filter((_, j) => j !== i))} aria-label="Remove adjustment" className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                ))}
                <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" className="border-[#d1d1d1]" onClick={() => setAdjustments((l) => [...l, { type: "DEDUCTION", amount: 0, reason: "" }])}><Plus className="mr-1 h-3.5 w-3.5" />Add deduction</Button>
                    <Button type="button" variant="outline" size="sm" className="border-[#d1d1d1]" onClick={() => setAdjustments((l) => [...l, { type: "BONUS", amount: 0, reason: "" }])}><Plus className="mr-1 h-3.5 w-3.5" />Add bonus</Button>
                </div>

                <div>
                    <p className="mb-1.5 text-xs font-semibold text-neutral-700">How are you paying?</p>
                    <div className="grid grid-cols-2 gap-3">
                        <button type="button" aria-pressed={method === "CASH"} onClick={() => setMethod("CASH")} className={optCls(method === "CASH")}><Banknote className="h-4 w-4" />Cash</button>
                        <button type="button" aria-pressed={method === "MOMO"} onClick={() => setMethod("MOMO")} className={optCls(method === "MOMO")}><Smartphone className="h-4 w-4" />Mobile money</button>
                    </div>
                </div>
                {method === "MOMO" && (
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label htmlFor="pay-momo-number" className="mb-1 block text-xs font-semibold text-neutral-700">Send to</label>
                            <Input id="pay-momo-number" value={momoNumber} onChange={(e) => setMomoNumber(e.target.value)} placeholder="0244 000 000" className="border-[#d1d1d1]" />
                            {driver.momoNetwork && <p className="mt-1 text-[11px] text-[#9a9a9a]">{driver.momoNetwork} MoMo on file</p>}
                        </div>
                        <div>
                            <label htmlFor="pay-momo-ref" className="mb-1 block text-xs font-semibold text-neutral-700">MoMo transaction ID</label>
                            <Input id="pay-momo-ref" value={momoReference} onChange={(e) => setMomoReference(e.target.value)} placeholder="e.g. 7712049935" className="border-[#d1d1d1]" />
                        </div>
                    </div>
                )}
                {method === "CASH" && <p className="text-xs text-[#6b7280]">Cash comes out of the counter drawer and shows in today's Counter Cash-up.</p>}
                <Input aria-label="Note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className="border-[#d1d1d1]" />
                {problem && <p className="text-xs text-neutral-500" role="status">{problem}</p>}
            </div>
        </Modal>
    );
};

// ── Receipt + SMS confirmation ──────────────────────────────────

const printReceipt = (p: DriverPayout, station?: string) => {
    const w = window.open("", "_blank", "width=380,height=640");
    if (!w) return;
    const row = (a: string, b: string, bold = false) => `<div style="display:flex;justify-content:space-between;${bold ? "font-weight:700" : ""}"><span>${a}</span><span>${b}</span></div>`;
    const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
    w.document.write(`<html><head><title>${esc(p.receiptNo || "Receipt")}</title></head><body style="font:12px/1.55 ui-monospace,Menlo,monospace;width:280px;margin:12px auto">
      <div style="text-align:center;font-weight:700;font-size:13px">Driver payout receipt</div>
      <div style="text-align:center;color:#555">${esc(station || "")}</div><hr style="border:0;border-top:1px dashed #999">
      ${row("Receipt", esc(p.receiptNo || p.id))}${row("Date", new Date(p.paidAt ?? Date.now()).toLocaleString())}
      ${row("Driver", esc(p.driverName || ""))}${row("Phone", esc(p.driverPhone || ""))}<hr style="border:0;border-top:1px dashed #999">
      ${row(`${p.lineIds?.length ?? 0} parcels, ${p.tripCount ?? 0} trips`, p.grossAmount.toFixed(2))}
      ${(p.adjustments ?? []).map((a) => row(esc(`${ADJUSTMENT_LABEL[a.type]}${a.reason ? " " + a.reason : ""}`).slice(0, 26), `${a.type === "BONUS" ? "" : "-"}${a.amount.toFixed(2)}`)).join("")}
      <hr style="border:0;border-top:1px dashed #999">${row(`PAID (${p.paymentMethod === "MOMO" ? "MoMo" : "Cash"})`, `GHC ${p.netAmount.toFixed(2)}`, true)}
      ${p.momoReference ? row("MoMo ID", esc(p.momoReference)) : ""}${row("Confirmed", p.confirmed ? "SMS code ✓" : "Not yet")}${row("Paid by", esc(p.paidByName || ""))}
      <script>window.onload=()=>{window.print()}</script></body></html>`);
    w.document.close();
};

export const ReceiptDialog = ({ payout: initial, station, canManage, onClose, onChanged }: {
    payout: DriverPayout; station?: string; canManage: boolean; onClose: () => void; onChanged: () => void;
}) => {
    const { showToast } = useToast();
    const [p, setP] = useState(initial);
    const [code, setCode] = useState("");
    const [sent, setSent] = useState(false);
    const [busy, setBusy] = useState<string | null>(null);
    const [reversing, setReversing] = useState(false);
    const [reason, setReason] = useState("");

    const refresh = async () => {
        const r = await driverPayments.payout(p.id);
        if (r.success && r.data) setP(r.data);
        onChanged();
    };
    const send = async () => {
        setBusy("send");
        const r = await driverPayments.sendCode(p.id);
        setBusy(null);
        if (r.success) { setSent(true); showToast(`Code sent to ${prettyPhone(p.driverPhone)}`, "success"); } else showToast(r.message || "Couldn't send the code", "error");
    };
    const confirm = async () => {
        setBusy("confirm");
        const r = await driverPayments.confirm(p.id, code.trim());
        setBusy(null);
        if (r.success) { showToast("Driver confirmed receipt", "success"); await refresh(); } else showToast(r.message || "That code didn't match", "error");
    };
    const reverse = async () => {
        setBusy("reverse");
        const r = await driverPayments.reverse(p.id, reason.trim());
        setBusy(null);
        if (r.success) { showToast("Payout reversed; the parcels are ready to pay again", "success"); setReversing(false); await refresh(); } else showToast(r.message || "Couldn't reverse the payout", "error");
    };

    const line = (a: ReactNode, b: ReactNode, cls = "") => <div className={`flex justify-between gap-4 ${cls}`}><span>{a}</span><span className="tabular-nums text-right">{b}</span></div>;

    return (
        <Modal title={p.reversed ? "Reversed payout" : "Payout recorded"} sub={`${p.receiptNo ?? p.id} · ${p.driverName ?? ""}`} onClose={onClose}
            footer={<>
                <Button variant="outline" className="flex-1 border-[#d1d1d1]" onClick={() => printReceipt(p, station)}><Printer className="mr-2 h-4 w-4" />Print receipt</Button>
                <Button className="flex-1 bg-neutral-900 text-white hover:bg-neutral-800" onClick={onClose}>Done</Button>
            </>}
        >
            <div className="space-y-4">
                <div className="rounded-xl border border-[#ececec] bg-[#fcfcfc] p-3 font-mono text-[12.5px] leading-6">
                    {line("Date", new Date(p.paidAt ?? Date.now()).toLocaleString())}
                    {line("Parcels / trips", `${p.lineIds?.length ?? 0} / ${p.tripCount ?? 0}`)}
                    {line("Driver fees", p.grossAmount.toFixed(2))}
                    {(p.adjustments ?? []).map((a, i) => <div key={i}>{line(`${ADJUSTMENT_LABEL[a.type]}${a.reason ? ` · ${a.reason}` : ""}`, `${a.type === "BONUS" ? "+" : "−"}${a.amount.toFixed(2)}`, a.type === "BONUS" ? "text-green-700" : "text-red-600")}</div>)}
                    <div className="my-1 border-t border-dashed border-gray-300" />
                    {line(<b>Paid ({p.paymentMethod === "MOMO" ? "MoMo" : "Cash"})</b>, <b>GHC {p.netAmount.toFixed(2)}</b>)}
                    {p.momoReference && line("MoMo ID", p.momoReference)}
                    {p.paidByName && line("Paid by", p.paidByName)}
                    {p.balanceReadyAfter != null && line("Ready after", (p.balanceReadyAfter ?? 0).toFixed(2))}
                </div>

                {p.reversed ? (
                    <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">Reversed{p.reversedByName ? ` by ${p.reversedByName}` : ""}{p.reversedReason ? `: ${p.reversedReason}` : ""}.</p>
                ) : p.confirmed ? (
                    <p className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-800"><CheckCircle2 className="h-4 w-4" />Driver confirmed receipt by SMS code{p.confirmedAt ? ` at ${new Date(p.confirmedAt).toLocaleTimeString()}` : ""}.</p>
                ) : (
                    <div className="space-y-2 rounded-xl border border-blue-200 bg-blue-50 p-3">
                        <p className="text-sm text-blue-900"><b>Driver confirms receipt:</b> send a 4-digit code to {prettyPhone(p.driverPhone) || "the driver"} and enter it when they have the money.</p>
                        <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="outline" className="border-blue-300 bg-white" onClick={send} disabled={busy !== null}>
                                {busy === "send" ? <Loader className="mr-1 h-3.5 w-3.5 animate-spin" /> : <MessageSquare className="mr-1 h-3.5 w-3.5" />}{sent ? "Send again" : "Send code"}
                            </Button>
                            <Input aria-label="Confirmation code" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="Code" className="h-9 w-24 bg-white tracking-widest" />
                            <Button size="sm" className="bg-blue-700 text-white hover:bg-blue-800" onClick={confirm} disabled={code.length < 4 || busy !== null}>Confirm</Button>
                        </div>
                    </div>
                )}

                {canManage && !p.reversed && !p.legacy && (
                    reversing ? (
                        <div className="space-y-2 rounded-xl border border-red-200 p-3">
                            <Input aria-label="Reason for reversing" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this payout being reversed?" className="border-red-200" />
                            <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={() => setReversing(false)}>Keep it</Button>
                                <Button size="sm" className="bg-red-600 text-white hover:bg-red-700" disabled={!reason.trim() || busy !== null} onClick={reverse}>Reverse payout</Button>
                            </div>
                        </div>
                    ) : (
                        <button onClick={() => setReversing(true)} className="text-xs font-medium text-red-600 hover:underline">Reverse this payout…</button>
                    )
                )}
            </div>
        </Modal>
    );
};

// ── Add or edit a driver ────────────────────────────────────────

export const DriverForm = ({ driver, onClose, onSaved }: { driver?: Driver | null; onClose: () => void; onSaved: (d: Driver) => void }) => {
    const { showToast } = useToast();
    const [name, setName] = useState(driver?.name ?? "");
    const [phones, setPhones] = useState((driver?.phoneNumbers ?? []).join(", "));
    const [momoNumber, setMomoNumber] = useState(driver?.momoNumber ?? "");
    const [momoNetwork, setMomoNetwork] = useState<MomoNetwork | "">(driver?.momoNetwork ?? "");
    const [vehicles, setVehicles] = useState((driver?.vehicles ?? []).join(", "));
    const [company, setCompany] = useState(driver?.company ?? "");
    const [blocked, setBlocked] = useState(driver?.status === "BLOCKED");
    const [saving, setSaving] = useState(false);
    const list = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
    const problem = !name.trim() ? "Enter the driver's name" : list(phones).length === 0 ? "Enter at least one phone number" : null;

    const save = async () => {
        if (problem) return;
        setSaving(true);
        const body: DriverInput = {
            name: name.trim(), phoneNumbers: list(phones), vehicles: list(vehicles).map((v) => v.toUpperCase()),
            ...(momoNumber.trim() ? { momoNumber: momoNumber.trim() } : {}), ...(momoNetwork ? { momoNetwork } : {}),
            ...(company.trim() ? { company: company.trim() } : {}), status: blocked ? "BLOCKED" : "ACTIVE",
        };
        const r = driver ? await driverPayments.updateDriver(driver.id, body) : await driverPayments.createDriver(body);
        setSaving(false);
        if (r.success && r.data) { showToast("Driver saved", "success"); onSaved(r.data); } else showToast(r.message || "Couldn't save the driver", "error");
    };
    const field = (id: string, label: string, el: ReactNode, hint?: string) => (
        <div><label htmlFor={id} className="mb-1 block text-xs font-semibold text-neutral-700">{label}</label>{el}{hint && <p className="mt-1 text-[11px] text-[#9a9a9a]">{hint}</p>}</div>
    );
    return (
        <Modal title={driver ? "Edit driver" : "Add driver"} onClose={onClose}
            footer={<>
                <Button variant="outline" className="flex-1 border-[#d1d1d1]" onClick={onClose}>Cancel</Button>
                <Button className="flex-1 bg-[#ea690c] text-white hover:bg-[#d45d0a] disabled:opacity-50" disabled={!!problem || saving} onClick={save}>{saving ? "Saving…" : "Save driver"}</Button>
            </>}>
            <div className="space-y-3">
                {field("drv-name", "Name", <Input id="drv-name" value={name} onChange={(e) => setName(e.target.value)} className="border-[#d1d1d1]" />)}
                {field("drv-phones", "Phone numbers", <Input id="drv-phones" value={phones} onChange={(e) => setPhones(e.target.value)} placeholder="0244118902, 0201234567" className="border-[#d1d1d1]" />, "Separate several with commas. Intake matches drivers by phone.")}
                <div className="grid grid-cols-[1fr_130px] gap-3">
                    {field("drv-momo", "MoMo number", <Input id="drv-momo" value={momoNumber} onChange={(e) => setMomoNumber(e.target.value)} className="border-[#d1d1d1]" />)}
                    {field("drv-network", "Network", <select id="drv-network" value={momoNetwork} onChange={(e) => setMomoNetwork(e.target.value as MomoNetwork | "")} className="h-10 w-full rounded-md border border-[#d1d1d1] px-2 text-sm"><option value="">-</option><option>MTN</option><option>TELECEL</option><option>AIRTELTIGO</option></select>)}
                </div>
                {field("drv-vehicles", "Vehicles", <Input id="drv-vehicles" value={vehicles} onChange={(e) => setVehicles(e.target.value)} placeholder="GR-2214-21, GR-880-20" className="border-[#d1d1d1]" />)}
                {field("drv-company", "Company (optional)", <Input id="drv-company" value={company} onChange={(e) => setCompany(e.target.value)} className="border-[#d1d1d1]" />)}
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-[#ea690c]" checked={blocked} onChange={(e) => setBlocked(e.target.checked)} />Blocked (can't be paid)</label>
                {problem && <p className="text-xs text-neutral-500">{problem}</p>}
            </div>
        </Modal>
    );
};

// ── Record an advance / deduction / bonus outside a payout ──────

export const AdjustmentForm = ({ driver, onClose, onSaved }: { driver: Driver; onClose: () => void; onSaved: () => void }) => {
    const { showToast } = useToast();
    const [type, setType] = useState<"ADVANCE" | "DEDUCTION" | "BONUS">("ADVANCE");
    const [amount, setAmount] = useState("");
    const [reason, setReason] = useState("");
    const [method, setMethod] = useState<PayMethod>("CASH");
    const [saving, setSaving] = useState(false);
    const n = Number(amount);
    const ok = n > 0 && reason.trim().length > 0;
    const save = async () => {
        if (!ok) return;
        setSaving(true);
        const r = await driverPayments.addAdjustment(driver.id, { type, amount: n, reason: reason.trim(), ...(type === "ADVANCE" ? { paymentMethod: method } : {}) });
        setSaving(false);
        if (r.success) { showToast(type === "ADVANCE" ? "Advance recorded" : "Saved for the next payout", "success"); onSaved(); } else showToast(r.message || "Couldn't save", "error");
    };
    return (
        <Modal title={`Advance or adjustment · ${driver.name}`} onClose={onClose}
            footer={<>
                <Button variant="outline" className="flex-1 border-[#d1d1d1]" onClick={onClose}>Cancel</Button>
                <Button className="flex-1 bg-[#ea690c] text-white hover:bg-[#d45d0a] disabled:opacity-50" disabled={!ok || saving} onClick={save}>Save</Button>
            </>}>
            <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                    {(["ADVANCE", "DEDUCTION", "BONUS"] as const).map((t) => (
                        <button key={t} type="button" aria-pressed={type === t} onClick={() => setType(t)} className={optCls(type === t)}>{t === "ADVANCE" ? "Advance" : t === "DEDUCTION" ? "Deduction" : "Bonus"}</button>
                    ))}
                </div>
                <p className="text-xs text-[#6b7280]">
                    {type === "ADVANCE" ? "Money given to the driver now (e.g. fuel). It's offered for recovery at the next payout." : "Applied automatically at the driver's next payout."}
                </p>
                <Input aria-label="Amount" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount (GHC)" className="border-[#d1d1d1] tabular-nums" />
                <Input aria-label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason" className="border-[#d1d1d1]" />
                {type === "ADVANCE" && (
                    <div className="grid grid-cols-2 gap-2">
                        <button type="button" aria-pressed={method === "CASH"} onClick={() => setMethod("CASH")} className={optCls(method === "CASH")}><Banknote className="h-4 w-4" />Cash</button>
                        <button type="button" aria-pressed={method === "MOMO"} onClick={() => setMethod("MOMO")} className={optCls(method === "MOMO")}><Smartphone className="h-4 w-4" />MoMo</button>
                    </div>
                )}
            </div>
        </Modal>
    );
};

/** Load a driver's open advances/adjustments (used by the pay dialog). */
export const useOpenAdjustments = (driverId: string | null, version: number) => {
    const [list, setList] = useState<DriverAdjustment[]>([]);
    useEffect(() => {
        if (!driverId) return setList([]);
        let stale = false;
        driverPayments.adjustments(driverId, true).then((r) => { if (!stale) setList(r.success ? r.data ?? [] : []); });
        return () => { stale = true; };
    }, [driverId, version]);
    return useMemo(() => list, [list]);
};
