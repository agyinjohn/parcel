/**
 * Public API for customers (no login required).
 * Used for parcel lookup / track by phone number.
 * Does not attach Bearer token.
 */

import axios from 'axios';
import { API_ENDPOINTS } from '../config/api';

const API_BASE_USER = API_ENDPOINTS.USER;
const API_BASE_OFFICES = API_ENDPOINTS.OFFICES;

export interface CustomerParcel {
    parcelId: string;
    receiverName?: string | null;
    recieverPhoneNumber?: string | null;
    receiverAddress?: string | null;
    senderName?: string | null;
    senderPhoneNumber?: string | null;
    parcelDescription?: string | null;
    shelfName?: string | null;
    officeId?: string | null;
    officeName?: string | null;
    delivered?: boolean;
    pod?: boolean;
    parcelAssigned?: boolean;
    homeDelivery?: boolean;
    /** Amount receiver pays (e.g. for collection). May be returned by API. */
    parcelAmount?: number;
    inboundCost?: number;
    deliveryCost?: number;
    storageCost?: number;
    pickUpCost?: number;
    paymentMethod?: string | null;
    inboudPayed?: boolean | null;
    typeofParcel?: 'PARCEL' | 'ONLINE' | 'PICKUP';
    /** Parcel photo URL when available from API */
    parcelImageUrl?: string | null;
    createdAt?: number | null;
    updatedAt?: number | null;
    // More of the parcel record, as /parcel-search returns it.
    parcelStatus?: string | null;
    hasArrivedAtOffice?: boolean;
    pickedUp?: boolean;
    returnCount?: number;
    parcelTransfer?: boolean;
    riderInfo?: { riderId?: string; riderName?: string; riderPhoneNumber?: string } | null;
    receiverLatitude?: number | null;
    receiverLongitude?: number | null;
    receiverLocationName?: string | null;
    deliveryAddress?: string | null;
    numberOfItems?: number;
    itemQuantity?: number;
    parcelWeight?: number;
    fragile?: boolean;
    /** Item value collected for the sender on POD parcels. */
    itemCost?: number;
    imageUrls?: string[] | null;
    /** Station holding the parcel (proposed: public office details on the customer view). */
    office?: PublicOffice | null;
}

export interface PublicOffice {
    id?: string;
    name?: string;
    address?: string;
    phoneNumber?: string;
    latitude?: number | null;
    longitude?: number | null;
    openingHours?: string;
}

/** The API spells a few fields differently (POD, ItemCost); give the page one shape. */
export const normalizeCustomerParcel = (raw: any): CustomerParcel => ({
    ...raw,
    pod: raw.pod ?? raw.POD ?? false,
    itemCost: raw.itemCost ?? raw.ItemCost ?? 0,
    recieverPhoneNumber: raw.recieverPhoneNumber ?? raw.receiverPhoneNumber ?? null,
    officeName: raw.officeName ?? raw.office?.name ?? null,
    parcelImageUrl: raw.parcelImageUrl ?? (Array.isArray(raw.imageUrls) ? raw.imageUrls[0] : null) ?? null,
});

export interface SearchByPhoneResult {
    success: boolean;
    message?: string;
    data?: CustomerParcel[];
}

/**
 * Search parcels by receiver phone number.
 * Public endpoint: no authentication required.
 * GET /api-user/parcel-search?phoneNumber=...
 */
export async function searchParcelsByPhone(phoneNumber: string): Promise<SearchByPhoneResult> {
    try {
        const normalized = phoneNumber.trim().replace(/\s/g, '');
        if (!normalized) {
            return { success: false, message: 'Please enter a phone number.', data: [] };
        }
        // Use +233 format if local number
        let query = normalized;
        if (/^0[2-9]/.test(normalized)) {
            query = '+233' + normalized.slice(1);
        } else if (/^[2-9]\d{8}$/.test(normalized)) {
            query = '+233' + normalized;
        }

        const client = axios.create({
            baseURL: API_BASE_USER,
            headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
            timeout: 15000,
        });
        const response = await client.get<CustomerParcel[] | { content?: CustomerParcel[]; data?: CustomerParcel[] }>('/parcel-search', {
            params: { phoneNumber: query },
        });

        const raw = response.data;
        const list = Array.isArray(raw)
            ? raw
            : Array.isArray((raw as any)?.content)
                ? (raw as any).content
                : Array.isArray((raw as any)?.data)
                    ? (raw as any).data
                    : [];
        return {
            success: true,
            data: list.map(normalizeCustomerParcel),
        };
    } catch (error: any) {
        const message =
            error.response?.data?.message ||
            (error.response?.status === 401
                ? 'Unable to search. Please try again.'
                : error.message || 'Search failed. Please try again.');
        return {
            success: false,
            message,
            data: [],
        };
    }
}

