/**
 * Admin reports for counter cash and driver payments (handoff L4 and M8), under /api-admin.
 * Dates are business days, yyyy-MM-dd.
 */
import axios, { AxiosInstance } from "axios";
import authService from "./authService";
import { API_ENDPOINTS } from "../config/api";
import type { Result, Trip } from "./driverPaymentsService";

export interface CashupReportRow {
    officeId: string;
    officeName?: string;
    date: string;
    closed: boolean;
    collectionCount?: number;
    expectedCash?: number;
    countedCash?: number;
    difference?: number;
    expectedMomo?: number;
    adjustmentTotal?: number;
    note?: string;
    closedByName?: string;
    closedAt?: number;
}

export interface PayoutTotals {
    officeId?: string;
    officeName?: string;
    driverId?: string;
    driverName?: string;
    payouts: number;
    gross: number;
    deductions: number;
    bonuses: number;
    net: number;
    cash: number;
    momo: number;
    unconfirmed: number;
}

export interface PayoutReport {
    byStation: PayoutTotals[];
    byDriver: PayoutTotals[];
}

export interface PodOwedRow {
    id?: string;
    parcelId: string;
    officeId?: string;
    businessDate?: string;
    pickedUpAt?: number;
    receiverName?: string;
    collectedByName?: string;
    podAmount?: number;
    podPaidOut?: boolean;
    paymentMethod?: "CASH" | "MOMO";
    charges?: { key: string; label: string; amount: number }[];
}

export interface WaitingFeeRow {
    id: string;
    driverId?: string;
    driverName?: string;
    driverPhoneNumber?: string;
    officeId?: string;
    parcelId: string;
    amount: number;
    state?: string;
    readyAt?: number;
    readyReason?: string;
    tripId?: string;
}

/** POD amount on a counter collection: the explicit field, else the "pod" charge line. */
export const podAmountOf = (r: PodOwedRow) => r.podAmount ?? r.charges?.find((c) => c.key === "pod")?.amount ?? 0;

class AdminReportsService {
    private api: AxiosInstance;

    constructor() {
        this.api = axios.create({ baseURL: API_ENDPOINTS.ADMIN, headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" } });
        this.api.interceptors.request.use((config) => {
            const token = authService.getToken();
            if (token) config.headers.Authorization = `Bearer ${token}`;
            return config;
        });
        this.api.interceptors.response.use((r) => r, (error) => {
            if (error.response?.status === 401) { authService.logout(); window.location.href = "/login"; }
            return Promise.reject(error);
        });
    }

    private async get<T>(url: string, params: Record<string, unknown>, fallback: string): Promise<Result<T>> {
        try {
            const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ""));
            const r = await this.api.get<T>(url, { params: clean });
            return { success: true, data: r.data, status: r.status };
        } catch (e: any) {
            return { success: false, message: e?.response?.data?.message || fallback, status: e?.response?.status };
        }
    }

    cashups(officeId?: string, from?: string, to?: string) {
        return this.get<CashupReportRow[]>("/counter-cashups", { officeId, from, to }, "Couldn't load the cash-ups.");
    }
    payouts(officeId?: string, from?: string, to?: string) {
        return this.get<PayoutReport>("/driver-payouts/summary", { officeId, from, to }, "Couldn't load the payout report.");
    }
    podOwed(officeId?: string) {
        return this.get<PodOwedRow[]>("/pod-payouts", { officeId }, "Couldn't load POD money owed.");
    }
    longWaiting(officeId?: string, days?: number) {
        return this.get<WaitingFeeRow[]>("/driver-fee-lines/long-waiting", { officeId, days }, "Couldn't load waiting driver fees.");
    }
    missingParcels(officeId?: string, from?: string, to?: string) {
        return this.get<Trip[]>("/driver-trips/missing-parcels", { officeId, from, to }, "Couldn't load trips with missing parcels.");
    }
}

export default new AdminReportsService();
