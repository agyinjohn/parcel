import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import locationService from "../services/locationService";

interface Station {
    id: string;
    name: string;
    code: string;
    address: string;
    locationName: string;
    managerName: string;
    createdAt: number;
}

interface Location {
    id: string;
    name: string;
    region: string;
    country: string;
    offices: Station[];
}

interface LocationContextType {
    locations: Location[];
    stations: Station[];
    loading: boolean;
    lastFetchTime: number | null;
    refreshLocations: () => Promise<void>;
    invalidateCache: () => void;
    error: boolean;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

// Cache duration: 5 minutes (300000 ms)
const CACHE_DURATION = 5 * 60 * 1000;
const STORAGE_KEY_LOCATIONS = 'cached_locations';
const STORAGE_KEY_STATIONS = 'cached_stations';
const STORAGE_KEY_TIMESTAMP = 'cached_locations_timestamp';

// Helper to load from localStorage
const loadFromStorage = () => {
    try {
        const locationsStr = localStorage.getItem(STORAGE_KEY_LOCATIONS);
        const stationsStr = localStorage.getItem(STORAGE_KEY_STATIONS);
        const timestampStr = localStorage.getItem(STORAGE_KEY_TIMESTAMP);
        
        if (locationsStr && stationsStr && timestampStr) {
            const timestamp = parseInt(timestampStr, 10);
            const now = Date.now();
            
            // Check if cache is still valid
            if (now - timestamp < CACHE_DURATION) {
                return {
                    locations: JSON.parse(locationsStr),
                    stations: JSON.parse(stationsStr),
                    timestamp,
                };
            }
        }
    } catch (error) {
        console.error('Failed to load cached locations:', error);
    }
    return null;
};

// Helper to save to localStorage
const saveToStorage = (locations: Location[], stations: Station[], timestamp: number) => {
    try {
        localStorage.setItem(STORAGE_KEY_LOCATIONS, JSON.stringify(locations));
        localStorage.setItem(STORAGE_KEY_STATIONS, JSON.stringify(stations));
        localStorage.setItem(STORAGE_KEY_TIMESTAMP, timestamp.toString());
    } catch (error) {
        console.error('Failed to cache locations:', error);
    }
};

// Helper to clear cache
const clearStorage = () => {
    try {
        localStorage.removeItem(STORAGE_KEY_LOCATIONS);
        localStorage.removeItem(STORAGE_KEY_STATIONS);
        localStorage.removeItem(STORAGE_KEY_TIMESTAMP);
    } catch (error) {
        console.error('Failed to clear cached locations:', error);
    }
};

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Initialize from localStorage if available
    const cachedData = loadFromStorage();
    
    const [locations, setLocations] = useState<Location[]>(cachedData?.locations || []);
    const [stations, setStations] = useState<Station[]>(cachedData?.stations || []);
    const [loading, setLoading] = useState(false);
    const [lastFetchTime, setLastFetchTime] = useState<number | null>(cachedData?.timestamp || null);
    const [retryCount, setRetryCount] = useState(0);
    const [error, setError] = useState(false);

    const loadLocations = useCallback(async (forceRefresh = false) => {
        // Check if we have cached data and it's still valid
        const now = Date.now();
        if (!forceRefresh && lastFetchTime && (now - lastFetchTime) < CACHE_DURATION) {
            // Use cached data
            console.log('Using cached stations data');
            return;
        }

        // Show loading when there's no data
        const isInitialLoad = locations.length === 0;
        if (isInitialLoad) {
            console.log('Starting initial load of stations...');
            setLoading(true);
            setError(false); // Clear any previous errors
        }
        
        try {
            console.log('Fetching stations from API...');
            const response = await locationService.getLocations();
            if (response.success && Array.isArray(response.data)) {
                console.log(`Successfully loaded ${response.data.length} locations`);
                setLocations(response.data);

                // Flatten all stations from all locations
                const allStations: Station[] = [];
                response.data.forEach((location) => {
                    if (location.offices && Array.isArray(location.offices)) {
                        allStations.push(...location.offices);
                    }
                });
                console.log(`Flattened ${allStations.length} stations`);
                setStations(allStations);
                setLastFetchTime(now);
                setRetryCount(0);
                setError(false);
                setLoading(false); // Successfully loaded, stop loading
                
                // Save to localStorage
                saveToStorage(response.data, allStations, now);
            } else {
                // Response not successful
                console.error('Invalid response from server:', response);
                throw new Error('Invalid response from server');
            }
        } catch (err) {
            console.error('Failed to load locations:', err);
            // Retry with exponential backoff if initial load fails (up to 3 attempts)
            if (isInitialLoad && retryCount < 3) {
                // Don't set error yet, we're still retrying
                const delay = Math.min(2000 * Math.pow(1.5, retryCount), 6000);
                console.log(`Retry attempt ${retryCount + 1}/3 scheduled in ${delay}ms`);
                setTimeout(() => {
                    setRetryCount(prev => prev + 1);
                }, delay);
            } else {
                // All retries exhausted, stop loading and show error
                console.log('All retry attempts exhausted, showing error');
                setError(true);
                setLoading(false);
            }
        }
    }, [lastFetchTime, locations.length, retryCount]);

    const refreshLocations = useCallback(async () => {
        setRetryCount(0); // Reset retry count for manual refresh
        setError(false); // Clear error state
        await loadLocations(true);
    }, [loadLocations]);

    const invalidateCache = useCallback(() => {
        setLastFetchTime(null);
        clearStorage();
    }, []);

    // Load data on mount if cache is expired or doesn't exist - start immediately
    useEffect(() => {
        const now = Date.now();
        // Always attempt to load if no cache or cache expired
        if (!lastFetchTime || (now - lastFetchTime) >= CACHE_DURATION) {
            loadLocations(false);
        } else if (stations.length === 0) {
            // If we have a timestamp but no stations, force reload
            loadLocations(true);
        }
        
        // Set up automatic refresh interval - runs in background
        const refreshInterval = setInterval(() => {
            const currentTime = Date.now();
            // Silently refresh in background when cache expires
            if (lastFetchTime && (currentTime - lastFetchTime) >= CACHE_DURATION) {
                loadLocations(false);
            }
        }, 60000); // Check every minute
        
        return () => clearInterval(refreshInterval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Retry mechanism when initial load fails - keep loading indicator active
    useEffect(() => {
        if (retryCount > 0 && stations.length === 0) {
            loadLocations(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [retryCount]);

    return (
        <LocationContext.Provider
            value={{
                locations,
                stations,
                loading,
                lastFetchTime,
                refreshLocations,
                invalidateCache,
                error,
            }}
        >
            {children}
        </LocationContext.Provider>
    );
};

export const useLocation = () => {
    const context = useContext(LocationContext);
    if (context === undefined) {
        throw new Error("useLocation must be used within a LocationProvider");
    }
    return context;
};

