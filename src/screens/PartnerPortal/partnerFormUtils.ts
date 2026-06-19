import { validatePhoneNumber } from "../../utils/dataHelpers";
import { inferParcelPod, type VendorParcelRequest } from "../../services/vendorService";
import type { PartnerParcel, PartnerParcelStatus, SendParcelForm } from "./partnerData";

export const parseAmount = (value: string) => parseFloat(value || "0") || 0;

export const formHasAmount = (form: SendParcelForm) =>
    parseAmount(form.deliveryFee) > 0 || parseAmount(form.itemCost) > 0;

export const isPartnerParcelEditable = (status: PartnerParcelStatus) => status === "pending";

export const parcelToEditForm = (parcel: PartnerParcel): SendParcelForm => {
    const pod = inferParcelPod(parcel.pod, parcel.itemCost, parcel.deliveryFee);
    return {
        senderName: parcel.senderName,
        receiverName: parcel.receiverName,
        receiverPhone: parcel.receiverPhone,
        receiverAltPhone: parcel.receiverAltPhone || "",
        receiverAddress: parcel.receiverAddress,
        description: parcel.description,
        weight: parcel.weight || "",
        itemCount: parcel.itemCount || "",
        stationId: parcel.stationId,
        itemCost: parcel.itemCost > 0 ? String(parcel.itemCost) : "",
        deliveryFee: parcel.deliveryFee > 0 ? String(parcel.deliveryFee) : "",
        pod,
    };
};

export const buildVendorPayload = (form: SendParcelForm): VendorParcelRequest => {
    const deliveryFee = parseAmount(form.deliveryFee);
    const itemCost = parseAmount(form.itemCost);
    const pod = inferParcelPod(form.pod, itemCost, deliveryFee);

    return {
        receiverName: form.receiverName.trim(),
        recieverPhoneNumber: form.receiverPhone.trim(),
        recieverAlternativePhoneNumber: form.receiverAltPhone.trim() || undefined,
        receiverAddress: form.receiverAddress.trim() || undefined,
        parcelDescription: form.description.trim() || undefined,
        parcelWeight: form.weight ? parseFloat(form.weight) : undefined,
        numberOfItems: form.itemCount ? parseInt(form.itemCount, 10) : undefined,
        destinationStationId: form.stationId,
        deliveryFee: pod && deliveryFee > 0 ? deliveryFee : undefined,
        itemCost: pod && itemCost > 0 ? itemCost : undefined,
        pod,
    };
};

export const validateVendorParcelForm = (
    form: SendParcelForm,
    options?: { requireSender?: boolean },
): Partial<Record<keyof SendParcelForm, string>> => {
    const errs: Partial<Record<keyof SendParcelForm, string>> = {};

    if (options?.requireSender && !form.senderName) errs.senderName = "Required";
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

    return errs;
};

export const applyCostFieldUpdate = (
    form: SendParcelForm,
    field: "deliveryFee" | "itemCost",
    value: string,
): SendParcelForm => {
    const next = { ...form, [field]: value };
    const delivery = parseAmount(field === "deliveryFee" ? value : form.deliveryFee);
    const item = parseAmount(field === "itemCost" ? value : form.itemCost);
    next.pod = delivery > 0 || item > 0;
    return next;
};
