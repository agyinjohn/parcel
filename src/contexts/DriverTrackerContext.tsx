import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import frontdeskService from "../services/frontdeskService";
import {
    DriverAssignment,
    DRIVER_TRACKER_PAGE_SIZE,
    groupAssignmentsByDriver,
    LoadStats,
} from "../screens/DriverInboundReconciliation/driverTrackerUtils";

const CACHE_DURATION = 5 * 60 * 1000;

interface DriverTrackerContextType {
    assignments: DriverAssignment[];
    loading: boolean;
    totalUnpaid: number;
    loadStats: LoadStats | null;
    lastFetchTime: number | null;
    loadIfNeeded: () => Promise<void>;
    refresh: () => Promise<boolean>;
    removePaidAssignments: (ids: string[]) => void;
}

const DriverTrackerContext = createContext<DriverTrackerContextType | undefined>(undefined);

export const DriverTrackerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [assignments, setAssignments] = useState<DriverAssignment[]>([]);
    const [loading, setLoading] = useState(false);
    const [totalUnpaid, setTotalUnpaid] = useState(0);
    const [loadStats, setLoadStats] = useState<LoadStats | null>(null);
    const [lastFetchTime, setLastFetchTime] = useState<number | null>(null);
    const fetchInFlight = useRef<Promise<void> | null>(null);

    const fetchAssignments = useCallback(async (showLoading: boolean): Promise<boolean> => {
        if (fetchInFlight.current) {
            await fetchInFlight.current;
            return assignments.length > 0;
        }

        const run = (async () => {
            if (showLoading) setLoading(true);
            const apiStart = performance.now();
            let ok = false;
            try {
                const response = await frontdeskService.getUnpaidDriverAssignmentsUpTo(DRIVER_TRACKER_PAGE_SIZE);
                const apiMs = performance.now() - apiStart;
                if (response.success && response.data) {
                    const data = response.data as {
                        content?: DriverAssignment[];
                        totalElements?: number;
                        pagesFetched?: number;
                    };
                    const content = Array.isArray(data.content) ? data.content : [];
                    const processStart = performance.now();
                    groupAssignmentsByDriver(content);
                    const processMs = performance.now() - processStart;
                    setAssignments(content);
                    setTotalUnpaid(data.totalElements ?? content.length);
                    setLoadStats({
                        apiMs,
                        processMs,
                        count: content.length,
                        totalElements: data.totalElements,
                        pagesFetched: data.pagesFetched,
                    });
                    setLastFetchTime(Date.now());
                    ok = true;
                }
            } finally {
                if (showLoading) setLoading(false);
                fetchInFlight.current = null;
            }
            return ok;
        })();

        fetchInFlight.current = run;
        return run;
    }, [assignments.length]);

    const loadIfNeeded = useCallback(async () => {
        const cacheValid =
            assignments.length > 0 &&
            lastFetchTime !== null &&
            Date.now() - lastFetchTime < CACHE_DURATION;

        if (cacheValid) return;
        await fetchAssignments(assignments.length === 0);
    }, [assignments.length, lastFetchTime, fetchAssignments]);

    const refresh = useCallback(async () => {
        return fetchAssignments(true);
    }, [fetchAssignments]);

    const removePaidAssignments = useCallback((ids: string[]) => {
        if (!ids.length) return;
        const idSet = new Set(ids);
        setAssignments(prev => prev.filter(a => !idSet.has(a.id)));
    }, []);

    return (
        <DriverTrackerContext.Provider
            value={{
                assignments,
                loading,
                totalUnpaid,
                loadStats,
                lastFetchTime,
                loadIfNeeded,
                refresh,
                removePaidAssignments,
            }}
        >
            {children}
        </DriverTrackerContext.Provider>
    );
};

export const useDriverTracker = (): DriverTrackerContextType => {
    const ctx = useContext(DriverTrackerContext);
    if (!ctx) throw new Error("useDriverTracker must be used within DriverTrackerProvider");
    return ctx;
};
