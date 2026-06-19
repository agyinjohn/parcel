import authService from "../../services/authService";
import { normalizeRole } from "../../contexts/StationContext";

export interface VendorSessionProfile {
    userId: string;
    name: string;
    email: string;
    phoneNumber: string;
    role: string;
}

export const getVendorSessionProfile = (): VendorSessionProfile => {
    const user = authService.getUser() || {};
    return {
        userId: user.id || user.userId || "",
        name: user.name || "",
        email: user.email || "",
        phoneNumber: user.phoneNumber || "",
        role: normalizeRole(user.role || "VENDOR"),
    };
};
