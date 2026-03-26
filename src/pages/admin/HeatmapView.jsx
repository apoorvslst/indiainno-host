import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import api from "../../utils/api";
import Map, { Source, Layer, NavigationControl, Marker, Popup } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useAuth } from "../../contexts/AuthContext";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

const DEPARTMENTS = [
    { value: "all", label: "All Departments" },
    { value: "municipal", label: "Municipal" },
    { value: "pwd", label: "PWD" },
    { value: "electricity", label: "Electricity" },
    { value: "water_supply", label: "Water Supply" },
    { value: "health", label: "Health" },
    { value: "fire", label: "Fire" },
    { value: "environment", label: "Environment" },
    { value: "transport", label: "Transport" },
    { value: "forest", label: "Forest" },
];

const TIME_PERIODS = [
    { value: "all", label: "All Time" },
    { value: "30days", label: "Last 30 Days" },
    { value: "90days", label: "Last 90 Days" },
    { value: "6months", label: "Last 6 Months" },
    { value: "1year", label: "Last 1 Year" },
];

const SEVERITY_WEIGHTS = {
    "Critical": 4,
    "High": 3,
    "Medium": 2,
    "Low": 1
};

const heatmapLayer = {
    id: "heatmap-layer",
    type: "heatmap",
    paint: {
        "heatmap-weight": 1,
        "heatmap-intensity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            0, 1,
            9, 1.5,
            15, 2
        ],
        "heatmap-color": [
            "interpolate",
            ["linear"],
            ["heatmap-density"],
            0, "rgba(50, 180, 100, 0.1)",
            0.1, "rgba(80, 200, 100, 0.3)",
            0.2, "rgba(150, 220, 80, 0.45)",
            0.35, "rgba(230, 230, 50, 0.55)",
            0.5, "rgba(255, 180, 50, 0.65)",
            0.65, "rgba(255, 120, 50, 0.72)",
            0.8, "rgba(240, 60, 40, 0.8)",
            1, "rgba(180, 20, 20, 0.9)"
        ],
        "heatmap-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            0, 80,
            9, 90,
            15, 120
        ],
        "heatmap-opacity": 1
    }
};

const clusterLayer = {
    id: "clusters",
    type: "circle",
    source: "tickets",
    filter: ["has", "point_count"],
    paint: {
        "circle-color": [
            "step",
            ["get", "point_count"],
            "#51bbd6",
            10, "#f1f075",
            30, "#f28cb1",
            60, "#e55e5e"
        ],
        "circle-radius": [
            "step",
            ["get", "point_count"],
            20,
            10, 25,
            30, 35,
            60, 50
        ],
        "circle-opacity": 0.8,
        "circle-stroke-width": 2,
        "circle-stroke-color": "#ffffff"
    }
};

const clusterCountLayer = {
    id: "cluster-count",
    type: "symbol",
    source: "tickets",
    filter: ["has", "point_count"],
    layout: {
        "text-field": "{point_count_abbreviated}",
        "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
        "text-size": 14
    },
    paint: {
        "text-color": "#000000"
    }
};

const unclusteredPointLayer = {
    id: "unclustered-point",
    type: "circle",
    source: "tickets",
    filter: ["!", ["has", "point_count"]],
    paint: {
        "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            5, 2,
            10, 3,
            15, 5
        ],
        "circle-color": [
            "match",
            ["get", "severity"],
            "Critical", "#e55e5e",
            "High", "#f0a964",
            "Medium", "#51bbd6",
            "#28c77b"
        ],
        "circle-opacity": 0.7,
        "circle-stroke-width": 0.5,
        "circle-stroke-color": "#ffffff"
    }
};

const severityLabels = {
    Critical: { color: "#e55e5e", label: "Critical" },
    High: { color: "#f0a964", label: "High" },
    Medium: { color: "#51bbd6", label: "Medium" },
    Low: { color: "#28c77b", label: "Low" }
};

