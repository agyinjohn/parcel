import axios, { AxiosInstance } from 'axios';
import authService from './authService';
import { API_ENDPOINTS, API_V2 } from '../config/api';

const API_BASE_URL_ADMIN = API_ENDPOINTS.ADMIN;
const API_BASE_URL_USER = API_ENDPOINTS.USER;

export type AdminCreatableRole = "ADMIN" | "RIDER" | "FRONTDESK" | "MANAGER" | "CALLER" | "VENDOR";

/** Backend API role values */
export type BackendRole = "ADMIN" | "MANAGER" | "FRONTDESK" | "RIDER" | "CALLCENTER" | "VENDOR";

/**
 * Backend department values. MANAGER is assigned automatically by the
 * system when a company registers (the tenant's first ADMIN) — never
 * offered as a choice here, only PARCELHUB / DELIVERYHUB are.
 */
export type DepartmentRole = "PARCELHUB" | "DELIVERYHUB";

/** Convert app/UI role to the value expected by the backend API */
export const toBackendRole = (role: string): BackendRole => {
    const r = role.toUpperCase().trim();
    if (["CALLER", "CALLCENTER", "CALL_CENTER", "CALL-CENTER", "CALL CENTER"].includes(r)) {
        return "CALLCENTER";
    }
    return r as BackendRole;
};

/** Convert backend API role to internal app role (routes, sidebar, filters) */
export const fromBackendRole = (role: string): AdminCreatableRole | "ADMIN" | "SUPER_ADMIN" => {
    const r = role?.toUpperCase()?.trim() || "";
    if (["SUPERADMIN", "SUPER_ADMIN", "SUPER-ADMIN", "SUPER ADMIN"].includes(r)) return "SUPER_ADMIN";
    if (["CALLCENTER", "CALL_CENTER", "CALL-CENTER", "CALL CENTER", "CALLER"].includes(r)) {
        return "CALLER";
    }
    if (r === "VENDOR") return "VENDOR";
    if (r === "ADMIN") return "ADMIN";
    if (r === "MANAGER") return "MANAGER";
    if (r === "FRONTDESK") return "FRONTDESK";
    if (r === "RIDER") return "RIDER";
    return "FRONTDESK";
};

export const roleRequiresOffice = (role: string): boolean =>
    toBackendRole(role) !== "VENDOR";

interface CreateUserRequest {
    name: string;
    email: string;
    password?: string; // Optional according to API spec
    phoneNumber: string;
    role: AdminCreatableRole;
    departmentRole: DepartmentRole;
    officeId?: string;
}

/** Payload shape sent to POST /register — matches UserRegistrationRequest */
interface BackendCreateUserRequest {
    name: string;
    email: string;
    password?: string;
    phoneNumber: string;
    role: BackendRole;
    /** Current backend only; the updated backend (API_V2) dropped it. */
    departmentRole?: DepartmentRole;
    /** Current backend: a list of offices. */
    officeIds?: string[];
    /** Updated backend (API_V2): one office. */
    officeId?: string;
}

interface UserResponse {
    success: boolean;
    message: string;
    data?: any;
}

interface PageableRequest {
    page?: number;
    size?: number;
    sort?: string[];
}

interface ApiUser {
    userId: string;
    name: string;
    phoneNumber: string;
    email?: string;
    status: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "DELETED";
    /** IMEI of the GPS tracker assigned to a rider, if any. */
    deviceImei?: string;
    officeId?: string;
    office?: {
        id: string;
        name: string;
        code: string;
        address?: string;
        phoneNumber?: string | null;
        manager?: any | null;
        location?: {
            id: string;
            name: string;
            region: string;
            country: string;
            createdAt?: number;
            updatedAt?: number;
        };
        createdAt?: number;
        updatedAt?: number;
    };
    role: AdminCreatableRole | "ADMIN";
    createdAt?: number;
    updatedAt?: number;
    token?: string; // Token may be included in login/registration responses
}

interface PageUser {
    content: ApiUser[];
    totalElements: number;
    totalPages: number;
    first: boolean;
    last: boolean;
    size: number;
    number: number;
    numberOfElements: number;
    empty: boolean;
}

class UserService {
    private apiClientAdmin: AxiosInstance;
    private apiClientUser: AxiosInstance;

    constructor() {
        // Admin API Client
        this.apiClientAdmin = axios.create({
            baseURL: API_BASE_URL_ADMIN,
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true',
            },
        });