/** Best-effort office name lookup for public receive flow. */
export async function fetchOfficeNameMap(): Promise<Record<string, string>> {
    try {
        const client = axios.create({
            baseURL: API_BASE_OFFICES,
            headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
            timeout: 10000,
        });
        const response = await client.get<{ offices?: { id: string; name: string }[] }[] | { id: string; name: string }[]>(
            '/locations',
        );
        const map: Record<string, string> = {};
        const raw = response.data;
        const locations = Array.isArray(raw) ? raw : [];
        locations.forEach((loc: { offices?: { id: string; name: string }[] }) => {
            (loc.offices || []).forEach(office => {
                if (office.id && office.name) map[office.id] = office.name;
            });
        });
        return map;
    } catch {
        return {};
    }
}

// ── Customer self-service (proposed backend, docs/BACKEND_TODO.md "Customer pages") ──────────

const publicClient = () =>
    axios.create({
        baseURL: API_BASE_USER,
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        timeout: 20000,
    });

type Ok<T> = { success: true; data: T } | { success: false; message: string; status?: number };
const fail = (e: any, fallback: string): { success: false; message: string; status?: number } => ({
    success: false,
    message: e?.response?.data?.message || fallback,
    status: e?.response?.status,
});

export interface CustomerLink {
    phoneNumber: string;
    receiverName?: string;
    parcels: CustomerParcel[];
}

/**
 * The link in the "your parcel has arrived" SMS: /receive?t=<token>. The token proves the
 * customer got the SMS on the registered phone, so no OTP is needed.
 * GET /api-user/customer-links/{token}
 */
export async function openCustomerLink(token: string): Promise<Ok<CustomerLink>> {
    try {
        const r = await publicClient().get<CustomerLink>(`/customer-links/${encodeURIComponent(token)}`);
        return { success: true, data: { ...r.data, parcels: (r.data?.parcels ?? []).map(normalizeCustomerParcel) } };
    } catch (e) {
        return fail(e, 'This link has expired or is not valid. Search with your phone number instead.');
    }
}

export interface DeliveryQuote {
    deliveryFee: number;
    /** What's still owed on the parcels themselves (inbound, storage, POD item value). */
    parcelCharges: number;
    total: number;
    /** Server reference to send back with the request, so the price can't be changed. */
    quoteId?: string;
}

/** POST /api-user/delivery-requests/quote: the real delivery price for these parcels and this place. */
export async function getDeliveryQuote(body: { token?: string; phoneNumber: string; parcelIds: string[]; latitude: number; longitude: number }): Promise<Ok<DeliveryQuote>> {
    try {
        const r = await publicClient().post<DeliveryQuote>('/delivery-requests/quote', body);
        return { success: true, data: r.data };
    } catch (e) {
        return fail(e, "Couldn't get the delivery price.");
    }
}

export interface DeliveryRequestBody {
    token?: string;
    phoneNumber: string;
    parcelIds: string[];
    latitude: number;
    longitude: number;
    address?: string;
    locationName?: string;
    notes?: string;
    scheduledDate?: string;
    scheduledTime?: string;
    quoteId?: string;
    amountPaid: number;
    paystackReference: string;
}

export interface DeliveryRequestResult {
    requestId: string;
    status: string;
    message?: string;
}

/**
 * POST /api-user/delivery-requests: record the paid delivery so the station sees it and
 * assigns a rider. The backend verifies the Paystack reference before accepting it.
 */
export async function submitDeliveryRequest(body: DeliveryRequestBody): Promise<Ok<DeliveryRequestResult>> {
    try {
        const r = await publicClient().post<DeliveryRequestResult>('/delivery-requests', body);
        return { success: true, data: r.data };
    } catch (e) {
        return fail(e, "Your payment went through, but we couldn't record the delivery request.");
    }
}

/**
 * One-time code to prove the customer holds the phone, needed before booking a delivery
 * without the SMS link. Returns the same kind of token as the link.
 * POST /api-user/customer-otp/send {phoneNumber} · POST /api-user/customer-otp/verify {phoneNumber, code} → {token}
 */
export async function sendCustomerOtp(phoneNumber: string): Promise<Ok<{ message?: string }>> {
    try {
        const r = await publicClient().post('/customer-otp/send', { phoneNumber });
        return { success: true, data: r.data ?? {} };
    } catch (e) {
        return fail(e, "Couldn't send the code. Please try again.");
    }
}

export async function verifyCustomerOtp(phoneNumber: string, code: string): Promise<Ok<{ token: string }>> {
    try {
        const r = await publicClient().post<{ token: string }>('/customer-otp/verify', { phoneNumber, code });
        return { success: true, data: r.data };
    } catch (e) {
        return fail(e, 'That code is wrong or has expired.');
    }
}

/** Phone in the +233XXXXXXXXX form the API uses. */
export const toApiPhone = (phone: string) => {
    const n = phone.trim().replace(/[\s-]/g, '');
    if (/^0[2-9]/.test(n)) return '+233' + n.slice(1);
    if (/^[2-9]\d{8}$/.test(n)) return '+233' + n;
    if (/^233\d{9}$/.test(n)) return '+' + n;
    return n;
};
