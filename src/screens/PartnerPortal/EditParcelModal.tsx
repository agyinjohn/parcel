import { useState } from "react";
import { X, Save, AlertCircle } from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { GhanaPhoneInput } from "../../components/GhanaPhoneInput";
import { formatCurrency, type PartnerParcel } from "./partnerData";
import {
    applyCostFieldUpdate,
    buildVendorPayload,
    parcelToEditForm,
    validateVendorParcelForm,
} from "./partnerFormUtils";
import { useVendorStations } from "./useVendorStations";
import vendorService from "../../services/vendorService";
import { useToast } from "../../components/ui/toast";

interface Props {
    parcel: PartnerParcel;
    onClose: () => void;
    onSaved: () => void;
}

export const EditParcelModal = ({ parcel, onClose, onSaved }: Props) => {
    const { showToast } = useToast();
    const { stations, loading: stationsLoading, error: stationsError } = useVendorStations();
    const [form, setForm] = useState(() => parcelToEditForm(parcel));
    const [formErrors, setFormErrors] = useState<Partial<Record<string, string>>>({});
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const setField = (field: keyof typeof form) => (value: string | boolean) =>
        setForm(prev => ({ ...prev, [field]: value }));

    const handleSubmit = async () => {
        const errs = validateVendorParcelForm(form);
        setFormErrors(errs);
        if (Object.keys(errs).length > 0) return;

        setSubmitting(true);
        setSubmitError(null);
        const result = await vendorService.updateParcel(parcel.trackingId, buildVendorPayload(form));
        setSubmitting(false);

        if (!result.success) {
            setSubmitError(result.message);
            showToast(result.message || "Failed to update parcel. Please try again.", "error");
            return;
        }

        showToast(result.message || "Parcel updated successfully!", "success");
        onSaved();
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-lg border border-[#d1d1d1] bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
                <CardContent className="p-0">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-white sticky top-0 z-10">
                        <div>
                            <h3 className="text-base font-bold text-neutral-800">Edit Parcel</h3>
                            <p className="font-mono text-sm text-[#ea690c] font-bold mt-0.5">{parcel.trackingId}</p>
                        </div>
                        <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-neutral-800 hover:bg-gray-100 transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="p-5 space-y-4">
                        {submitError && (
                            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                {submitError}
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5 sm:col-span-2">
                                <Label className="text-xs font-semibold text-neutral-800">Receiver Name <span className="text-red-500">*</span></Label>
                                <Input value={form.receiverName} onChange={e => setField("receiverName")(e.target.value)}
                                    className={formErrors.receiverName ? "border-red-400" : "border-[#d1d1d1]"} />
                                {formErrors.receiverName && <p className="text-xs text-red-500">{formErrors.receiverName}</p>}
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-neutral-800">Phone <span className="text-red-500">*</span></Label>
                                <GhanaPhoneInput value={form.receiverPhone} onChange={v => setField("receiverPhone")(v)}
                                    className={formErrors.receiverPhone ? "border-red-400" : "border-[#d1d1d1]"} />
                                {formErrors.receiverPhone && <p className="text-xs text-red-500">{formErrors.receiverPhone}</p>}
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-neutral-800">Alternative Phone</Label>
                                <GhanaPhoneInput value={form.receiverAltPhone} onChange={v => setField("receiverAltPhone")(v)}
                                    placeholder="Optional"
                                    className={formErrors.receiverAltPhone ? "border-red-400" : "border-[#d1d1d1]"} />
                            </div>
                            <div className="space-y-1.5 sm:col-span-2">
                                <Label className="text-xs font-semibold text-neutral-800">Delivery Address</Label>
                                <Input value={form.receiverAddress} onChange={e => setField("receiverAddress")(e.target.value)} className="border-[#d1d1d1]" />
                            </div>
                            <div className="space-y-1.5 sm:col-span-2">
                                <Label className="text-xs font-semibold text-neutral-800">Description</Label>
                                <Input value={form.description} onChange={e => setField("description")(e.target.value)} className="border-[#d1d1d1]" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-neutral-800">Weight (kg)</Label>
                                <Input type="number" min="0" step="0.1" value={form.weight} onChange={e => setField("weight")(e.target.value)} className="border-[#d1d1d1]" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-neutral-800">Number of Items</Label>
                                <Input type="number" min="1" value={form.itemCount} onChange={e => setField("itemCount")(e.target.value)} className="border-[#d1d1d1]" />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-neutral-800">Destination Station <span className="text-red-500">*</span></Label>
                            <select
                                value={form.stationId}
                                onChange={e => setField("stationId")(e.target.value)}
                                disabled={stationsLoading}
                                className={`w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#ea690c] disabled:bg-gray-50 ${formErrors.stationId ? "border-red-400" : "border-[#d1d1d1]"}`}
                            >
                                <option value="">{stationsLoading ? "Loading stations..." : "Select a station"}</option>
                                {stations.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}{s.location ? ` — ${s.location}` : ""}</option>
                                ))}
                                {!stationsLoading && form.stationId && !stations.some(s => s.id === form.stationId) && (
                                    <option value={form.stationId}>{parcel.station || form.stationId}</option>
                                )}
                            </select>
                            {stationsError && <p className="text-xs text-red-500">{stationsError}</p>}
                            {formErrors.stationId && <p className="text-xs text-red-500">{formErrors.stationId}</p>}
                        </div>

                        <label className="flex items-center gap-2.5 cursor-pointer w-fit">
                            <input
                                type="checkbox"
                                checked={form.pod}
                                onChange={e => {
                                    const enabled = e.target.checked;
                                    setForm(prev => ({
                                        ...prev,
                                        pod: enabled,
                                        ...(!enabled ? { deliveryFee: "", itemCost: "" } : {}),
                                    }));
                                }}
                                className="w-4 h-4 accent-[#ea690c] rounded"
                            />
                            <span className="text-sm font-medium text-neutral-800">Payment on Delivery (POD)</span>
                        </label>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-neutral-800">Delivery Fee (GHC)</Label>
                                <Input type="number" min="0" value={form.deliveryFee} disabled={!form.pod}
                                    onChange={e => setForm(prev => applyCostFieldUpdate(prev, "deliveryFee", e.target.value))}
                                    className="border-[#d1d1d1] disabled:bg-gray-50" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-neutral-800">Item Cost (GHC)</Label>
                                <Input type="number" min="0" value={form.itemCost} disabled={!form.pod}
                                    onChange={e => setForm(prev => applyCostFieldUpdate(prev, "itemCost", e.target.value))}
                                    className="border-[#d1d1d1] disabled:bg-gray-50" />
                            </div>
                        </div>

                        {form.pod && (form.deliveryFee || form.itemCost) && (
                            <p className="text-xs text-gray-500">
                                Total to collect: {formatCurrency(parseFloat(form.deliveryFee || "0") + parseFloat(form.itemCost || "0"))}
                            </p>
                        )}

                        <div className="flex gap-3 pt-2">
                            <Button type="button" variant="outline" onClick={onClose} className="flex-1 h-10">Cancel</Button>
                            <Button onClick={handleSubmit} disabled={submitting || stationsLoading}
                                className="flex-1 h-10 bg-[#ea690c] text-white hover:bg-[#d45e0a] flex items-center justify-center gap-2">
                                {submitting ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <><Save className="w-4 h-4" /> Save Changes</>
                                )}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
