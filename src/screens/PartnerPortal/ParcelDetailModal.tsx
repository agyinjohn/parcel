import { X, Pencil } from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { statusConfig, formatCurrency, type PartnerParcel } from "./partnerData";
import { isPartnerParcelEditable } from "./partnerFormUtils";

interface Props {
  parcel: PartnerParcel;
  onClose: () => void;
  onEdit?: (parcel: PartnerParcel) => void;
}

export const ParcelDetailModal = ({ parcel, onClose, onEdit }: Props) => {
  const s = statusConfig[parcel.status];
  const canEdit = isPartnerParcelEditable(parcel.status);
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md border border-[#d1d1d1] bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
        <CardContent className="p-0">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-white">
            <div>
              <h3 className="text-base font-bold text-neutral-800">Parcel Details</h3>
              <p className="font-mono text-sm text-[#ea690c] font-bold mt-0.5">{parcel.trackingId}</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-neutral-800 hover:bg-gray-100 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* Status */}
            <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-gray-50 border border-gray-100">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Current Status</span>
              <Badge className={`${s.color} flex items-center gap-1.5 text-xs font-bold px-3 py-1`}>
                {s.icon}{s.label}
              </Badge>
            </div>

            {/* Details grid */}
            <div className="space-y-3">
              {[
                { label: "Receiver",      value: parcel.receiverName },
                { label: "Phone",         value: parcel.receiverPhone },
                { label: "Address",       value: parcel.receiverAddress || "—" },
                { label: "Description",   value: parcel.description || "—" },
                { label: "Station",       value: parcel.station },
                { label: "Submitted",     value: new Date(parcel.submittedAt).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) },
                ...(parcel.collectedAt ? [{ label: "Collected On", value: new Date(parcel.collectedAt).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) }] : []),
                ...(parcel.notes ? [{ label: "Notes", value: parcel.notes }] : []),
              ].map(row => (
                <div key={row.label} className="flex items-start justify-between gap-4">
                  <span className="text-xs text-gray-500 font-medium flex-shrink-0 w-24">{row.label}</span>
                  <span className="text-sm font-semibold text-neutral-800 text-right">{row.value}</span>
                </div>
              ))}
            </div>

            {/* Payment breakdown */}
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Payment Breakdown</p>
              </div>
              <div className="px-4 py-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Delivery Fee</span>
                  <span className="font-semibold">{formatCurrency(parcel.deliveryFee)}</span>
                </div>
                {parcel.pod && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Item Cost (POD)</span>
                    <span className="font-semibold">{formatCurrency(parcel.itemCost)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-[#ea690c] pt-2 border-t border-gray-100">
                  <span>Total</span>
                  <span>{formatCurrency(parcel.itemCost + parcel.deliveryFee)}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              {canEdit && onEdit && (
                <Button
                  onClick={() => onEdit(parcel)}
                  variant="outline"
                  className="flex-1 border-[#ea690c] text-[#ea690c] hover:bg-orange-50 h-10 font-semibold flex items-center justify-center gap-2"
                >
                  <Pencil className="w-4 h-4" /> Edit Parcel
                </Button>
              )}
              <Button onClick={onClose} className={`${canEdit && onEdit ? "flex-1" : "w-full"} bg-[#ea690c] text-white hover:bg-[#d45e0a] h-10 font-semibold`}>
                Close
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
