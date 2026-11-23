import axios, { AxiosInstance } from "axios";
import { API_ENDPOINTS } from "../config/api";
import authService from "./authService";

const API_BASE_URL_ADMIN = API_ENDPOINTS.ADMIN;

/** Assignment-based response (same structure as Manager Reconciliation) */
export interface AdminReconciliationAssignment {
  assignmentId?: string;
  acceptedAt?: number;
  amount?: number;
  amountPayed?: number;
  assignedAt?: number;
  completedAt?: number;
  confirmationCode?: string;
  createdAt?: number;
  deliveryCost?: number;
  inboundCost?: number;
  officeId?: string;
  parcels?: AdminReconciliationParcel[];
  payed?: boolean;
  payedAt?: number;
  payedTo?: string;
  payementMethod?: string | null;
  returnReason?: string | null;
  riderInfo?: {
    riderId: string;
    riderName: string;
    riderPhoneNumber?: string;
  };
  riderId?: string;
  riderName?: string;
  riderPhoneNumber?: string;
  status?: string;
  updatedAt?: number;
}

export interface AdminReconciliationParcel {
  parcelId: string;
  parcelDescription?: string;
  receiverName?: string;
  receiverPhoneNumber?: string;
  receiverAddress?: string;
  parcelAmount: number;
  delivered?: boolean;
  payed?: boolean;
  returned?: boolean;
  paymentMethod?: string | null;
  inboundCost?: number;
  deliveryCost?: number;
}

