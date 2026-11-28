/**
 * Driver payments (handoff Part M): drivers, trips, fee lines, balances, statements, payouts,
 * holds and adjustments. Endpoints under /api-frontdesk.
 */
import axios, { AxiosInstance } from "axios";
import authService from "./authService";
import { API_ENDPOINTS } from "../config/api";

export type FeeState = "WAITING" | "READY" | "PAID" | "ON_HOLD" | "NOT_PAYABLE";
export type PayMethod = "CASH" | "MOMO";
export type AdjustmentType = "ADVANCE" | "DEDUCTION" | "BONUS" | "ADVANCE_REPAID";
export type MomoNetwork = "MTN" | "TELECEL" | "AIRTELTIGO";

export interface Driver {
    id: string;
    officeIds?: string[];
    name: string;
    phoneNumbers?: string[];
    momoNumber?: string;
    momoNetwork?: MomoNetwork;
    vehicles?: string[];
    company?: string;
    status?: "ACTIVE" | "BLOCKED";
    createdAt?: number;
}

export interface DriverInput {
    name: string;
    phoneNumbers: string[];
    momoNumber?: string;
    momoNetwork?: MomoNetwork;
    vehicles: string[];
    company?: string;
    status?: "ACTIVE" | "BLOCKED";
}

export interface PaymentsSummary {
    readyAmount: number;
    readyDrivers: number;
    waitingAmount: number;
    waitingParcels: number;
    paidThisWeekAmount: number;
    paidThisWeekCount: number;
    paidThisWeekMomoPercent: number;
    onHoldAmount: number;
    onHoldCount: number;
}

export interface BalanceRow {
    driverId: string;
    name: string;
    phone?: string;
    vehicles?: string[];
    company?: string;
    readyAmount: number;
    readyCount: number;
    waitingAmount: number;
    onHoldAmount: number;
    paidLast30Days: number;
    lastTripAt?: number;
}

export interface Balances {
    readyAmount: number;
    readyCount: number;
    waitingAmount: number;
    waitingCount: number;
    onHoldAmount: number;
    onHoldCount: number;
    paidLast30Days: number;
}

export interface FeeLine {
    id: string;
    parcelId: string;
    receiverName?: string;
    amount: number;
    state: FeeState;
    readyAt?: number;
    readyReason?: string;
    holdReason?: string;
    shelfName?: string;
    payoutId?: string;
}

export interface Trip {
    tripId: string;
    vehicleNumber?: string;
    origin?: string;
    arrivedAt?: number;
    receivedByName?: string;
    declaredCount?: number;
    receivedCount?: number;
    flagged?: boolean;
    note?: string;
    driverId?: string;
    driverName?: string;
    feeTotal?: number;
    readyAmount?: number;
    fullyPaid?: boolean;
    lines?: FeeLine[];
}

export interface PayoutAdjustment {
    type: AdjustmentType;
    amount: number;
    reason: string;
    parcelId?: string;
    adjustmentId?: string;
}

export interface DriverPayout {
    id: string;
    receiptNo?: string;
    officeId?: string;
    driverId: string;
    driverName?: string;
    driverPhone?: string;
    lineIds?: string[];
    tripCount?: number;
    adjustments?: PayoutAdjustment[];
    grossAmount: number;
    deductions?: number;
    bonuses?: number;
    netAmount: number;
    paymentMethod: PayMethod;
    momoNumber?: string;
    momoReference?: string;
    note?: string;
    businessDate?: string;
    paidByName?: string;
    paidAt?: number;
    confirmed?: boolean;
    confirmedAt?: number;
    reversed?: boolean;
    reversedReason?: string;
    reversedAt?: number;
    reversedByName?: string;
    legacy?: boolean;
    balanceReadyAfter?: number;
    balanceWaitingAfter?: number;
}

export interface DriverAdjustment {
    id: string;
    driverId: string;
    type: AdjustmentType;
    amount: number;
    reason?: string;
    parcelId?: string;
    paymentMethod?: PayMethod;
    businessDate?: string;
    open?: boolean;
    repaidAmount?: number;
    createdAt?: number;
    createdByName?: string;
}

export interface Statement {
    driver: Driver;
    balances: Balances;
    trips: Trip[];
    payouts: DriverPayout[];
    openAdjustments: DriverAdjustment[];
}

export interface PayoutRequest {
    driverId: string;
    lineIds: string[];
    adjustments: PayoutAdjustment[];
    paymentMethod: PayMethod;
    momoNumber?: string;
    momoReference?: string;
    note?: string;
}

export interface Page<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    number: number;
    size: number;
}

export interface Result<T> {
    success: boolean;
    data?: T;
    message?: string;
    status?: number;
}

const errorMessage = (e: any, fallback: string) => e?.response?.data?.message || e?.response?.data?.error || fallback;

class DriverPaymentsService {
    private api: AxiosInstance;

