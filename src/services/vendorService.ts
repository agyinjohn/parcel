import axios, { AxiosInstance } from 'axios';
import authService from './authService';
import { API_ENDPOINTS } from '../config/api';
import type { PartnerParcel, PartnerParcelStatus } from '../screens/PartnerPortal/partnerData';

const API_BASE_URL = API_ENDPOINTS.VENDOR;

export type ApiParcelStatus =
    | 'RECEIVED'
    | 'PENDING'
    | 'DELIVERD'
    | 'COLLECTED'
    | 'FAILED'
    | 'REVERSED';

export interface VendorParcelRequest {
    receiverName: string;
    recieverPhoneNumber: string;
    recieverAlternativePhoneNumber?: string;
    receiverAddress?: string;
    parcelDescription?: string;
    parcelWeight?: number;
    numberOfItems?: number;
    destinationStationId: string;
    deliveryFee?: number;
    itemCost?: number;
    itemQuantity?: number;
    pod?: boolean;
}

export interface ApiOfficeInfo {
    id?: string;
    name?: string;
    code?: string;
    address?: string;
}

export interface ApiParcel {
    parcelId?: string;
    parcelDescription?: string;
    deliveryCost?: number;
    vendorDeliveryFee?: number;
    itemCost?: number;
    senderName?: string;
    senderPhoneNumber?: string;
    receiverName?: string;
    receiverAddress?: string;
    recieverPhoneNumber?: string;
    alternativePhoneNumber?: string;
    officeId?: string;
    toOfficeId?: string;
    to?: ApiOfficeInfo;
    parcelStatus?: ApiParcelStatus;
    pod?: boolean;
    createdAt?: number;
    parcelWeight?: number;
    numberOfItems?: number;
}

export interface VendorParcelItem {
    parcelId: string;
    receiverName?: string;
    recieverPhoneNumber?: string;
    parcelDescription?: string;
    deliveryFee?: number;
    itemCost?: number;
    parcelStatus?: ApiParcelStatus;
    createdAt?: number;
    pod?: boolean;
}

export interface VendorStationGroup {
    officeId: string;
    officeName: string;
    parcelCount?: number;
    podCount?: number;
    totalAmount?: number;
    parcels: VendorParcelItem[];
}

export interface VendorDashboardResponse {
    statusSummary?: Record<string, number>;
    totalParcels?: number;
    totalStations?: number;
    stations?: VendorStationGroup[];
}

export interface VendorCollectedParcel {
    parcelId: string;
    receiverName?: string;
    stationName?: string;
    itemCost?: number;
    deliveryFee?: number;
    total?: number;
    createdAt?: number;
}

export interface VendorStationEarnings {
    officeId: string;
    officeName: string;
    parcelCount?: number;
    deliveredCount?: number;
    collectedAmount?: number;
    totalAmount?: number;
}

export interface VendorEarningsResponse {
    totalEarnable?: number;
    amountReady?: number;
    pendingPayout?: number;
    failedDeliveriesCount?: number;
    collectionRate?: number;
    earningsByStation?: VendorStationEarnings[];
    collectedParcels?: VendorCollectedParcel[];
}

export interface PageParcel {
    content?: ApiParcel[];
    totalElements?: number;
    totalPages?: number;
    number?: number;
    size?: number;
}

export const mapApiStatus = (status?: ApiParcelStatus): PartnerParcelStatus => {
    switch (status) {
        case 'RECEIVED': return 'received';
        case 'DELIVERD': return 'delivered';
        case 'COLLECTED': return 'collected';
        case 'FAILED': return 'failed';
        case 'REVERSED': return 'reversed';
        case 'PENDING':
        default: return 'pending';
    }
};

export const mapStatusToApi = (status: PartnerParcelStatus): ApiParcelStatus => {
    switch (status) {
        case 'received': return 'RECEIVED';
        case 'delivered': return 'DELIVERD';
        case 'collected': return 'COLLECTED';
        case 'failed': return 'FAILED';
        case 'reversed': return 'REVERSED';
        case 'pending':
        default: return 'PENDING';
    }
};

const toIsoDate = (createdAt?: number) => {
    if (!createdAt) return new Date().toISOString();
    return new Date(createdAt).toISOString();
};

export const inferParcelPod = (pod?: boolean, itemCost = 0, deliveryFee = 0): boolean =>
    Boolean(pod) || itemCost > 0 || deliveryFee > 0;

