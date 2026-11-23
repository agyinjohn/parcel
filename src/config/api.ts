/**
 * API Configuration
 * Centralized API base URL configuration
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://backend-new.mandmservicescorp.org/shortly';

export const API_ENDPOINTS = {
    USER: `${API_BASE_URL}/api-user`,
    ADMIN: `${API_BASE_URL}/api-admin`,
    PARCEL: `${API_BASE_URL}/api-parcel`,
    FRONTDESK: `${API_BASE_URL}/api-frontdesk`,
    RIDER: `${API_BASE_URL}/api-rider`,
    OFFICES: `${API_BASE_URL}/api/offices`,
    CALL_CENTER: `${API_BASE_URL}/api-call-center`,
    VENDOR: `${API_BASE_URL}/api-vendor`,
    TRACKING: `${API_BASE_URL}/api-tracking`,
    COMPANY: `${API_BASE_URL}/api-company`,
};

/**
 * Backend contract version. "2" is the updated backend (backend-test, Nov 2026): reconciliation sent
 * as { items: [...] } with numbers, users created with a single officeId, bulk rider locations and
 * server-side delivery checks. Leave unset for the current production backend (backend-new).
 */
export const API_V2 = import.meta.env.VITE_API_VERSION === "2";

export default API_BASE_URL;
