import { useState, useEffect, useRef, useCallback } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import api from "../../utils/api";
import Map, { Marker, Popup, NavigationControl } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import toast from "react-hot-toast";
import { HiOutlineThumbUp, HiOutlinePhotograph, HiOutlineLocationMarker } from "react-icons/hi";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

export default function CityMap() {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [locating, setLocating] = useState(true);
    const [popupInfo, setPopupInfo] = useState(null);
    const [userLoc, setUserLoc] = useState(null);
    const [viewState, setViewState] = useState(null);

    // Upvote state
    const [upvoting, setUpvoting] = useState(false);
    const [showProofModal, setShowProofModal] = useState(false);
    const [proofPreview, setProofPreview] = useState(null);
    const [upvotedIds, setUpvotedIds] = useState(new Set());
    const fileInputRef = useRef(null);

    const fetchAll = useCallback(async () => {
        const hasCoords = (ticket) => Number.isFinite(ticket?.lat) && Number.isFinite(ticket?.lng);
        try {
            const { data } = await api.get('/tickets/master');
            setTickets(data.filter(hasCoords));
        } catch (err) {
            console.error("Tickets fetch error:", err);
        }
        setLoading(false);
    }, []);

    const fetchNearby = useCallback(async (lat, lng) => {
        try {
            const { data } = await api.get(`/tickets/nearby?lat=${lat}&lng=${lng}&radius=10000`);
            setTickets(data);
        } catch (err) {
            console.error("Nearby fetch error:", err);
            await fetchAll();
            return;
        }
        setLoading(false);
    }, [fetchAll]);

    const centerOnLiveLocation = useCallback((lat, lng) => {
        setUserLoc({ lat, lng });
        setViewState({ latitude: lat, longitude: lng, zoom: 14 });
    }, []);

    // Get user location and fetch nearby tickets
    useEffect(() => {
        const timer = setTimeout(() => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                        centerOnLiveLocation(loc.lat, loc.lng);
                        setLocating(false);
                        fetchNearby(loc.lat, loc.lng);
                    },
                    () => {
                        setLocating(false);
                        // Fallback: fetch all active tickets
                        fetchAll();
                    }
                );
                return;
            }
            setLocating(false);
            fetchAll();
        }, 0);

        return () => clearTimeout(timer);
    }, [centerOnLiveLocation, fetchAll, fetchNearby]);

    useEffect(() => {
        if (viewState || locating || tickets.length === 0) return;
        const firstTicket = tickets.find((t) => Number.isFinite(t?.lat) && Number.isFinite(t?.lng));
        if (firstTicket) {
            const timer = setTimeout(() => {
                setViewState({ latitude: firstTicket.lat, longitude: firstTicket.lng, zoom: 12 });
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [locating, tickets, viewState]);

    const handleImageSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => setProofPreview(reader.result);
        reader.readAsDataURL(file);
    };

    const handleUpvote = async () => {
        if (!popupInfo || !proofPreview) return;
        setUpvoting(true);
        try {
            const { data } = await api.post(`/tickets/master/${popupInfo.id || popupInfo._id}/upvote`, {
                proofImageUrl: proofPreview
            });
            toast.success(`+1 recorded! Now ${data.ticket.complaintCount} reports`, { icon: '👍', duration: 4000 });

            // Update local state
            setUpvotedIds(prev => new Set([...prev, popupInfo.id || popupInfo._id]));
            setTickets(prev => prev.map(t =>
                (t.id || t._id) === (popupInfo.id || popupInfo._id)
                    ? { ...t, complaintCount: data.ticket.complaintCount, severity: data.ticket.severity }
                    : t
            ));
            setPopupInfo(prev => prev ? { ...prev, complaintCount: data.ticket.complaintCount, severity: data.ticket.severity } : null);

            // Reset modal
            setShowProofModal(false);
            setProofPreview(null);
        } catch (err) {
            const msg = err.response?.data?.message || "Failed to upvote";
            toast.error(msg, { duration: 4000 });
        }
        setUpvoting(false);
    };

    const getSeverityColor = (severity) => {
        switch (severity) {
            case "Critical": return "#ef4444";
            case "High": return "#f59e0b";
            case "Medium": return "#3b82f6";
            default: return "#22c55e";
        }
    };

    const getCategoryIcon = (cat) => {
        switch (cat) {
            case "Pothole": return "🕳️";
            case "Streetlight": return "💡";
            case "Water_Leak": return "💧";
            case "Garbage": return "🗑️";
            case "Sewage": return "🚰";
            case "Road_Damage": return "🛣️";
            default: return "📋";
        }
    };

    return (
        <DashboardLayout title="City Complaint Map" subtitle="View active issues nearby and +1 to boost priority">
            <div style={{
                background: "#fff",
                borderRadius: 12,
                overflow: "hidden",
                height: "72vh",
                position: "relative",
                border: "1px solid #e2e8f0",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
            }}>
                {loading && (
                    <div style={{
                        position: "absolute", inset: 0, background: "rgba(255,255,255,0.85)",
                        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10
                    }}>
                        <div className="spinner" />
                    </div>
                )}

                {!viewState && (
                    <div style={{
                        position: "absolute", inset: 0, background: "rgba(255,255,255,0.92)",
                        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 11,
                        color: "#334155", fontWeight: 600, fontSize: 14
                    }}>
                        {locating ? "Detecting your live location..." : "Preparing map..."}
                    </div>
                )}

                {viewState && <Map
                    {...viewState}
                    onMove={evt => setViewState(evt.viewState)}
                    mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
                    mapboxAccessToken={MAPBOX_TOKEN}
                >
                    <NavigationControl position="top-right" />

                    {/* User location marker */}
                    {userLoc && (
                        <Marker longitude={userLoc.lng} latitude={userLoc.lat}>
                            <div style={{
                                width: 16, height: 16, borderRadius: "50%",
                                background: "#3b82f6", border: "3px solid #fff",
                                boxShadow: "0 0 12px rgba(59,130,246,0.6)"
                            }} />
                        </Marker>
                    )}

                    {/* Ticket pins */}
                    {tickets.map(pin => (
                        <Marker
                            key={pin.id || pin._id}
                            longitude={pin.lng}
                            latitude={pin.lat}
                            onClick={e => { e.originalEvent.stopPropagation(); setPopupInfo(pin); }}
                        >
                            <div style={{
                                width: 28, height: 28, borderRadius: "50%",
                                background: getSeverityColor(pin.severity),
                                border: "2px solid #fff",
                                boxShadow: `0 0 10px ${getSeverityColor(pin.severity)}80`,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 14, cursor: "pointer",
                                animation: pin.severity === "Critical" ? "pulse 1.5s infinite" : "none"
                            }}>
                                {getCategoryIcon(pin.intentCategory)}
                            </div>
                        </Marker>
                    ))}

                    {/* Popup */}
                    {popupInfo && (
                        <Popup
                            anchor="bottom"
                            longitude={popupInfo.lng}
                            latitude={popupInfo.lat}
                            onClose={() => { setPopupInfo(null); setShowProofModal(false); setProofPreview(null); }}
                            closeButton={true}
                            closeOnClick={false}
                            maxWidth="320px"
                        >
                            <div style={{ padding: "8px 4px", minWidth: 240 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                                    <span style={{ fontSize: 22 }}>{getCategoryIcon(popupInfo.intentCategory)}</span>
                                    <div>
                                        <h4 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: "#1e293b" }}>
                                            {popupInfo.intentCategory?.replace(/_/g, " ")}
                                        </h4>
                                        <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>
                                            {popupInfo.landmark || "Pinned Location"}
                                        </p>
                                    </div>
                                </div>

                                <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                                    <span style={{
                                        padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                                        background: `${getSeverityColor(popupInfo.severity)}20`,
                                        color: getSeverityColor(popupInfo.severity)
                                    }}>
                                        {popupInfo.severity}
                                    </span>
                                    <span style={{
                                        padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                                        background: "#f1f5f9", color: "#475569"
                                    }}>
                                        {popupInfo.status}
                                    </span>
                                    <span style={{
                                        padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                                        background: "#eff6ff", color: "#1e40af"
                                    }}>
                                        👥 {popupInfo.complaintCount} reports
                                    </span>
                                </div>

                                {popupInfo.description && (
                                    <p style={{
                                        fontSize: 12, color: "#475569", margin: "0 0 10px",
                                        maxHeight: 40, overflow: "hidden", textOverflow: "ellipsis"
                                    }}>
                                        {popupInfo.description}
                                    </p>
                                )}

                                {/* +1 Button */}
                                {!showProofModal ? (
                                    <button
                                        onClick={() => setShowProofModal(true)}
                                        disabled={upvotedIds.has(popupInfo.id || popupInfo._id)}
                                        style={{
                                            width: "100%", padding: "8px 0", borderRadius: 8,
                                            border: "none", cursor: upvotedIds.has(popupInfo.id || popupInfo._id) ? "not-allowed" : "pointer",
                                            fontWeight: 700, fontSize: 13,
                                            background: upvotedIds.has(popupInfo.id || popupInfo._id)
                                                ? "#94a3b8"
                                                : "linear-gradient(135deg, #6366f1, #8b5cf6)",
                                            color: "#fff",
                                            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                                            boxShadow: "0 2px 8px rgba(99,102,241,0.3)"
                                        }}
                                    >
                                        {upvotedIds.has(popupInfo.id || popupInfo._id) ? (
                                            <>✅ Already Upvoted</>
                                        ) : (
                                            <><HiOutlineThumbUp style={{ fontSize: 16 }} /> +1 This Issue</>
                                        )}
                                    </button>
                                ) : (
                                    <div style={{ background: "#f8fafc", borderRadius: 8, padding: 10 }}>
                                        <p style={{ fontSize: 11, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                                            📸 Upload proof photo to verify your +1
                                        </p>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            capture="environment"
                                            onChange={handleImageSelect}
                                            style={{ display: "none" }}
                                        />
                                        {!proofPreview ? (
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                style={{
                                                    width: "100%", padding: "10px 0", borderRadius: 6,
                                                    border: "2px dashed #cbd5e1", background: "#fff",
                                                    cursor: "pointer", fontSize: 12, color: "#64748b",
                                                    display: "flex", alignItems: "center", justifyContent: "center", gap: 4
                                                }}
                                            >
                                                <HiOutlinePhotograph style={{ fontSize: 16 }} />
                                                Take / Select Photo
                                            </button>
                                        ) : (
                                            <div>
                                                <img
                                                    src={proofPreview}
                                                    alt="Proof"
                                                    style={{
                                                        width: "100%", height: 100, objectFit: "cover",
                                                        borderRadius: 6, marginBottom: 6
                                                    }}
                                                />
                                                <div style={{ display: "flex", gap: 6 }}>
                                                    <button
                                                        onClick={() => { setProofPreview(null); }}
                                                        style={{
                                                            flex: 1, padding: "6px 0", borderRadius: 6,
                                                            border: "1px solid #e2e8f0", background: "#fff",
                                                            cursor: "pointer", fontSize: 11, color: "#64748b"
                                                        }}
                                                    >
                                                        Change
                                                    </button>
                                                    <button
                                                        onClick={handleUpvote}
                                                        disabled={upvoting}
                                                        style={{
                                                            flex: 2, padding: "6px 0", borderRadius: 6,
                                                            border: "none", cursor: "pointer",
                                                            background: "linear-gradient(135deg, #22c55e, #16a34a)",
                                                            color: "#fff", fontWeight: 700, fontSize: 11,
                                                            opacity: upvoting ? 0.7 : 1
                                                        }}
                                                    >
                                                        {upvoting ? "Submitting..." : "✅ Confirm +1"}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </Popup>
                    )}
                </Map>}

                {/* Legend */}
                <div style={{
                    position: "absolute", bottom: 16, left: 16, zIndex: 5,
                    background: "rgba(255,255,255,0.95)", borderRadius: 10, padding: "10px 14px",
                    boxShadow: "0 2px 12px rgba(0,0,0,0.1)", border: "1px solid #e2e8f0"
                }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: "#475569", marginBottom: 6 }}>SEVERITY</p>
                    {[
                        { label: "Critical", color: "#ef4444" },
                        { label: "High", color: "#f59e0b" },
                        { label: "Medium", color: "#3b82f6" },
                        { label: "Low", color: "#22c55e" }
                    ].map(s => (
                        <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                            <div style={{ width: 10, height: 10, borderRadius: "50%", background: s.color }} />
                            <span style={{ fontSize: 11, color: "#334155" }}>{s.label}</span>
                        </div>
                    ))}
                </div>

                {/* Ticket count badge */}
                <div style={{
                    position: "absolute", top: 16, left: 16, zIndex: 5,
                    background: "rgba(255,255,255,0.95)", borderRadius: 10, padding: "8px 14px",
                    boxShadow: "0 2px 12px rgba(0,0,0,0.1)", border: "1px solid #e2e8f0",
                    display: "flex", alignItems: "center", gap: 6
                }}>
                    <HiOutlineLocationMarker style={{ fontSize: 16, color: "#6366f1" }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#1e293b" }}>
                        {tickets.length} active issues nearby
                    </span>
                </div>
            </div>

            <style>{`
                @keyframes pulse {
                    0%, 100% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.2); opacity: 0.8; }
                }
                .mapboxgl-popup-content {
                    border-radius: 12px !important;
                    padding: 12px !important;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.15) !important;
                }
                .mapboxgl-popup-close-button {
                    font-size: 18px;
                    right: 8px;
                    top: 4px;
                    color: #94a3b8;
                }
            `}</style>
        </DashboardLayout>
    );
}
