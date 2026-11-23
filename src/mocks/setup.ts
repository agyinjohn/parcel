/**
 * Opt-in mock API. Run `npm run dev:mock` (or set VITE_USE_MOCK_API=true) to
 * serve sample parcels, riders and assignments without a backend.
 *
 * This must be imported before anything that calls axios.create(), because
 * each instance copies the default adapter when it is created. When the flag
 * is off, Vite drops this branch and the mock data is never bundled.
 */
import axios from "axios";

if (import.meta.env.VITE_USE_MOCK_API === "true") {
    axios.defaults.adapter = async (config) => {
        const { mockAdapter } = await import("./mockAdapter");
        return mockAdapter(config);
    };
    console.info("[mock api] enabled: requests are answered with sample data");
}
