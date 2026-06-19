import { normalizePhoneForSearch } from "../../utils/dataHelpers";

export const DRIVER_TRACKER_PAGE_SIZE = 10000;

export interface LoadStats {
    apiMs: number;
    processMs: number;
    count: number;
    totalElements?: number;
    pagesFetched?: number;
}

export const formatLoadDuration = (ms: number) =>
    ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`;

export interface ParcelInfo {
    parcelId: string;
    receiverName?: string;
    receiverPhoneNumber?: string;
    receiverAddress?: string;
    senderName?: string;
    shelfName?: string;
    vehicleNumber?: string;
    inboundCost: number;
    deliveryCost: number;
    pickUpCost: number;
    storageCost: number;
    pickedUp: boolean;
    delivered: boolean;
    returned: boolean;
    paymentMethod?: string | null;
    inboudPayed: boolean;
}

export interface DriverAssignment {
    id: string;
    driverName: string;
    driverPhoneNumber: string;
    parcelInfo: ParcelInfo;
    payed: boolean;
    amount: number;
    delivered: boolean;
    createdAt: number;
}

export interface TripBatch {
    key: string;
    createdAt: number;
    vehicleNumber: string;
    assignments: DriverAssignment[];
    totalAmount: number;
    readyCount: number;
}

export interface DriverGroup {
    key: string;
    driverName: string;
    driverPhoneNumber: string;
    vehicleNumbers: string[];
    batches: TripBatch[];
    assignments: DriverAssignment[];
    totalAmount: number;
    readyCount: number;
}

export interface DriverTrackerDetailState {
    driver: DriverGroup;
}

export const isAssignmentReady = (a: DriverAssignment) =>
    (a.parcelInfo?.pickedUp || a.parcelInfo?.delivered || a.delivered) && !a.parcelInfo?.returned;

/** Group parcels dropped off in the same minute (bulk intake sessions share a timestamp). */
export const getBatchTimeKey = (createdAt: number) => {
    const d = new Date(createdAt);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const groupAssignmentsByDriver = (assignments: DriverAssignment[]): DriverGroup[] => {
    const map = new Map<string, DriverGroup>();
    assignments.forEach(a => {
        const phoneKey = normalizePhoneForSearch(a.driverPhoneNumber) || "unknown";
        const vehicle = a.parcelInfo?.vehicleNumber || "Unknown";
        const batchTimeKey = a.createdAt ? getBatchTimeKey(a.createdAt) : "unknown";
        const batchKey = `${phoneKey}__${batchTimeKey}__${vehicle}`;

        if (!map.has(phoneKey)) {
            map.set(phoneKey, {
                key: phoneKey,
                driverName: a.driverName,
                driverPhoneNumber: a.driverPhoneNumber,
                vehicleNumbers: [],
                batches: [],
                assignments: [],
                totalAmount: 0,
                readyCount: 0,
            });
        }
        const driver = map.get(phoneKey)!;
        driver.assignments.push(a);
        driver.totalAmount += a.amount || 0;
        if (isAssignmentReady(a)) driver.readyCount++;
        if (!driver.vehicleNumbers.includes(vehicle)) driver.vehicleNumbers.push(vehicle);

        let batch = driver.batches.find(b => b.key === batchKey);
        if (!batch) {
            batch = {
                key: batchKey,
                createdAt: a.createdAt || 0,
                vehicleNumber: vehicle,
                assignments: [],
                totalAmount: 0,
                readyCount: 0,
            };
            driver.batches.push(batch);
        }
        batch.assignments.push(a);
        batch.totalAmount += a.amount || 0;
        if (isAssignmentReady(a)) batch.readyCount++;
    });

    map.forEach(driver => {
        driver.batches.sort((a, b) => b.createdAt - a.createdAt);
    });
    return Array.from(map.values()).sort((a, b) => a.driverName.localeCompare(b.driverName));
};

export const findDriverGroup = (assignments: DriverAssignment[], phoneKey: string): DriverGroup | undefined =>
    groupAssignmentsByDriver(assignments).find(g => g.key === phoneKey);
