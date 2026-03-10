/**
 * Geolocation utility for CivicSync
 * Handles live GPS capture and distance calculations
 */

/**
 * Get current device location using HTML5 Geolocation API
 * @returns {Promise<{lat: number, lng: number, accuracy: number}>}
 */
export const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error("Geolocation is not supported by your browser"));
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                });
            },
            (error) => {
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        reject(new Error("Location permission denied. Please enable location access."));
                        break;
                    case error.POSITION_UNAVAILABLE:
                        reject(new Error("Location information unavailable."));
                        break;
                    case error.TIMEOUT:
                        reject(new Error("Location request timed out."));
                        break;
                    default:
                        reject(new Error("An unknown error occurred."));
                }
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    });
};

/**
 * Calculate distance between two coordinates in meters (Haversine formula)
 */
export const getDistanceMeters = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth radius in meters
    const toRad = (deg) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

/**
 * Check if upload location is within acceptable range (50m) of ticket location
 */
export const isWithinRange = (ticketLat, ticketLng, uploadLat, uploadLng, maxDistMeters = 50) => {
    const dist = getDistanceMeters(ticketLat, ticketLng, uploadLat, uploadLng);
    return { withinRange: dist <= maxDistMeters, distance: Math.round(dist) };
};

/**
 * Generate a geohash for proximity-based deduplication in Firestore
 * Simple grid-based approach (divides earth into ~50m cells)
 */
export const getGeoHash = (lat, lng, precision = 5) => {
    // Each unit at precision 5 ≈ ~50m
    const latHash = Math.floor(lat * 10 ** precision);
    const lngHash = Math.floor(lng * 10 ** precision);
    return `${latHash}_${lngHash}`;
};

/**
 * Get nearby geo-hash cells (for querying in Firestore)
 * Returns the 9 cells surrounding the given point
 */
export const getNearbyGeoHashes = (lat, lng, precision = 5) => {
    const hashes = [];
    const step = 1 / 10 ** precision;
    for (let dLat = -1; dLat <= 1; dLat++) {
        for (let dLng = -1; dLng <= 1; dLng++) {
            hashes.push(getGeoHash(lat + dLat * step, lng + dLng * step, precision));
        }
    }
    return [...new Set(hashes)];
};
