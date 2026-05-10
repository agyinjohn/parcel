import { useState } from "react";
import {
  MapPinIcon,
  PackageIcon,
  TruckIcon,
  Loader,
  CheckCircleIcon,
} from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { CostInput } from "../../components/ui/CostInput";
import { Textarea } from "../../components/ui/textarea";
import { useToast } from "../../components/ui/toast";
import { validatePhoneNumber, normalizePhoneNumber } from "../../utils/dataHelpers";
import authService from "../../services/authService";
import frontdeskService, { type ParcelRequest } from "../../services/frontdeskService";

export interface PickupRequestFormData {
  pickupAddress: string;
  pickupContactName: string;
  pickupContactPhone: string;
  deliveryAddress: string;
  recipientName: string;
  recipientPhone: string;
  parcelDescription: string;
  itemValue?: number;
  specialInstructions?: string;
  pickupCost?: number;
  deliveryCost?: number;
  preferredPickupDate?: string;
  preferredPickupTime?: string;
}

const initialFormState: PickupRequestFormData = {
  pickupAddress: "",
  pickupContactName: "",
  pickupContactPhone: "",
  deliveryAddress: "",
  recipientName: "",
  recipientPhone: "",
  parcelDescription: "",
  itemValue: undefined,
  specialInstructions: "",
  pickupCost: undefined,
  deliveryCost: undefined,
  preferredPickupDate: "",
  preferredPickupTime: "",
};

