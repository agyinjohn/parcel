export type PartnerParcelStatus = "pending" | "received" | "delivered" | "collected" | "failed" | "reversed";

export interface PartnerParcel {
  id: string;
  trackingId: string;
  senderName: string;
  receiverName: string;
  receiverPhone: string;
  receiverAltPhone?: string;
  receiverAddress: string;
  description: string;
  weight?: string;
  itemCount?: string;
  station: string;
  stationId: string;
  itemCost: number;
  deliveryFee: number;
  pod: boolean;
  status: PartnerParcelStatus;
  submittedAt: string;
  collectedAt?: string;
  notes?: string;
}

export interface VendorStation {
  id: string;
  name: string;
  location: string;
}

export interface SendParcelForm {
  senderName: string;
  receiverName: string;
  receiverPhone: string;
  receiverAltPhone: string;
  receiverAddress: string;
  description: string;
  weight: string;
  itemCount: string;
  stationId: string;
  itemCost: string;
  deliveryFee: string;
  pod: boolean;
}

export const EMPTY_FORM: SendParcelForm = {
  senderName: "",
  receiverName: "", receiverPhone: "", receiverAltPhone: "", receiverAddress: "",
  description: "", weight: "", itemCount: "",
  stationId: "", itemCost: "", deliveryFee: "", pod: false,
};

export const formatCurrency = (v: number) => `GHC ${v.toFixed(2)}`;

import { Clock, Package, Send, CheckCircle2, XCircle, RotateCcw } from "lucide-react";

export const statusConfig: Record<PartnerParcelStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending:   { label: "Pending",   color: "bg-yellow-100 text-yellow-800", icon: <Clock className="w-3 h-3" /> },
  received:  { label: "Received",  color: "bg-blue-100 text-blue-800",    icon: <Package className="w-3 h-3" /> },
  delivered: { label: "Delivered", color: "bg-purple-100 text-purple-800",icon: <Send className="w-3 h-3" /> },
  collected: { label: "Collected", color: "bg-green-100 text-green-800",  icon: <CheckCircle2 className="w-3 h-3" /> },
  failed:    { label: "Failed",    color: "bg-red-100 text-red-800",      icon: <XCircle className="w-3 h-3" /> },
  reversed:  { label: "Reversed",  color: "bg-gray-100 text-gray-700",    icon: <RotateCcw className="w-3 h-3" /> },
};