export interface AdminReconciliationPage {
  content: AdminReconciliationAssignment[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

/** GET /api-admin/dashboard (DashboardStatsResponse in the backend spec). */
export interface DashboardStats {
  totalRevenue: number;
  totalParcels: number;
  successRate: number;
  activeRiders: number;
  collected: number;
  outstanding: number;
  driverPaymentsOwed: number;
  revenueVsCollected: { date: string; revenue: number; collected: number; outstanding: number }[];
  deliveredVsFailed: { date: string; delivered: number; failed: number }[];
  parcelPipeline: {
    registered: number;
    contacted: number;
    readyForDelivery: number;
    assigned: number;
    outForDelivery: number;
    delivered: number;
    failed: number;
  };
  stationSnapshot: { officeId: string; stationName: string; parcels: number; revenue: number; successRate: number }[];
  topRiders: { riderId: string; riderName: string; deliveries: number; revenue: number }[];
}

/** GET /api-admin/revenue-dashboard (RevenueDashboardResponse in the backend spec). */
export interface RevenueDashboard {
  totalRevenue: number;
  collected: number;
  outstanding: number;
  collectionRate: number;
  avgPerParcel: number;
  driverPayments: number;
  revenueVsCollectedTrend?: Array<{ date: string; revenue: number; collected: number; outstanding: number }>;
  revenueByStation?: Array<{ officeId: string; stationName: string; parcels: number; revenue: number; collected: number; outstanding: number; collectionRate: number }>;
  paymentMethodTrend?: Array<{ date: string; cash: number; momo: number; other: number }>;
  revenueByType?: { pod: number; nonPod: number };
  paymentMethods?: Array<{ method: string; amount: number; count: number }>;
  revenueByDayOfWeek?: Array<{ day: string; revenue: number }>;
}

/** One row of riderLeaderboard in GET /api-admin/rider-performance-dashboard. */
export interface RiderLeaderboardEntry {
  rank: number;
  riderId: string;
  riderName: string;
  deliveries: number;
  failed: number;
  revenue: number;
  outstanding: number;
  rating: number;
  avgTimeHours: number;
}

export interface RiderPerformanceDashboard {
  earningsTrend?: Array<{ date: string; revenue: number; collected: number }>;
  monthlyEarnings?: Array<{ month: string; parcels: number; revenue: number; collected: number }>;
  riderLeaderboard?: RiderLeaderboardEntry[];
}

/** GET /api-admin/riders/delivery-check (DeliveryCheckResponse, updated backend). */
export interface ServerDeliveryCheck {
  riderId?: string;
  riderName?: string;
  summary?: Record<string, number>;
  deliveries?: Array<{
    assignmentId?: string;
    parcelId: string;
    receiverName?: string;
    receiverLocationName?: string;
    receiverLatitude?: number;
    receiverLongitude?: number;
    status?: string;
    completedAt?: number;
    result?: "REACHED" | "NOT_REACHED" | "NOT_FINISHED" | "NO_PIN" | "NO_GPS";
    arrivedAt?: number;
    leftAt?: number;
    minutesThere?: number;
    closestDistanceM?: number;
    closestAt?: number;
    markedDistanceFromDropoffM?: number;
    markedAway?: boolean;
  }>;
  offTask?: {
    judged?: boolean;
    reason?: string;
    directKm?: number;
    distanceKm?: number;
    offRouteMinutes?: number;
    offRouteKm?: number;
    detours?: Array<{ start: number; end: number; fromLabel?: string; toLabel?: string; maxOffRouteM?: number; kmRidden?: number }>;
    offTaskStops?: Array<{ start: number; end: number; lat: number; lng: number; minutes?: number }>;
    offTaskStopMinutes?: number;
  };
}

/** GET /api-admin/riders/location (RiderLocationResponse in the backend spec). */
export interface RiderLocation {
  riderId: string;
  riderName: string;
  riderPhoneNumber: string;
  deviceImei?: string;
  lat?: number;
  lng?: number;
  speed?: number;
  deviceStatus?: string;
  accStatus?: string;
  /** Time of the GPS fix; the tracking API uses UTC "yyyy-MM-dd HH:mm:ss". */
  gpsTime?: string;
  /** False when the device has no valid position. */
  located?: boolean;
}

/** GET /api-admin/riders/track (RiderTrackResponse in the backend spec). */
export interface RiderTrack {
  riderId: string;
  riderName: string;
  deviceImei?: string;
  trackPoints?: Array<{
    lat: number;
    lng: number;
    speed?: number;
    /** UTC "yyyy-MM-dd HH:mm:ss" */
    gpsTime: string;
    direction?: number;
    altitude?: number;
    posType?: number;
  }>;
}

/** Optional filters shared by the admin dashboards. Dates are epoch milliseconds; the API defaults to the last 30 days. */
export interface DashboardFilters {
  officeId?: string;
  startDate?: number;
  endDate?: number;
}

const dashboardParams = (f: DashboardFilters) => {
  const params = new URLSearchParams();
  if (f.officeId) params.append("officeId", f.officeId);
  if (f.startDate !== undefined) params.append("startDate", String(f.startDate));
  if (f.endDate !== undefined) params.append("endDate", String(f.endDate));
  const q = params.toString();
  return q ? `?${q}` : "";
};

interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

class AdminService {
  private apiClient: AxiosInstance;

  constructor() {
    this.apiClient = axios.create({
      baseURL: API_BASE_URL_ADMIN,
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
      },
    });

    // Attach auth token
    this.apiClient.interceptors.request.use(
      (config) => {
        const token = authService.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Basic 401 handling
    this.apiClient.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          authService.logout();
          window.location.href = "/login";
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get reconciliations for an office by date (millis)
   * Matches admin route:
   *   GET /api-admin/reconciliations/by-date?officeId=...&date=...
   */
  async getUserActions(page: number = 0, size: number = 20): Promise<ApiResponse> {
    try {
      const response = await this.apiClient.get(
        `/user-actions?page=${page}&size=${size}`
      );
      return { success: true, message: "User actions retrieved", data: response.data };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || "Failed to fetch user actions.",
      };
    }
  }

  async searchParcels(filters: {
    officeId?: string;
    isDelivered?: boolean;
    isParcelAssigned?: boolean;
    isPOD?: boolean;
    hasCalled?: boolean;
    page?: number;
    size?: number;
  }): Promise<ApiResponse> {
    try {
      const params = new URLSearchParams();
      params.append('page', String(filters.page ?? 0));
      params.append('size', String(filters.size ?? 20));
      if (filters.officeId) params.append('officeId', filters.officeId);
      if (filters.isDelivered !== undefined) params.append('isDelivered', String(filters.isDelivered));
      if (filters.isParcelAssigned !== undefined) params.append('isParcelAssigned', String(filters.isParcelAssigned));
      if (filters.isPOD !== undefined) params.append('isPOD', String(filters.isPOD));
      if (filters.hasCalled !== undefined) params.append('hasCalled', String(filters.hasCalled));
      const response = await this.apiClient.get(`/parcels?${params.toString()}`);
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, message: error.response?.data?.message || 'Failed to search parcels.' };
    }
  }

  async getOfficeReconciliationsByDate(
    officeId: string,
    dateInMillis: number
  ): Promise<ApiResponse<AdminReconciliationPage>> {
    try {
      const response = await this.apiClient.get(
        `/reconciliations/by-date?officeId=${officeId}&date=${dateInMillis}`
      );

      return {
        success: true,
        message: "Reconciliations retrieved successfully",
        data: response.data,
      };
    } catch (error: any) {
      console.error("Failed to fetch admin reconciliations by date:", error);
      return {
        success: false,
        message:
          error.response?.data?.message ||
          "Failed to fetch reconciliations. Please try again.",
      };
    }
  }

  async getDashboardStats(filters: DashboardFilters = {}): Promise<ApiResponse<DashboardStats>> {
    try {
      const response = await this.apiClient.get<DashboardStats>(`/dashboard${dashboardParams(filters)}`);
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, message: error.response?.data?.message || "Failed to load dashboard figures." };
    }
  }

  async getRevenueDashboard(filters: DashboardFilters = {}): Promise<ApiResponse<RevenueDashboard>> {
    try {
      const response = await this.apiClient.get<RevenueDashboard>(`/revenue-dashboard${dashboardParams(filters)}`);
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, message: error.response?.data?.message || "Failed to load revenue figures." };
    }
  }