export default function HeatmapView() {
    const { userProfile } = useAuth();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDepartment, setSelectedDepartment] = useState("all");
    const [selectedTimePeriod, setSelectedTimePeriod] = useState("all");
    const [viewMode, setViewMode] = useState("heatmap");
    const [viewState, setViewState] = useState({
        latitude: 28.4595,
        longitude: 77.0266,
        zoom: 11
    });
    const [popupInfo, setPopupInfo] = useState(null);

    useEffect(() => {
        const fetchTickets = async () => {
            try {
                const { data } = await api.get('/tickets/master');
                const district = userProfile?.city?.trim().toLowerCase();
                const hasCoords = (t) => Number.isFinite(t?.lat) && Number.isFinite(t?.lng);
                const inDistrict = (t) => !district || (t.city || '').trim().toLowerCase() === district;
                const activeTickets = data.filter(t => 
                    hasCoords(t) && 
                    inDistrict(t) && 
                    t.status !== "Closed"
                );
                setTickets(activeTickets);
                if (activeTickets.length > 0) {
                    setViewState(prev => ({
                        ...prev,
                        latitude: activeTickets[0].lat,
                        longitude: activeTickets[0].lng
                    }));
                }
            } catch (err) {
                console.error(err);
            }
            setLoading(false);
        };
        fetchTickets();
    }, [userProfile?.city]);

    const filteredTickets = useMemo(() => {
        let filtered = tickets;

        if (selectedDepartment !== "all") {
            filtered = filtered.filter(t => 
                (t.department || '').toLowerCase() === selectedDepartment.toLowerCase()
            );
        }

        if (selectedTimePeriod !== "all") {
            const now = new Date();
            let days = 30;
            switch (selectedTimePeriod) {
                case "30days": days = 30; break;
                case "90days": days = 90; break;
                case "6months": days = 180; break;
                case "1year": days = 365; break;
                default: days = null;
            }
            if (days) {
                const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
                filtered = filtered.filter(t => {
                    const created = new Date(t.createdAt);
                    return created >= cutoff;
                });
            }
        }

        return filtered.map(t => ({
            type: "Feature",
            properties: {
                severity: t.severity || "Low",
                weight: SEVERITY_WEIGHTS[t.severity] || 1,
                category: t.intentCategory,
                status: t.status,
                complaintCount: t.complaintCount || 1,
                landmark: t.landmark,
                department: t.department
            },
            geometry: {
                type: "Point",
                coordinates: [t.lng, t.lat]
            }
        }));
    }, [tickets, selectedDepartment, selectedTimePeriod]);

    const geoJsonData = useMemo(() => ({
        type: "FeatureCollection",
        features: filteredTickets
    }), [filteredTickets]);

    const stats = useMemo(() => {
        const total = filteredTickets.length;
        const bySeverity = { Critical: 0, High: 0, Medium: 0, Low: 0 };
        const byDepartment = {};

        filteredTickets.forEach(f => {
            const sev = f.properties?.severity || "Low";
            bySeverity[sev] = (bySeverity[sev] || 0) + 1;
            
            const dept = tickets.find(t => 
                t.lng === f.geometry.coordinates[0] && 
                t.lat === f.geometry.coordinates[1]
            )?.department || "Unknown";
            byDepartment[dept] = (byDepartment[dept] || 0) + 1;
        });

        return { total, bySeverity, byDepartment };
    }, [filteredTickets, tickets]);

    const handleMapClick = (event) => {
        const features = event.features;
        if (!features || features.length === 0) return;
        
        const feature = features[0];
        if (feature.layer.id === "unclustered-point") {
            setPopupInfo({
                lng: feature.geometry.coordinates[0],
                lat: feature.geometry.coordinates[1],
                ...feature.properties
            });
        }
    };

    return (
        <DashboardLayout 
            title="Issue Heatmap Analysis" 
            subtitle={`Analyzing ${userProfile?.city || "your district"} - Hotspot identification`}
        >
            <div className="flex flex-wrap gap-4 mb-4 items-center">
                <div className="flex gap-2 items-center">
                    <label className="text-sm text-[var(--color-text-muted)]">Department:</label>
                    <select 
                        value={selectedDepartment}
                        onChange={(e) => setSelectedDepartment(e.target.value)}
                        className="input-field w-40"
                    >
                        {DEPARTMENTS.map(d => (
                            <option key={d.value} value={d.value}>{d.label}</option>
                        ))}
                    </select>
                </div>

                <div className="flex gap-2 items-center">
                    <label className="text-sm text-[var(--color-text-muted)]">Time Period:</label>
                    <select 
                        value={selectedTimePeriod}
                        onChange={(e) => setSelectedTimePeriod(e.target.value)}
                        className="input-field w-40"
                    >
                        {TIME_PERIODS.map(t => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                    </select>
                </div>

                <div className="flex gap-2 items-center ml-auto">
                    <button 
                        onClick={() => setViewMode("heatmap")}
                        className={`btn btn-sm ${viewMode === "heatmap" ? "btn-primary" : "btn-ghost"}`}
                    >
                        Heatmap
                    </button>
                    <button 
                        onClick={() => setViewMode("points")}
                        className={`btn btn-sm ${viewMode === "points" ? "btn-primary" : "btn-ghost"}`}
                    >
                        Points
                    </button>
                    <button 
                        onClick={() => setViewMode("both")}
                        className={`btn btn-sm ${viewMode === "both" ? "btn-primary" : "btn-ghost"}`}
                    >
                        Both
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-4">
                <div className="card p-4">
                    <p className="text-sm text-[var(--color-text-muted)]">Active Issues</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <div className="card p-4">
                    <p className="text-sm text-[var(--color-text-muted)]">Critical</p>
                    <p className="text-2xl font-bold text-red-500">{stats.bySeverity.Critical}</p>
                </div>
                <div className="card p-4">
                    <p className="text-sm text-[var(--color-text-muted)]">High</p>
                    <p className="text-2xl font-bold text-orange-500">{stats.bySeverity.High}</p>
                </div>
                <div className="card p-4">
                    <p className="text-sm text-[var(--color-text-muted)]">Medium + Low</p>
                    <p className="text-2xl font-bold">{stats.bySeverity.Medium + stats.bySeverity.Low}</p>
                </div>
            </div>

            <div className="card p-0 h-[60vh] relative overflow-hidden">
                {loading && (
                    <div className="absolute inset-0 bg-[var(--color-surface)]/80 flex items-center justify-center z-10">
                        <div className="spinner" />
                    </div>
                )}

                <Map
                    {...viewState}
                    onMove={evt => setViewState(evt.viewState)}
                    mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
                    mapboxAccessToken={MAPBOX_TOKEN}
                    onClick={handleMapClick}
                    interactiveLayerIds={viewMode !== "heatmap" ? ["unclustered-point"] : []}
                >
                    <NavigationControl position="top-right" />

                    {filteredTickets.length > 0 && viewMode === "heatmap" && (
                        <Source
                            id="heatmap-only"
                            type="geojson"
                            data={geoJsonData}
                        >
                            <Layer {...heatmapLayer} />
                        </Source>
                    )}

                    {filteredTickets.length > 0 && viewMode !== "heatmap" && (
                        <Source
                            id="tickets"
                            type="geojson"
                            data={geoJsonData}
                            cluster={true}
                            clusterMaxZoom={14}
                            clusterRadius={50}
                        >
                            {viewMode === "both" && (
                                <Layer {...heatmapLayer} />
                            )}
                            <Layer {...clusterLayer} />
                            <Layer {...clusterCountLayer} />
                            <Layer {...unclusteredPointLayer} />
                        </Source>
                    )}

                    {popupInfo && (
                        <Popup
                            anchor="bottom"
                            longitude={popupInfo.lng}
                            latitude={popupInfo.lat}
                            onClose={() => setPopupInfo(null)}
                            closeButton={true}
                            closeOnClick={false}
                        >
                            <div className="p-2 text-sm">
                                <p className="font-semibold mb-1">{popupInfo.category?.replace(/_/g, " ")}</p>
                                <div className="flex gap-1 mb-1">
                                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: severityLabels[popupInfo.severity]?.color || '#28c77b', color: '#fff' }}>
                                        {popupInfo.severity}
                                    </span>
                                    <span className="text-xs px-1.5 py-0.5 rounded bg-gray-200">
                                        {popupInfo.department || 'N/A'}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500">{popupInfo.landmark}</p>
                                <p className="text-xs text-gray-500">{popupInfo.complaintCount} complaint(s)</p>
                            </div>
                        </Popup>
                    )}
                </Map>

                <div className="absolute bottom-4 left-4 card p-3 bg-[var(--color-card)]/95 backdrop-blur max-w-[180px]">
                    <p className="text-xs font-semibold mb-2">Heatmap Density</p>
                    <div className="flex items-center gap-2 text-xs">
                        <div className="w-6 h-3 rounded-sm" style={{ background: "linear-gradient(to right, #ffffff, #adebad, #fdd79a, #f09640, #e24234, #b30000)" }}></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Low</span>
                        <span>High</span>
                    </div>
                </div>

                <div className="absolute top-4 left-4 card p-3 bg-[var(--color-card)]/95 backdrop-blur">
                    <p className="text-xs font-semibold mb-2">Severity</p>
                    {Object.entries(severityLabels).map(([key, { color, label }]) => (
                        <div key={key} className="flex items-center gap-2 text-xs">
                            <div className="w-3 h-3 rounded-full" style={{ background: color }}></div>
                            <span>{label}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-4">
                <h3 className="text-sm font-semibold mb-2">Department Distribution</h3>
                <div className="flex flex-wrap gap-2">
                    {Object.entries(stats.byDepartment).map(([dept, count]) => (
                        <span key={dept} className="badge badge-outline">
                            {dept}: {count}
                        </span>
                    ))}
                </div>
            </div>

            <style>{`
                .mapboxgl-popup-content {
                    background: var(--color-card) !important;
                    border: 1px solid var(--color-border) !important;
                    border-radius: 12px !important;
                    color: var(--color-text) !important;
                }
                .mapboxgl-popup-close-button {
                    color: var(--color-text-muted);
                }
            `}</style>
        </DashboardLayout>
    );
}