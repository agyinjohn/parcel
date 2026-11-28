/**
 * Station delivery price tables and delivery quotes (docs/BACKEND_TODO.md "Distance-based delivery pricing").
 * The backend measures the road distance (Google) and prices it with the station's table.
 */
import axios, { AxiosInstance } from "axios";
import authService from "./authService";
import { API_ENDPOINTS } from "../config/api";
import type { DeliveryPriceTable, PriceQuote } from "../utils/deliveryPricing";

type Result<T> = { success: true; data: T } | { success: false; message: string; status?: number };

class PricingService {
    private api: AxiosInstance;

    constructor() {
        this.api = axios.create({ baseURL: API_ENDPOINTS.FRONTDESK, headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" } });
        this.api.interceptors.request.use((config) => {
            const token = authService.getToken();
            if (token) config.headers.Authorization = `Bearer ${token}`;
            return config;
        });
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
}

export default new PricingService();
