/**
 * Station delivery price tables and delivery quotes (docs/BACKEND_TODO.md "Distance-based delivery pricing").
 * The backend measures the road distance (Google) and prices it with the station's table.
 */
import axios, { AxiosInstance } from "axios";
import authService from "./authService";
import { API_ENDPOINTS } from "../config/api";
import type { DeliveryPriceTable, PriceQuote } from "../utils/deliveryPricing";
import type { PricingReview } from "../utils/pricingReview";

type Result<T> = { success: true; data: T } | { success: false; message: string; status?: number };

class PricingService {
    private api: AxiosInstance;
    private admin: AxiosInstance;

    constructor() {
        const make = (baseURL: string) => {
            const c = axios.create({ baseURL, headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" } });
            c.interceptors.request.use((config) => {
                const token = authService.getToken();
                if (token) config.headers.Authorization = `Bearer ${token}`;
                return config;
            });
            return c;
        };
        this.api = make(API_ENDPOINTS.FRONTDESK);
        this.admin = make(API_ENDPOINTS.ADMIN);
    }

    private fail(e: any, fallback: string): { success: false; message: string; status?: number } {
        return { success: false, message: e?.response?.data?.message || fallback, status: e?.response?.status };
    }

    /** GET /api-frontdesk/office/delivery-pricing: this station's table (404 when none is set). */
    async getTable(): Promise<Result<DeliveryPriceTable | null>> {
        try {
            const r = await this.api.get<DeliveryPriceTable>("/office/delivery-pricing");
            return { success: true, data: r.data ?? null };
        } catch (e: any) {
            if (e?.response?.status === 404) return { success: true, data: null };
            return this.fail(e, "Couldn't load the delivery prices.");
        }
    }

    /** PUT /api-frontdesk/office/delivery-pricing (manager). The server bumps the version. */
    async saveTable(table: DeliveryPriceTable): Promise<Result<DeliveryPriceTable>> {
        try {
            const { version: _v, updatedAt: _u, updatedByName: _n, ...body } = table;
            const r = await this.api.put<DeliveryPriceTable>("/office/delivery-pricing", body);
            return { success: true, data: r.data };
        } catch (e) {
            return this.fail(e, "Couldn't save the delivery prices.");
        }
    }

    /**
     * POST /api-frontdesk/delivery-pricing/quote: road distance from this station to the pin, and the
     * price from the station's table.
     */
    async quote(body: { latitude: number; longitude: number; weightKg?: number; fragile?: boolean }): Promise<Result<PriceQuote>> {
        try {
            const r = await this.api.post<PriceQuote>("/delivery-pricing/quote", body);
            return { success: true, data: r.data };
        } catch (e) {
            return this.fail(e, "Couldn't work out the delivery price.");
        }
    }

    /**
     * GET /api-admin/delivery-pricing/review?officeId=&from=&to= (yyyy-MM-dd): per band and zone,
     * deliveries, suggested vs charged, overrides, km driven and minutes (rider GPS), quotes shown/booked.
     */
    async review(officeId: string, from: string, to: string): Promise<Result<PricingReview>> {
        try {
            const r = await this.admin.get<PricingReview>("/delivery-pricing/review", { params: { officeId, from, to } });
            return { success: true, data: r.data };
        } catch (e) {
            return this.fail(e, "Couldn't load the pricing review.");
        }
    }

    /** PUT /api-admin/offices/{officeId}/delivery-pricing: save a station's table as a new version. */
    async adminSaveTable(officeId: string, table: DeliveryPriceTable, note?: string): Promise<Result<DeliveryPriceTable>> {
        try {
            const { version: _v, updatedAt: _u, updatedByName: _n, ...body } = table;
            const r = await this.admin.put<DeliveryPriceTable>(`/offices/${encodeURIComponent(officeId)}/delivery-pricing`, { ...body, note });
            return { success: true, data: r.data };
        } catch (e) {
            return this.fail(e, "Couldn't save the delivery prices.");
        }
    }
}

export default new PricingService();