        // User API Client (for endpoints under /api-user)
        this.apiClientUser = axios.create({
            baseURL: API_BASE_URL_USER,
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true',
            },
        });

        const addAuthInterceptor = (config: any) => {
            const token = authService.getToken();
            console.log('Auth interceptor - Token exists:', !!token);
            if (token) {
                console.log('Auth interceptor - Adding token to request:', config.url);
                config.headers.Authorization = `Bearer ${token}`;
            } else {
                console.warn('Auth interceptor - No token found!');
            }
            return config;
        };
        const addErrorInterceptor = (error: any) => {
            console.error('API Error interceptor:', error.response?.status, error.response?.data);
            if (error.response?.status === 401) {
                console.error('401 Unauthorized - Logging out');
                authService.logout();
                window.location.href = '/login';
            }
            if (error.response?.status === 403) {
                console.error('403 Forbidden - User does not have permission');
                console.error('Response data:', error.response?.data);
            }
            return Promise.reject(error);
        };

        // Add request interceptor to include token for Admin API
        this.apiClientAdmin.interceptors.request.use(addAuthInterceptor, (error) => Promise.reject(error));

        // Add response interceptor to handle errors for Admin API
        this.apiClientAdmin.interceptors.response.use((response) => response, addErrorInterceptor);

        // Add same interceptors for User API Client
        this.apiClientUser.interceptors.request.use(addAuthInterceptor, (error) => Promise.reject(error));
        this.apiClientUser.interceptors.response.use((response) => response, addErrorInterceptor);
    }

    /**
     * Create a new user (using Admin API)
     */
    async createUser(userData: CreateUserRequest): Promise<UserResponse> {
        try {
            const payload: BackendCreateUserRequest = {
                name: userData.name,
                email: userData.email,
                phoneNumber: userData.phoneNumber,
                role: toBackendRole(userData.role),
                ...(API_V2 ? {} : { departmentRole: userData.departmentRole }),
            };
            if (userData.password) payload.password = userData.password;
            if (userData.officeId) {
                if (API_V2) payload.officeId = userData.officeId;
                else payload.officeIds = [userData.officeId];
            }

            const response = await this.apiClientAdmin.post<UserResponse>(
                '/register',
                payload
            );

            return {
                success: true,
                message: 'User created successfully',
                data: response.data.data || response.data,
            };
        } catch (error: any) {
            console.error('Create user error:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Failed to create user. Please try again.',
            };
        }
    }

    /**
     * Get all users with pagination (using Admin API)
     */
    async getUsers(pageable: PageableRequest = { page: 0, size: 50 }): Promise<{ success: boolean; message: string; data?: PageUser }> {
        try {
            // Check if user has ADMIN (tenant) or SUPERADMIN (platform) role.
            // Backend enum has no underscore ("SUPERADMIN"), unlike the app's
            // internal normalized "SUPER_ADMIN" — check the raw value here since
            // authService stores the role exactly as the login response sent it.
            const currentUser = authService.getUser();
            const role = currentUser?.role?.toUpperCase?.().replace('_', '') || '';

            if (!currentUser || !['ADMIN', 'SUPERADMIN'].includes(role)) {
                console.error('User is not ADMIN/SUPERADMIN. Role:', currentUser?.role);
                return {
                    success: false,
                    message: 'You must be an admin to view users',
                };
            }

            // Call endpoint without pagination parameters (backend doesn't support them)
            const url = `/users`;
            console.log('Fetching users from:', url);
            console.log('Full URL:', `${API_BASE_URL_ADMIN}${url}`);

            const response = await this.apiClientAdmin.get<any>(url);

            console.log('Users response:', response.data);

            // If response is an array, wrap it in pagination format
            const users = (Array.isArray(response.data) ? response.data : response.data?.content || []).map(
                (user: ApiUser) => ({
                    ...user,
                    role: fromBackendRole(user.role) as ApiUser["role"],
                })
            );
            
            return {
                success: true,
                message: 'Users retrieved successfully',
                data: {
                    content: users,
                    totalElements: users.length,
                    totalPages: 1,
                    number: 0,
                    size: users.length,
                    first: true,
                    last: true,
                    numberOfElements: users.length,
                    empty: users.length === 0,
                },
            };
        } catch (error: any) {
            console.error('Get users error:', error);
            console.error('Error response:', error.response);
            console.error('Error message:', error.message);
            console.error('Error status:', error.response?.status);
            
            if (error.response?.status === 403) {
                return {
                    success: false,
                    message: 'Access denied. You do not have permission to view users. Please ensure you are logged in as an admin.',
                };
            }
            
            return {
                success: false,
                message: error.response?.data?.message || 'Failed to retrieve users. Please try again.',
            };
        }
    }

    /**
     * Delete a user (using Admin API)
     */
    async deleteUser(userId: string): Promise<UserResponse> {
        try {
            const response = await this.apiClientAdmin.delete<UserResponse>(
                `/user/${userId}`
            );

            return {
                success: true,
                message: 'User deleted successfully',
                data: response.data.data || response.data,
            };
        } catch (error: any) {
            console.error('Delete user error:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Failed to delete user. Please try again.',
            };
        }
    }

    /**
     * Add existing user (by phone) to an office/station using Admin API
     * Expects payload: { officeId: string, userPhoneNumber: string }
     */
    async addUserToOffice(payload: { officeId: string; userPhoneNumber: string }): Promise<UserResponse> {
        try {
            const response = await this.apiClientUser.post<UserResponse>('/add-user-office', payload);
            return {
                success: true,
                message: response.data?.message || 'User added to office successfully',
                data: response.data?.data || response.data,
            };
        } catch (error: any) {
            console.error('Add user to office error:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Failed to add user to office. Please try again.',
            };
        }
    }
}

/**
 * Helper function to get office ID from user
 * Returns the office ID string if available, undefined otherwise
 */
export const getUserOfficeId = (user: ApiUser): string | undefined => {
    return user.office?.id;
};

export type { ApiUser, PageUser, PageableRequest, AdminCreatableRole, BackendRole };

export default new UserService();

