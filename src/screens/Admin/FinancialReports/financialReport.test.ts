import { describe, it, expect } from "vitest";
import { reportFilters, breakdown, toCsv } from "./financialReport";

describe("reportFilters", () => {
    it("leaves dates out until both are picked", () => {
        expect(reportFilters("2026-11-01", "", "")).toEqual({});
        expect(reportFilters("", "", "office-1")).toEqual({ officeId: "office-1" });
    });
    it("covers whole local days and swaps reversed dates", () => {
        const f = reportFilters("2026-11-10", "2026-11-01", "");
        expect(f.startDate).toBe(new Date(2026, 10, 1).getTime());
        expect(f.endDate).toBe(new Date(2026, 10, 11).getTime() - 1);
    });
});

describe("breakdown", () => {
    const revenue = {
        totalRevenue: 100, collected: 60, outstanding: 20, collectionRate: 60, avgPerParcel: 10, driverPayments: 5,
        revenueVsCollectedTrend: [
            { date: "2026-11-01", revenue: 0, collected: 0, outstanding: 0 },
            { date: "2026-11-02", revenue: 80, collected: 40, outstanding: 10 },
        ],
        paymentMethods: [{ method: "CASH", amount: 30, count: 3 }, { method: "MOMO", amount: 10, count: 1 }],
    };
    it("drops empty days", () => {
        expect(breakdown("daily", revenue, []).rows).toEqual([["2026-11-02", 80, 40, 10, 50]]);
    });
    it("labels payment methods and works out shares", () => {
        expect(breakdown("payment", revenue, []).rows).toEqual([["Cash", 3, 30, 75], ["Mobile money", 1, 10, 25]]);
    });
    it("computes rider success rate", () => {
        const r = breakdown("driver", null, [{ rank: 1, riderId: "r", riderName: "Ama", deliveries: 9, failed: 1, revenue: 90, outstanding: 0, rating: 0, avgTimeHours: 0 }]);
        expect(r.rows[0]).toEqual(["Ama", 9, 1, 90, 0, 90]);
    });
    it("writes CSV with money to 2 places and quoted cells", () => {
        expect(toCsv(breakdown("payment", revenue, [])).split("\n")[1]).toBe('"Cash","3","30.00","75%"');
    });
});