    constructor() {
        const make = (baseURL: string) => {
            const c = axios.create({ baseURL, headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" } });
            c.interceptors.request.use((config) => {
                const token = authService.getToken();
                if (token) config.headers.Authorization = `Bearer ${token}`;
                return config;
            });
            c.interceptors.response.use(
                (r) => r,
                (error) => {
                    if (error.response?.status === 401) {
                        authService.logout();
                        window.location.href = "/login";
                    }
                    return Promise.reject(error);
                }
            );
            return c;
        };
        this.api = make(API_ENDPOINTS.FRONTDESK);
    }

    private async call<T>(fn: () => Promise<{ data: T; status: number }>, fallback: string): Promise<Result<T>> {
        try {
            const r = await fn();
            return { success: true, data: r.data, status: r.status };
        } catch (e: any) {
            return { success: false, message: errorMessage(e, fallback), status: e?.response?.status };
        }
    }

    // ── Overview ────────────────────────────────────────────────
    summary() {
        return this.call<PaymentsSummary>(() => this.api.get("/driver-payments/summary"), "Couldn't load the driver payment totals.");
    }
    balances(params: { search?: string; state?: "READY" | "ALL" | "ON_HOLD"; page?: number; size?: number } = {}) {
        return this.call<Page<BalanceRow>>(() => this.api.get("/driver-balances", { params: { size: 50, ...params } }), "Couldn't load driver balances.");
    }
    statement(driverId: string, from?: number, to?: number) {
        return this.call<Statement>(() => this.api.get(`/drivers/${encodeURIComponent(driverId)}/statement`, { params: { from, to } }), "Couldn't load the driver's statement.");
    }

    // ── Drivers ─────────────────────────────────────────────────
    drivers(search = "", page = 0, size = 50) {
        return this.call<Page<Driver>>(() => this.api.get("/drivers", { params: { search: search || undefined, page, size } }), "Couldn't load drivers.");
    }
    createDriver(body: DriverInput) {
        return this.call<Driver>(() => this.api.post("/drivers", body), "Couldn't save the driver.");
    }
    updateDriver(id: string, body: DriverInput) {
        return this.call<Driver>(() => this.api.put(`/drivers/${encodeURIComponent(id)}`, body), "Couldn't save the driver.");
    }

    // ── Trips ───────────────────────────────────────────────────
    trips(params: { driverId?: string; from?: number; to?: number } = {}) {
        return this.call<Trip[]>(() => this.api.get("/driver-trips", { params }), "Couldn't load trips.");
    }

    // ── Fee lines ───────────────────────────────────────────────
    hold(lineId: string, reason: string) {
        return this.call<unknown>(() => this.api.put(`/driver-fee-lines/${encodeURIComponent(lineId)}/hold`, { reason }), "Couldn't put the fee on hold.");
    }
    release(lineId: string) {
        return this.call<unknown>(() => this.api.put(`/driver-fee-lines/${encodeURIComponent(lineId)}/release`), "Couldn't release the fee.");
    }

    // ── Adjustments ─────────────────────────────────────────────
    adjustments(driverId: string, open = true) {
        return this.call<DriverAdjustment[]>(() => this.api.get(`/drivers/${encodeURIComponent(driverId)}/adjustments`, { params: { open } }), "Couldn't load adjustments.");
    }
    addAdjustment(driverId: string, body: { type: AdjustmentType; amount: number; reason: string; parcelId?: string; paymentMethod?: PayMethod }) {
        return this.call<DriverAdjustment>(() => this.api.post(`/drivers/${encodeURIComponent(driverId)}/adjustments`, body), "Couldn't record the adjustment.");
    }

    // ── Payouts ─────────────────────────────────────────────────
    payouts(params: { driverId?: string; from?: number; to?: number; unconfirmed?: boolean } = {}) {
        return this.call<DriverPayout[]>(() => this.api.get("/driver-payouts", { params }), "Couldn't load payouts.");
    }
    payout(id: string) {
        return this.call<DriverPayout>(() => this.api.get(`/driver-payouts/${encodeURIComponent(id)}`), "Couldn't load the payout.");
    }
    pay(body: PayoutRequest) {
        return this.call<DriverPayout>(() => this.api.post("/driver-payouts", body), "Couldn't record the payout.");
    }
    sendCode(id: string) {
        return this.call<unknown>(() => this.api.post(`/driver-payouts/${encodeURIComponent(id)}/send-code`), "Couldn't send the code.");
    }
    confirm(id: string, code: string) {
        return this.call<unknown>(() => this.api.put(`/driver-payouts/${encodeURIComponent(id)}/confirm`, { code }), "That code didn't match.");
    }
    reverse(id: string, reason: string) {
        return this.call<unknown>(() => this.api.post(`/driver-payouts/${encodeURIComponent(id)}/reverse`, { reason }), "Couldn't reverse the payout.");
    }
}

export default new DriverPaymentsService();
