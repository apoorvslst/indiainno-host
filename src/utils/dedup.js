import { db } from "../firebase";
import {
    collection, query, where, getDocs, addDoc, updateDoc, doc, increment, serverTimestamp
} from "firebase/firestore";
import { getGeoHash, getNearbyGeoHashes, getDistanceMeters } from "./geolocation";

const DEDUP_RADIUS_METERS = 50;
const SEVERITY_THRESHOLDS = { Medium: 3, High: 10, Critical: 25 };

/**
 * Check for existing open tickets matching category within 50m radius
 * Uses geohash-based proximity search (Firestore doesn't support native geo-queries)
 */
export const findDuplicateTicket = async (category, lat, lng) => {
    const nearbyHashes = getNearbyGeoHashes(lat, lng);

    // Query tickets with matching category and nearby geohashes
    const ticketsRef = collection(db, "master_tickets");
    let matchingTicket = null;
    let minDistance = Infinity;

    // Firestore 'in' query supports max 30 values, our 9 nearby hashes are fine
    const q = query(
        ticketsRef,
        where("geoHash", "in", nearbyHashes),
        where("intentCategory", "==", category),
        where("status", "not-in", ["Closed", "Invalid_Spam"])
    );

    const snapshot = await getDocs(q);
    snapshot.forEach((docSnap) => {
        const ticket = { id: docSnap.id, ...docSnap.data() };
        const dist = getDistanceMeters(lat, lng, ticket.lat, ticket.lng);
        if (dist <= DEDUP_RADIUS_METERS && dist < minDistance) {
            matchingTicket = ticket;
            minDistance = dist;
        }
    });

    return matchingTicket;
};

/**
 * Calculate severity from complaint count
 */
export const calculateSeverity = (count) => {
    if (count >= SEVERITY_THRESHOLDS.Critical) return "Critical";
    if (count >= SEVERITY_THRESHOLDS.High) return "High";
    if (count >= SEVERITY_THRESHOLDS.Medium) return "Medium";
    return "Low";
};

/**
 * Process a new complaint through the deduplication engine
 * Branch A: Link to existing ticket → bump severity
 * Branch B: Create new master ticket
 *
 * Returns { ticketId, isNew, ticket }
 */
export const processComplaintDedup = async (complaint) => {
    const { intentCategory, lat, lng } = complaint;

    // Skip dedup if no valid coordinates
    if (!lat || !lng) {
        // Create ticket flagged for manual intervention
        const ticketData = {
            intentCategory,
            lat: null,
            lng: null,
            geoHash: null,
            severity: "Low",
            complaintCount: 1,
            status: "Open",
            assignedEngineerId: null,
            department: complaint.department || null,
            slaDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
            resolutionImageUrl: null,
            resolutionLat: null,
            resolutionLng: null,
            needsManualGeo: true,
            landmark: complaint.landmark || "",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };
        const ticketRef = await addDoc(collection(db, "master_tickets"), ticketData);
        return { ticketId: ticketRef.id, isNew: true, ticket: { id: ticketRef.id, ...ticketData }, needsManualGeo: true };
    }

    // Check for existing duplicate
    const existingTicket = await findDuplicateTicket(intentCategory, lat, lng);

    if (existingTicket) {
        // BRANCH A: Duplicate found → link & bump severity
        const newCount = (existingTicket.complaintCount || 1) + 1;
        const newSeverity = calculateSeverity(newCount);

        await updateDoc(doc(db, "master_tickets", existingTicket.id), {
            complaintCount: increment(1),
            severity: newSeverity,
            updatedAt: serverTimestamp(),
        });

        return {
            ticketId: existingTicket.id,
            isNew: false,
            ticket: { ...existingTicket, complaintCount: newCount, severity: newSeverity },
            needsManualGeo: false,
        };
    } else {
        // BRANCH B: No duplicate → create new master ticket
        const geoHash = getGeoHash(lat, lng);
        const ticketData = {
            intentCategory,
            lat,
            lng,
            geoHash,
            severity: "Low",
            complaintCount: 1,
            status: "Open",
            assignedEngineerId: null,
            department: complaint.department || null,
            slaDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
            resolutionImageUrl: null,
            resolutionLat: null,
            resolutionLng: null,
            needsManualGeo: false,
            landmark: complaint.landmark || "",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };
        const ticketRef = await addDoc(collection(db, "master_tickets"), ticketData);
        return { ticketId: ticketRef.id, isNew: true, ticket: { id: ticketRef.id, ...ticketData }, needsManualGeo: false };
    }
};
