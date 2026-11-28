import axios, { AxiosInstance } from 'axios';
import { API_ENDPOINTS } from '../config/api';

const API_BASE_URL_COMPANY = API_ENDPOINTS.COMPANY;

interface CompanyRegistrationRequest {
    companyName: string;
    registerUserName: string;
    workEmail: string;
    phoneNumber: string;
    password: string;
    /** starter | growth | enterprise */
    plan?: string;
}

interface CompanyRegistrationResponse {
    companyId?: string;
    companyName?: string;
    displayName?: string;
    email?: string;
    enabled?: boolean;
    message?: string;
}

interface EmailVerificationResponse {
    companyId?: string;
    companyName?: string;
    displayName?: string;
    enabled?: boolean;
    adminUserId?: string;
    adminName?: string;
    adminEmail?: string;
    adminPhoneNumber?: string;
    adminRole?: string;
    message?: string;
}

interface ServiceResult<T> {
    success: boolean;
    message: string;
    data?: T;
    /** Per-field messages from a 400 (keys are request field names). */
    fieldErrors?: Record<string, string>;
    status?: number;
}

class CompanyService {
    private apiClient: AxiosInstance;

    constructor() {
        this.apiClient = axios.create({
            baseURL: API_BASE_URL_COMPANY,
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true',
            },
        });
    }

    /**
     * Register a new company. Creates the company disabled and emails a
     * verification link; the ADMIN user is created only after verification.
     */
    async registerCompany(payload: CompanyRegistrationRequest): Promise<ServiceResult<CompanyRegistrationResponse>> {
        try {
            const response = await this.apiClient.post<CompanyRegistrationResponse>('/register', payload);
            return {
                success: true,
                message: response.data?.message || 'Company registered. Check your email to verify your account.',
                data: response.data,
            };
        } catch (error: any) {
            console.error('Company registration error:', error);
            const data = error.response?.data?.data;
            return {
                success: false,
                status: error.response?.status,
                message: error.response?.data?.message || 'Failed to register company. Please try again.',
                fieldErrors: data && typeof data === 'object' ? data : undefined,
            };
        }
    }

    /**
     * Verify a company's email using the token from the verification link.
     * Enables the company and creates the ADMIN user.
     */
    async verifyEmail(token: string): Promise<ServiceResult<EmailVerificationResponse>> {
        try {
            const response = await this.apiClient.post<EmailVerificationResponse>('/verify-email', { token });
            return {
                success: true,
                message: response.data?.message || 'Email verified successfully.',
                data: response.data,
            };
        } catch (error: any) {
            console.error('Email verification error:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Invalid or expired verification link.',
            };
        }
    }

    /**
     * Resend the verification email for a company that hasn't verified yet.
     * Invalidates the previous verification link.
     */
    async resendVerification(email: string): Promise<ServiceResult<CompanyRegistrationResponse>> {
        try {
            const response = await this.apiClient.post<CompanyRegistrationResponse>('/resend-verification', { email });
            return {
                success: true,
                message: response.data?.message || 'Verification email resent.',
                data: response.data,
            };
        } catch (error: any) {
            console.error('Resend verification error:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Failed to resend verification email.',
            };
        }
    }
}

export default new CompanyService();
