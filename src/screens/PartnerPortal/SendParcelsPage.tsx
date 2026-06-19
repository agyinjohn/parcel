import { useState, useEffect } from "react";

import { useNavigate } from "react-router-dom";

import { Send, Plus, Trash2, CheckCircle2, AlertCircle } from "lucide-react";

import { Card, CardContent } from "../../components/ui/card";

import { Button } from "../../components/ui/button";

import { Input } from "../../components/ui/input";

import { Label } from "../../components/ui/label";
import { GhanaPhoneInput } from "../../components/GhanaPhoneInput";
import { validatePhoneNumber } from "../../utils/dataHelpers";

import {

  EMPTY_FORM, formatCurrency,

  type SendParcelForm,

} from "./partnerData";

import { getVendorSessionProfile } from "./vendorSession";

import { useVendorStations } from "./useVendorStations";

import vendorService, { inferParcelPod } from "../../services/vendorService";
import { useToast } from "../../components/ui/toast";



export const SendParcelsPage = () => {

  const navigate = useNavigate();
  const { showToast } = useToast();

  const vendor = getVendorSessionProfile();

  const { stations, loading: stationsLoading, error: stationsError } = useVendorStations();



  const [form, setForm] = useState<SendParcelForm>({

    ...EMPTY_FORM,

    senderName: vendor.name,

  });

  const [formErrors, setFormErrors] = useState<Partial<Record<keyof SendParcelForm, string>>>({});

  const [batch, setBatch] = useState<SendParcelForm[]>([]);

  const [bulkMode, setBulkMode] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const [submitError, setSubmitError] = useState<string | null>(null);

  const [submittedCount, setSubmittedCount] = useState(0);

  const [submittedIds, setSubmittedIds] = useState<string[]>([]);

  const [submitSuccess, setSubmitSuccess] = useState(false);



  useEffect(() => {

    if (vendor.name) {

      setForm(prev => ({ ...prev, senderName: vendor.name }));

    }

  }, [vendor.name]);



  const parseAmount = (value: string) => parseFloat(value || "0") || 0;

  const formHasAmount = (f: SendParcelForm) =>
    parseAmount(f.deliveryFee) > 0 || parseAmount(f.itemCost) > 0;

  const setField = (field: keyof SendParcelForm) => (value: string | boolean) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const setCostField = (field: "deliveryFee" | "itemCost", value: string) => {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      const delivery = parseAmount(field === "deliveryFee" ? value : prev.deliveryFee);
      const item = parseAmount(field === "itemCost" ? value : prev.itemCost);
      if (delivery > 0 || item > 0) {
        next.pod = true;
      } else {
        next.pod = false;
      }
      return next;
    });
  };



  const validate = (): boolean => {

    const errs: Partial<Record<keyof SendParcelForm, string>> = {};

    if (!form.senderName) errs.senderName = "Required";

    if (!form.receiverName) errs.receiverName = "Required";

    if (!form.receiverPhone || !validatePhoneNumber(form.receiverPhone)) {
      errs.receiverPhone = "Enter a valid phone number";
    }

    if (form.receiverAltPhone && !validatePhoneNumber(form.receiverAltPhone)) {
      errs.receiverAltPhone = "Enter a valid phone number";
    }

    if (!form.stationId) errs.stationId = "Required";

    const isPod = inferParcelPod(form.pod, parseAmount(form.itemCost), parseAmount(form.deliveryFee));

    if (isPod && !formHasAmount(form)) {
      errs.deliveryFee = "Enter delivery fee or item cost for POD";
    }

    setFormErrors(errs);

    return Object.keys(errs).length === 0;

  };



  const stationName = (stationId: string) =>

    stations.find(s => s.id === stationId)?.name || "";



  const formToPayload = (f: SendParcelForm) => {
    const deliveryFee = parseAmount(f.deliveryFee);
    const itemCost = parseAmount(f.itemCost);
    const pod = inferParcelPod(f.pod, itemCost, deliveryFee);

    return {
    receiverName: f.receiverName.trim(),

    recieverPhoneNumber: f.receiverPhone.trim(),

    recieverAlternativePhoneNumber: f.receiverAltPhone.trim() || undefined,

    receiverAddress: f.receiverAddress.trim() || undefined,

    parcelDescription: f.description.trim() || undefined,

    parcelWeight: f.weight ? parseFloat(f.weight) : undefined,

    numberOfItems: f.itemCount ? parseInt(f.itemCount, 10) : undefined,

    destinationStationId: f.stationId,

    deliveryFee: pod && deliveryFee > 0 ? deliveryFee : undefined,

    itemCost: pod && itemCost > 0 ? itemCost : undefined,

    pod,
  };
  };



  const addToBatch = () => {

    if (!validate()) return;

    setBatch(prev => [...prev, form]);

    setForm(prev => ({ ...EMPTY_FORM, senderName: prev.senderName, stationId: prev.stationId }));

    setFormErrors({});

  };



  const handleSubmit = async () => {

    const toSubmit = bulkMode ? batch : (validate() ? [form] : null);

    if (!toSubmit || toSubmit.length === 0) return;



    setSubmitting(true);

    setSubmitError(null);

    const ids: string[] = [];



    for (const entry of toSubmit) {

      const result = await vendorService.submitParcel(formToPayload(entry));

      if (!result.success || !result.data?.parcelId) {

        setSubmitError(result.message);
        showToast(result.message || "Failed to save parcel. Please try again.", "error");
        setSubmitting(false);

        return;

      }

      ids.push(result.data.parcelId);

    }



    setSubmittedCount(toSubmit.length);

    setSubmittedIds(ids);

    showToast(`Successfully saved ${toSubmit.length} parcel${toSubmit.length > 1 ? "s" : ""}!`, "success");

    setSubmitting(false);

    setSubmitSuccess(true);

    setForm({ ...EMPTY_FORM, senderName: vendor.name });

    setBatch([]);

  };



  if (submitSuccess) {

    return (

      <div className="space-y-5 pb-10">

        <Card className="border border-green-200 bg-green-50 shadow-sm">

          <CardContent className="p-6">

            <div className="flex items-center gap-3 mb-4">

              <CheckCircle2 className="w-8 h-8 text-green-600 flex-shrink-0" />

              <div>

                <h3 className="text-base font-bold text-green-800">

                  {submittedCount} Parcel{submittedCount > 1 ? "s" : ""} Submitted Successfully!

                </h3>

                <p className="text-xs text-green-600 mt-0.5">Your parcels have been registered with M&amp;M. Keep these tracking IDs.</p>

              </div>

            </div>

            <div className="space-y-2 mb-5">

              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tracking ID{submittedIds.length > 1 ? "s" : ""}</p>

              {submittedIds.map(id => (

                <div key={id} className="flex items-center gap-3 bg-white border border-green-200 rounded-lg px-4 py-2.5">

                  <span className="font-mono text-sm font-bold text-[#ea690c]">{id}</span>

                  <span className="text-xs text-gray-400 ml-auto">Pending</span>

                </div>

              ))}

            </div>

            <div className="flex gap-3">

              <Button

                onClick={() => setSubmitSuccess(false)}

                className="flex-1 bg-[#ea690c] text-white hover:bg-[#d45e0a]"

              >

                Send More Parcels

              </Button>

              <Button

                onClick={() => navigate("/partner/track")}

                variant="outline"

                className="flex-1 border-[#ea690c] text-[#ea690c] hover:bg-orange-50"

              >

                View in Tracker

              </Button>

            </div>

          </CardContent>

        </Card>

      </div>

    );

  }



  return (

    <div className="space-y-5 pb-10">



      {submitError && (

        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">

          <AlertCircle className="w-4 h-4 flex-shrink-0" />

          {submitError}

        </div>

      )}



      <div className="flex items-center justify-between">

        <div>

          <h2 className="text-base font-bold text-neutral-800">Register {bulkMode ? "Multiple Parcels" : "a Parcel"}</h2>

          <p className="text-xs text-gray-500 mt-0.5">Fill in receiver details and choose a destination station</p>

        </div>

        <label className="flex items-center gap-2.5 cursor-pointer select-none">

          <span className="text-sm text-gray-600 font-medium">Bulk Mode</span>

          <div

            onClick={() => { setBulkMode(v => !v); setBatch([]); }}

            className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${bulkMode ? "bg-[#ea690c]" : "bg-gray-300"}`}

          >

            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${bulkMode ? "translate-x-6" : "translate-x-1"}`} />

          </div>

        </label>

      </div>



      <Card className="border border-[#d1d1d1] bg-white shadow-sm">

        <CardContent className="p-6 space-y-6">



          <div>

            <h3 className="text-sm font-semibold text-neutral-800 mb-3 flex items-center gap-2">

              <span className="w-5 h-5 rounded-full bg-orange-100 text-[#ea690c] text-xs font-bold flex items-center justify-center">1</span>

              Sender Details

            </h3>

            <div className="space-y-1.5">

              <Label className="text-xs font-semibold text-neutral-800">Sender / Business Name <span className="text-red-500">*</span></Label>

              <Input

                value={form.senderName}

                onChange={e => setField("senderName")(e.target.value)}

                placeholder="Your business name"

                className={`border ${formErrors.senderName ? "border-red-400" : "border-[#d1d1d1]"}`}

              />

              {formErrors.senderName && <p className="text-xs text-red-500">{formErrors.senderName}</p>}

              <p className="text-xs text-gray-400">Auto-filled from your account. Edit if sending on behalf of another business.</p>

            </div>

          </div>



          <div className="border-t border-gray-100" />



          <div>

            <h3 className="text-sm font-semibold text-neutral-800 mb-3 flex items-center gap-2">

              <span className="w-5 h-5 rounded-full bg-orange-100 text-[#ea690c] text-xs font-bold flex items-center justify-center">2</span>

              Receiver Details

            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              <div className="space-y-1.5">

                <Label className="text-xs font-semibold text-neutral-800">Full Name <span className="text-red-500">*</span></Label>

                <Input value={form.receiverName} onChange={e => setField("receiverName")(e.target.value)}

                  placeholder="John Doe"

                  className={`border ${formErrors.receiverName ? "border-red-400" : "border-[#d1d1d1]"}`} />

                {formErrors.receiverName && <p className="text-xs text-red-500">{formErrors.receiverName}</p>}

              </div>

              <div className="space-y-1.5">

                <Label className="text-xs font-semibold text-neutral-800">Phone Number <span className="text-red-500">*</span></Label>

                <GhanaPhoneInput
                  value={form.receiverPhone}
                  onChange={v => setField("receiverPhone")(v)}
                  className={formErrors.receiverPhone ? "border-red-400" : "border-[#d1d1d1]"}
                />

                {formErrors.receiverPhone && <p className="text-xs text-red-500">{formErrors.receiverPhone}</p>}

              </div>

              <div className="space-y-1.5">

                <Label className="text-xs font-semibold text-neutral-800">Alternative Phone</Label>

                <GhanaPhoneInput
                  value={form.receiverAltPhone}
                  onChange={v => setField("receiverAltPhone")(v)}
                  placeholder="Optional"
                  className={formErrors.receiverAltPhone ? "border-red-400" : "border-[#d1d1d1]"}
                />

                {formErrors.receiverAltPhone && <p className="text-xs text-red-500">{formErrors.receiverAltPhone}</p>}

              </div>

              <div className="space-y-1.5">

                <Label className="text-xs font-semibold text-neutral-800">Delivery Address</Label>

                <Input value={form.receiverAddress} onChange={e => setField("receiverAddress")(e.target.value)}

                  placeholder="Street, Area, City" className="border border-[#d1d1d1]" />

              </div>

            </div>

          </div>



          <div className="border-t border-gray-100" />



          <div>

            <h3 className="text-sm font-semibold text-neutral-800 mb-3 flex items-center gap-2">

              <span className="w-5 h-5 rounded-full bg-orange-100 text-[#ea690c] text-xs font-bold flex items-center justify-center">3</span>

              Parcel Information

            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

              <div className="space-y-1.5 sm:col-span-3">

                <Label className="text-xs font-semibold text-neutral-800">Item Description</Label>

                <Input value={form.description} onChange={e => setField("description")(e.target.value)}

                  placeholder="e.g. Electronics, Clothing, Shoes..." className="border border-[#d1d1d1]" />

              </div>

              <div className="space-y-1.5">

                <Label className="text-xs font-semibold text-neutral-800">Weight (kg)</Label>

                <Input type="number" min="0" step="0.1" value={form.weight}

                  onChange={e => setField("weight")(e.target.value)}

                  placeholder="e.g. 1.5" className="border border-[#d1d1d1]" />

              </div>

              <div className="space-y-1.5">

                <Label className="text-xs font-semibold text-neutral-800">Number of Items</Label>

                <Input type="number" min="1" value={form.itemCount}

                  onChange={e => setField("itemCount")(e.target.value)}

                  placeholder="e.g. 2" className="border border-[#d1d1d1]" />

              </div>

            </div>

          </div>



          <div className="border-t border-gray-100" />



          <div>

            <h3 className="text-sm font-semibold text-neutral-800 mb-3 flex items-center gap-2">

              <span className="w-5 h-5 rounded-full bg-orange-100 text-[#ea690c] text-xs font-bold flex items-center justify-center">4</span>

              Station &amp; Pricing

            </h3>

            <div className="space-y-4">
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
                <div>
                  <span className="text-sm font-medium text-neutral-800">Payment on Delivery (POD)</span>
                  <p className="text-xs text-gray-400">Automatically enabled when a delivery fee or item cost is set</p>
                </div>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-neutral-800">
                    Delivery Fee (GHC) {form.pod && <span className="text-red-500">*</span>}
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    value={form.deliveryFee}
                    onChange={e => setCostField("deliveryFee", e.target.value)}
                    disabled={!form.pod}
                    placeholder={form.pod ? "e.g. 20" : "Enable POD first"}
                    className={`border ${formErrors.deliveryFee ? "border-red-400" : "border-[#d1d1d1]"} disabled:bg-gray-50 disabled:text-gray-400`}
                  />
                  {formErrors.deliveryFee && <p className="text-xs text-red-500">{formErrors.deliveryFee}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-neutral-800">
                    Item Cost (GHC) {form.pod && <span className="text-red-500">*</span>}
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    value={form.itemCost}
                    onChange={e => setCostField("itemCost", e.target.value)}
                    disabled={!form.pod}
                    placeholder={form.pod ? "e.g. 350" : "Enable POD first"}
                    className={`border ${formErrors.itemCost ? "border-red-400" : "border-[#d1d1d1]"} disabled:bg-gray-50 disabled:text-gray-400`}
                  />
                  {formErrors.itemCost && <p className="text-xs text-red-500">{formErrors.itemCost}</p>}
                </div>
              </div>
            </div>

          </div>



          {formHasAmount(form) && (

            <div className="bg-gradient-to-br from-orange-50 to-orange-100/40 border border-orange-200 rounded-xl px-4 py-3">

              <p className="text-xs font-semibold text-[#ea690c] uppercase tracking-wider mb-2">Cost Summary</p>

              <div className="space-y-1 text-sm">

                <div className="flex justify-between text-gray-600">

                  <span>Delivery Fee</span>

                  <span className="font-medium">GHC {parseFloat(form.deliveryFee || "0").toFixed(2)}</span>

                </div>

                {form.pod && (

                  <div className="flex justify-between text-gray-600">

                    <span>Item Cost (POD)</span>

                    <span className="font-medium">GHC {parseFloat(form.itemCost || "0").toFixed(2)}</span>

                  </div>

                )}

                <div className="flex justify-between font-bold text-[#ea690c] border-t border-orange-200 pt-1.5 mt-1.5">

                  <span>Total to Collect from Recipient</span>

                  <span>GHC {(parseFloat(form.deliveryFee || "0") + (form.pod ? parseFloat(form.itemCost || "0") : 0)).toFixed(2)}</span>

                </div>

              </div>

            </div>

          )}



          {bulkMode && (

            <div className="space-y-3 border-t border-gray-100 pt-4">

              <Button type="button" onClick={addToBatch}

                className="flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700">

                <Plus className="w-4 h-4" /> Add to Batch

              </Button>

              {batch.length > 0 && (

                <div className="space-y-2">

                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{batch.length} parcel(s) in batch</p>

                  {batch.map((b, i) => (

                    <div key={i} className="flex items-center justify-between rounded-xl border border-[#d1d1d1] bg-gray-50 px-4 py-2.5">

                      <div>

                        <p className="text-sm font-semibold text-neutral-800">{b.receiverName}</p>

                        <p className="text-xs text-gray-500">{b.receiverPhone} · {stationName(b.stationId)} · {formatCurrency(parseFloat(b.deliveryFee || "0") + (b.pod ? parseFloat(b.itemCost || "0") : 0))}</p>

                      </div>

                      <button onClick={() => setBatch(prev => prev.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600 ml-3 p-1 hover:bg-red-50 rounded transition-colors">

                        <Trash2 className="w-4 h-4" />

                      </button>

                    </div>

                  ))}

                </div>

              )}

            </div>

          )}



          <div className="flex justify-end pt-1 border-t border-gray-100">

            <Button

              onClick={handleSubmit}

              disabled={submitting || (bulkMode && batch.length === 0) || stationsLoading}

              className="flex items-center gap-2 bg-[#ea690c] text-white hover:bg-[#d45e0a] disabled:opacity-50 px-8 h-10"

            >

              {submitting ? (

                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Submitting...</>

              ) : (

                <><Send className="w-4 h-4" /> {bulkMode ? `Submit ${batch.length || ""} Parcel${batch.length !== 1 ? "s" : ""}` : "Submit Parcel"}</>

              )}

            </Button>

          </div>

        </CardContent>

      </Card>

    </div>

  );

};