  async getRiderPerformanceDashboard(filters: DashboardFilters = {}): Promise<ApiResponse<RiderPerformanceDashboard>> {
    try {
      const response = await this.apiClient.get<RiderPerformanceDashboard>(`/rider-performance-dashboard${dashboardParams(filters)}`);
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, message: error.response?.data?.message || "Failed to load rider performance." };
    }
  }

  /** Every rider's position in one call (updated backend, API_V2). Managers get their office. */
  async getRiderLocations(officeId?: string): Promise<ApiResponse<RiderLocation[]> & { status?: number }> {
    try {
      const q = officeId ? `?officeId=${encodeURIComponent(officeId)}` : "";
      const response = await this.apiClient.get<RiderLocation[]>(`/riders/locations${q}`);
      return { success: true, status: response.status, data: Array.isArray(response.data) ? response.data : [] };
    } catch (error: any) {
      return { success: false, status: error.response?.status, message: error.response?.data?.message || "Failed to load rider locations." };
    }
  }

  /** Server-side delivery and off-task check for one rider (updated backend, API_V2). Times as for the track. */
  async getDeliveryCheck(phoneNumber: string, beginTime: string, endTime: string): Promise<ApiResponse<ServerDeliveryCheck> & { status?: number }> {
    try {
      const params = new URLSearchParams({ phoneNumber, beginTime, endTime });
      const response = await this.apiClient.get<ServerDeliveryCheck>(`/riders/delivery-check?${params.toString()}`);
      return { success: true, status: response.status, data: response.data };
    } catch (error: any) {
      return { success: false, status: error.response?.status, message: error.response?.data?.message || "Failed to run the delivery check." };
    }
  }

  /**
   * Current GPS position of one rider. `status` carries the HTTP code so callers can tell
   * "no GPS device" (422) and "rider not found" (404) apart from tracking errors (502).
   */
  async getRiderLocation(phoneNumber: string): Promise<ApiResponse<RiderLocation> & { status?: number }> {
    try {
      const response = await this.apiClient.get<RiderLocation>(`/riders/location?phoneNumber=${encodeURIComponent(phoneNumber)}`);
      return { success: true, status: response.status, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        status: error.response?.status,
        message: error.response?.data?.message || "Failed to load rider location.",
      };
    }
  }

  /**
   * Assign or replace the GPS tracker for a rider (PUT /api-admin/riders/device).
   * The API answers 400 "User is not a rider" and 404 "Rider not found" as plain strings.
   */
  async assignRiderDevice(phoneNumber: string, deviceImei: string): Promise<ApiResponse<string>> {
    try {
      const response = await this.apiClient.put<string>("/riders/device", { phoneNumber, deviceImei });
      return { success: true, message: typeof response.data === "string" ? response.data : "Device assigned successfully" };
    } catch (error: any) {
      const body = error.response?.data;
      const fallback =
        error.response?.status === 404 ? "Rider not found" :
        error.response?.status === 400 ? "User is not a rider" :
        "Failed to assign the GPS device.";
      return { success: false, message: typeof body === "string" && body ? body : body?.message || fallback };
    }
  }

  /**
   * GPS points for one rider between two times. Times are UTC "yyyy-MM-dd HH:mm:ss";
   * the API allows at most 2 days per request, within the last 3 months.
   */
  async getRiderTrack(phoneNumber: string, beginTime: string, endTime: string): Promise<ApiResponse<RiderTrack> & { status?: number }> {
    try {
      const params = new URLSearchParams({ phoneNumber, beginTime, endTime });
      const response = await this.apiClient.get<RiderTrack>(`/riders/track?${params.toString()}`);
      return { success: true, status: response.status, data: response.data };
    } catch (error: any) {
      const body = error.response?.data;
      return {
        success: false,
        status: error.response?.status,
        message: (typeof body === "string" && body) || body?.message || "Failed to load the rider's route.",
      };
    }
  }
}

export default new AdminService();