export const mapApiParcelToPartner = (parcel: ApiParcel): PartnerParcel => {
    const deliveryFee = parcel.vendorDeliveryFee ?? parcel.deliveryCost ?? 0;
    const itemCost = parcel.itemCost ?? 0;
    const stationName = parcel.to?.name || '';
    const stationId = parcel.toOfficeId || parcel.officeId || parcel.to?.id || '';

    return {
        id: parcel.parcelId || '',
        trackingId: parcel.parcelId || '',
        senderName: parcel.senderName || '',
        receiverName: parcel.receiverName || '',
        receiverPhone: parcel.recieverPhoneNumber || '',
        receiverAltPhone: parcel.alternativePhoneNumber,
        receiverAddress: parcel.receiverAddress || '',
        description: parcel.parcelDescription || '',
        weight: parcel.parcelWeight != null ? String(parcel.parcelWeight) : undefined,
        itemCount: parcel.numberOfItems != null ? String(parcel.numberOfItems) : undefined,
        station: stationName,
        stationId,
        itemCost,
        deliveryFee,
        pod: inferParcelPod(parcel.pod, itemCost, deliveryFee),
        status: mapApiStatus(parcel.parcelStatus),
        submittedAt: toIsoDate(parcel.createdAt),
        collectedAt: parcel.parcelStatus === 'COLLECTED' ? toIsoDate(parcel.createdAt) : undefined,
    };
};

export const mapVendorItemToPartner = (
    item: VendorParcelItem,
    stationName: string,
    stationId: string,
): PartnerParcel => ({
    id: item.parcelId,
    trackingId: item.parcelId,
    senderName: '',
    receiverName: item.receiverName || '',
    receiverPhone: item.recieverPhoneNumber || '',
    receiverAddress: '',
    description: item.parcelDescription || '',
    station: stationName,
    stationId,
    itemCost: item.itemCost ?? 0,
    deliveryFee: item.deliveryFee ?? 0,
    pod: inferParcelPod(item.pod, item.itemCost ?? 0, item.deliveryFee ?? 0),
    status: mapApiStatus(item.parcelStatus),
    submittedAt: toIsoDate(item.createdAt),
    collectedAt: item.parcelStatus === 'COLLECTED' ? toIsoDate(item.createdAt) : undefined,
});

class VendorService {
    private apiClient: AxiosInstance;

    constructor() {
        this.apiClient = axios.create({
            baseURL: API_BASE_URL,
            headers: { 'Content-Type': 'application/json' },
        });

        this.apiClient.interceptors.request.use(
            (config) => {
                const token = authService.getToken();
                if (token) config.headers.Authorization = `Bearer ${token}`;
                return config;
            },
            (error) => Promise.reject(error),
        );

        this.apiClient.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response?.status === 401) {
                    authService.logout();
                    window.location.href = '/login';
                }
                return Promise.reject(error);
            },
        );
    }

    async submitParcel(payload: VendorParcelRequest): Promise<{ success: boolean; message: string; data?: ApiParcel }> {
        try {
            const response = await this.apiClient.post<ApiParcel>('/parcels', payload);
            return { success: true, message: 'Parcel submitted successfully', data: response.data };
        } catch (error: any) {
            return {
                success: false,
                message: error.response?.data?.message || 'Failed to submit parcel. Please try again.',
            };
        }
    }

    async updateParcel(
        parcelId: string,
        payload: VendorParcelRequest,
    ): Promise<{ success: boolean; message: string; data?: ApiParcel }> {
        try {
            const response = await this.apiClient.put<ApiParcel>(`/parcels/${parcelId}`, payload);
            return { success: true, message: 'Parcel updated successfully', data: response.data };
        } catch (error: any) {
            return {
                success: false,
                message: error.response?.data?.message || 'Failed to update parcel. Please try again.',
            };
        }
    }

    async listParcels(params?: {
        search?: string;
        status?: ApiParcelStatus;
        toOfficeId?: string;
        page?: number;
        size?: number;
    }): Promise<{ success: boolean; message: string; data?: PageParcel }> {
        try {
            const response = await this.apiClient.get<PageParcel>('/parcels', {
                params: {
                    search: params?.search || undefined,
                    status: params?.status || undefined,
                    toOfficeId: params?.toOfficeId || undefined,
                    page: params?.page ?? 0,
                    size: params?.size ?? 500,
                },
            });
            return { success: true, message: 'Parcels retrieved successfully', data: response.data };
        } catch (error: any) {
            return {
                success: false,
                message: error.response?.data?.message || 'Failed to load parcels. Please try again.',
            };
        }
    }

    async getDashboard(params?: { search?: string; status?: ApiParcelStatus }): Promise<{
        success: boolean;
        message: string;
        data?: VendorDashboardResponse;
    }> {
        try {
            const response = await this.apiClient.get<VendorDashboardResponse>('/parcel-status-dashboard', {
                params: {
                    search: params?.search || undefined,
                    status: params?.status || undefined,
                },
            });
            return { success: true, message: 'Dashboard loaded successfully', data: response.data };
        } catch (error: any) {
            return {
                success: false,
                message: error.response?.data?.message || 'Failed to load parcel dashboard. Please try again.',
            };
        }
    }

    async getEarnings(): Promise<{ success: boolean; message: string; data?: VendorEarningsResponse }> {
        try {
            const response = await this.apiClient.get<VendorEarningsResponse>('/earnings');
            return { success: true, message: 'Earnings loaded successfully', data: response.data };
        } catch (error: any) {
            return {
                success: false,
                message: error.response?.data?.message || 'Failed to load earnings. Please try again.',
            };
        }
    }
}

export default new VendorService();