export const PickupRequest = (): JSX.Element => {
  const { showToast } = useToast();
  const [form, setForm] = useState<PickupRequestFormData>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const updateField = <K extends keyof PickupRequestFormData>(
    key: K,
    value: PickupRequestFormData[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updatePhoneField = (key: "pickupContactPhone" | "recipientPhone", value: string) => {
    const digits = value.replace(/\D/g, "").substring(0, 10);
    const normalized = normalizePhoneNumber(digits);
    setForm((prev) => ({ ...prev, [key]: normalized }));
  };

  const validate = (): boolean => {
    if (!form.pickupAddress?.trim()) {
      showToast("Pickup address is required", "error");
      return false;
    }
    if (!form.pickupContactName?.trim()) {
      showToast("Pickup contact name is required", "error");
      return false;
    }
    if (!form.pickupContactPhone?.trim()) {
      showToast("Pickup contact phone is required", "error");
      return false;
    }
    if (!validatePhoneNumber(form.pickupContactPhone)) {
      showToast("Invalid phone number format. Use 0XXXXXXXXX or XXXXXXXXX", "error");
      return false;
    }
    if (!form.deliveryAddress?.trim()) {
      showToast("Delivery address is required", "error");
      return false;
    }
    if (!form.recipientName?.trim()) {
      showToast("Recipient name is required", "error");
      return false;
    }
    if (!form.recipientPhone?.trim()) {
      showToast("Recipient phone is required", "error");
      return false;
    }
    if (!validatePhoneNumber(form.recipientPhone)) {
      showToast("Invalid phone number format. Use 0XXXXXXXXX or XXXXXXXXX", "error");
      return false;
    }
    if (!form.parcelDescription?.trim()) {
      showToast("Parcel description is required", "error");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const userData = authService.getUser();
    const officeId = (userData as any)?.office?.id;

    if (!officeId) {
      showToast("Office ID not found. Please ensure you are logged in with a valid account.", "error");
      return;
    }

    setIsSubmitting(true);
    setSubmitSuccess(false);

    try {
      // Map the pickup form into the backend parcel payload
      // Phones are stored with +233 prefix (normalizePhoneNumber) and sent as-is
      const payload: ParcelRequest = {
        officeId,
        typeofParcel: "PICKUP",

        // Treat pickup contact as sender
        senderName: form.pickupContactName,
        senderPhoneNumber: form.pickupContactPhone,

        // Treat delivery contact as receiver
        receiverName: form.recipientName,
        receiverAddress: form.deliveryAddress,
        recieverPhoneNumber: form.recipientPhone,

        parcelDescription: form.parcelDescription,

        // Pickup / delivery specific fields
        pickupAddress: form.pickupAddress,
        pickupContactName: form.pickupContactName,
        pickupContactPhoneNumber: form.pickupContactPhone,
        pickupInstructions: form.specialInstructions,
        deliveryAddress: form.deliveryAddress,
        deliveryContactName: form.recipientName,
        deliveryContactPhoneNumber: form.recipientPhone,
        specialInstructions: form.specialInstructions,

        // Costs and value (optional – leave undefined when blank)
        itemCost: form.itemValue,
        pickUpCost: form.pickupCost,
        deliveryCost: form.deliveryCost,

        // Default flags for a new pickup request
        homeDelivery: true,
        pod: false,
        delivered: false,
        pickedUp: false,
        parcelAssigned: false,
        fragile: false,
        itemOwnerPaid: false,
      };

      const response = await frontdeskService.addParcel(payload);

      if (response.success) {
        showToast("Pickup request submitted successfully. A rider will be assigned for collection.", "success");
        setSubmitSuccess(true);
        setForm(initialFormState);
      } else {
        showToast(response.message || "Failed to submit pickup request", "error");
      }
    } catch (error) {
      console.error("Pickup request error:", error);
      showToast("Failed to submit pickup request. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setForm(initialFormState);
    setSubmitSuccess(false);
  };

  return (
    <Card className="rounded-lg border border-[#d1d1d1] bg-white shadow-sm">
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Pickup & Delivery side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Pickup Location */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                <MapPinIcon className="w-4 h-4 text-[#ea690c]" />
                <h2 className="text-sm font-semibold text-neutral-800">Pickup Location</h2>
              </div>
              <div>
                <Label htmlFor="pickupAddress" className="text-xs font-medium text-neutral-700">Address <span className="text-[#e22420]">*</span></Label>
                <Input
                  id="pickupAddress"
                  placeholder="e.g. 123 Main Street, Accra"
                  value={form.pickupAddress}
                  onChange={(e) => updateField("pickupAddress", e.target.value)}
                  className="mt-1 border border-[#d1d1d1] h-9 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="pickupContactName" className="text-xs font-medium text-neutral-700">Contact Name <span className="text-[#e22420]">*</span></Label>
                  <Input
                    id="pickupContactName"
                    placeholder="Person at pickup"
                    value={form.pickupContactName}
                    onChange={(e) => updateField("pickupContactName", e.target.value)}
                    className="mt-1 border border-[#d1d1d1] h-9 text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="pickupContactPhone" className="text-xs font-medium text-neutral-700">Phone <span className="text-[#e22420]">*</span></Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-xs pointer-events-none z-10">+233</span>
                    <Input
                      id="pickupContactPhone"
                      type="tel"
                      value={form.pickupContactPhone.startsWith("+233") ? form.pickupContactPhone.substring(4) : form.pickupContactPhone}
                      onChange={(e) => updatePhoneField("pickupContactPhone", e.target.value)}
                      placeholder="XXXXXXXXX"
                      className="pl-12 border border-[#d1d1d1] h-9 text-sm"
                      maxLength={10}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery Location */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                <TruckIcon className="w-4 h-4 text-[#ea690c]" />
                <h2 className="text-sm font-semibold text-neutral-800">Delivery Location</h2>
              </div>
              <div>
                <Label htmlFor="deliveryAddress" className="text-xs font-medium text-neutral-700">Address <span className="text-[#e22420]">*</span></Label>
                <Input
                  id="deliveryAddress"
                  placeholder="e.g. 45 Oak Avenue, Kumasi"
                  value={form.deliveryAddress}
                  onChange={(e) => updateField("deliveryAddress", e.target.value)}
                  className="mt-1 border border-[#d1d1d1] h-9 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="recipientName" className="text-xs font-medium text-neutral-700">Recipient Name <span className="text-[#e22420]">*</span></Label>
                  <Input
                    id="recipientName"
                    placeholder="Person receiving"
                    value={form.recipientName}
                    onChange={(e) => updateField("recipientName", e.target.value)}
                    className="mt-1 border border-[#d1d1d1] h-9 text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="recipientPhone" className="text-xs font-medium text-neutral-700">Phone <span className="text-[#e22420]">*</span></Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-xs pointer-events-none z-10">+233</span>
                    <Input
                      id="recipientPhone"
                      type="tel"
                      value={form.recipientPhone.startsWith("+233") ? form.recipientPhone.substring(4) : form.recipientPhone}
                      onChange={(e) => updatePhoneField("recipientPhone", e.target.value)}
                      placeholder="XXXXXXXXX"
                      className="pl-12 border border-[#d1d1d1] h-9 text-sm"
                      maxLength={10}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <hr className="border-gray-200" />

          {/* Parcel Details & Costs side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Parcel Details */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                <PackageIcon className="w-4 h-4 text-[#ea690c]" />
                <h2 className="text-sm font-semibold text-neutral-800">Parcel Details</h2>
              </div>
              <div>
                <Label htmlFor="parcelDescription" className="text-xs font-medium text-neutral-700">Description <span className="text-[#e22420]">*</span></Label>
                <Input
                  id="parcelDescription"
                  placeholder="e.g. Documents, Electronics, Clothing"
                  value={form.parcelDescription}
                  onChange={(e) => updateField("parcelDescription", e.target.value)}
                  className="mt-1 border border-[#d1d1d1] h-9 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="itemValue" className="text-xs font-medium text-neutral-700">Item Value (GHC)</Label>
                  <CostInput
                    id="itemValue"
                    value={form.itemValue}
                    onChange={(v) => updateField("itemValue", v)}
                    placeholder="Optional"
                    allowClear
                    className="mt-1"
                    inputClassName="border border-[#d1d1d1] h-9 text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="preferredPickupDate" className="text-xs font-medium text-neutral-700">Preferred Date</Label>
                  <Input
                    id="preferredPickupDate"
                    type="date"
                    value={form.preferredPickupDate}
                    onChange={(e) => updateField("preferredPickupDate", e.target.value)}
                    className="mt-1 border border-[#d1d1d1] h-9 text-sm"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="specialInstructions" className="text-xs font-medium text-neutral-700">Special Instructions</Label>
                <Textarea
                  id="specialInstructions"
                  placeholder="Any special handling or access instructions"
                  value={form.specialInstructions ?? ""}
                  onChange={(e) => updateField("specialInstructions", e.target.value)}
                  className="mt-1 border border-[#d1d1d1] text-sm min-h-[72px]"
                  rows={3}
                />
              </div>
            </div>

            {/* Costs */}
            <div className="space-y-3">
              <div className="pb-2 border-b border-gray-200">
                <h2 className="text-sm font-semibold text-neutral-800">Costs</h2>
                <p className="text-xs text-gray-500 mt-0.5">Leave blank if to be determined later</p>
              </div>
              <div>
                <Label htmlFor="deliveryCost" className="text-xs font-medium text-neutral-700">Delivery Cost (GHC)</Label>
                <CostInput
                  id="deliveryCost"
                  value={form.deliveryCost}
                  onChange={(v) => updateField("deliveryCost", v)}
                  placeholder="Optional"
                  allowClear
                  className="mt-1"
                  inputClassName="border border-[#d1d1d1] h-9 text-sm"
                />
              </div>
            </div>

          </div>

          {/* Success message */}
          {submitSuccess && (
            <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
              <p className="text-sm text-green-800">Pickup request submitted. A rider will be assigned for collection.</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={handleReset} className="border border-[#d1d1d1] h-9 text-sm">
              Reset
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-[#ea690c] text-white hover:bg-[#ea690c]/90 h-9 text-sm">
              {isSubmitting ? <><Loader className="w-4 h-4 animate-spin mr-2" />Submitting...</> : "Submit Pickup Request"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
