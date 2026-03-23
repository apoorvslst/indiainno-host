import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/DashboardLayout";
import api from "../../utils/api";
import { getCurrentLocation } from "../../utils/geolocation";
import DEPARTMENTS, { getCategoryDepartment } from "../../data/departments";
import toast from "react-hot-toast";
import { HiOutlineLocationMarker } from "react-icons/hi";
import Map, { Marker, NavigationControl } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

export default function SubmitComplaint() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [geoLoading, setGeoLoading] = useState(false);
    const [locating, setLocating] = useState(true);
    const [viewState, setViewState] = useState({
        latitude: 20.5937,
        longitude: 78.9629,
        zoom: 4,
    });

    const [form, setForm] = useState({
        category: "",
        description: "",
        landmark: "",
        lat: null,
        lng: null,
        accuracy: null,
        department: "",
    });

    useEffect(() => {
        if (!navigator.geolocation) {
            const timer = setTimeout(() => setLocating(false), 0);
            return () => clearTimeout(timer);
        }

        const watchId = navigator.geolocation.watchPosition(
            (position) => {
                const live = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                };
                setForm((prev) => ({
                    ...prev,
                    lat: prev.lat ?? live.lat,
                    lng: prev.lng ?? live.lng,
                    accuracy: prev.accuracy ?? live.accuracy,
                }));
                setViewState((prev) => ({
                    ...prev,
                    latitude: live.lat,
                    longitude: live.lng,
                    zoom: prev.zoom < 14 ? 14 : prev.zoom,
                }));
                setLocating(false);
            },
            () => {
                setLocating(false);
            },
            { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === "category") {
            const dept = getCategoryDepartment(value);
            setForm({ ...form, category: value, department: dept?.id || "" });
        } else {
            setForm({ ...form, [name]: value });
        }
    };


    const captureLocation = async () => {
        setGeoLoading(true);
        try {
            const loc = await getCurrentLocation();
            setForm({ ...form, lat: loc.lat, lng: loc.lng, accuracy: loc.accuracy });
            toast.success(`Location captured! Accuracy: ${Math.round(loc.accuracy)}m`);
        } catch (err) {
            toast.error(err.message);
        }
        setGeoLoading(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.category) return toast.error("Please select a category");
        if (!form.description) return toast.error("Please describe the issue");
        setLoading(true);

        try {
            const { data } = await api.post('/tickets/complaint', {
                category: form.category,
                description: form.description,
                landmark: form.landmark,
                lat: form.lat,
                lng: form.lng,
                accuracy: form.accuracy,
                department: form.department,
            });

            if (data.isNew) {
                toast.success("Complaint submitted! A new ticket has been created.");
            } else {
                toast.success(`Complaint linked to existing ticket. Severity increased to ${data.ticket.severity}.`);
            }

            if (data.needsManualGeo) {
                toast("📌 Location unclear — ticket sent to manual review queue.", { icon: "⚠️" });
            }

            navigate("/citizen/complaints");
        } catch (err) {
            console.error("Submit error:", err);
            toast.error(err.response?.data?.message || err.message || "Failed to submit complaint.");
        }
        setLoading(false);
    };

    return (
        <DashboardLayout title="Submit Complaint" subtitle="Report a civic issue in your area">
            <div className="grid lg:grid-cols-5 gap-6 items-start">
                <form onSubmit={handleSubmit} className="space-y-6 animate-fadeInUp lg:col-span-3">
                    <div className="card">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <span className="w-7 h-7 rounded-lg bg-[var(--color-primary)]/20 flex items-center justify-center text-sm font-bold text-[var(--color-primary-light)]">1</span>
                            What's the issue?
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2 text-[var(--color-text-muted)]">Category</label>
                                <select name="category" value={form.category} onChange={handleChange} className="input-field" required>
                                    <option value="">Select a category</option>
                                    {DEPARTMENTS.map((dept) => (
                                        <optgroup key={dept.id} label={`${dept.icon} ${dept.name}`}>
                                            {dept.categories.map((cat) => (
                                                <option key={cat} value={cat}>{cat.replace(/_/g, " ")}</option>
                                            ))}
                                        </optgroup>
                                    ))}
                                </select>
                            </div>
                            {form.department && (
                                <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] bg-[var(--color-surface)] rounded-lg p-3">
                                    <span>🏛️</span>
                                    <span>Auto-routed to: <strong className="text-[var(--color-text)]">{DEPARTMENTS.find(d => d.id === form.department)?.name}</strong></span>
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium mb-2 text-[var(--color-text-muted)]">Describe the issue</label>
                                <textarea
                                    name="description"
                                    value={form.description}
                                    onChange={handleChange}
                                    className="input-field min-h-[120px]"
                                    placeholder="E.g., Large pothole on MG Road near the chai stall..."
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <span className="w-7 h-7 rounded-lg bg-[var(--color-accent)]/20 flex items-center justify-center text-sm font-bold text-[var(--color-accent-light)]">2</span>
                            Where is it?
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2 text-[var(--color-text-muted)]">Landmark / Address</label>
                                <input
                                    name="landmark"
                                    type="text"
                                    value={form.landmark}
                                    onChange={handleChange}
                                    className="input-field"
                                    placeholder="E.g., Near Shiv Mandir, Sector 14, Gurugram"
                                />
                            </div>

                            <div>
                                <button type="button" onClick={captureLocation} disabled={geoLoading} className="btn-secondary w-full justify-center">
                                    {geoLoading ? (
                                        <><div className="spinner w-4 h-4 border-2" /> Detecting location...</>
                                    ) : form.lat ? (
                                        <><HiOutlineLocationMarker className="text-[#22c55e]" /> Location Captured ✓</>
                                    ) : (
                                        <><HiOutlineLocationMarker /> Capture My Live Location</>
                                    )}
                                </button>
                                {form.lat && (
                                    <div className="mt-2 text-xs text-[var(--color-text-muted)] bg-[var(--color-surface)] rounded-lg p-3">
                                        📍 Lat: {form.lat.toFixed(6)}, Lng: {form.lng.toFixed(6)} (±{Math.round(form.accuracy)}m)
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <button type="submit" className="btn-primary w-full justify-center py-3.5 text-base" disabled={loading}>
                        {loading ? <div className="spinner w-5 h-5 border-2" /> : "Submit Complaint"}
                    </button>
                </form>

                <div className="lg:col-span-2 card p-0 overflow-hidden animate-fadeInUp lg:sticky lg:top-6" style={{ animationDelay: "100ms" }}>
                    <div className="px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                        <h3 className="font-semibold">Your Live Location</h3>
                        <p className="text-xs text-[var(--color-text-muted)]">Map auto-follows your current position for better complaint accuracy.</p>
                    </div>

                    <div className="h-[360px] relative">
                        <Map
                            {...viewState}
                            onMove={(evt) => setViewState(evt.viewState)}
                            mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
                            mapboxAccessToken={MAPBOX_TOKEN}
                        >
                            <NavigationControl position="top-right" />

                            {Number.isFinite(form.lat) && Number.isFinite(form.lng) && (
                                <Marker longitude={form.lng} latitude={form.lat} anchor="bottom">
                                    <div className="w-4 h-4 rounded-full bg-[#2563eb] border-2 border-white shadow-[0_0_10px_rgba(37,99,235,0.7)]" />
                                </Marker>
                            )}
                        </Map>

                        {locating && (
                            <div className="absolute inset-0 bg-white/85 flex items-center justify-center text-sm font-semibold text-[var(--color-text-muted)]">
                                Detecting live location...
                            </div>
                        )}
                    </div>

                    <div className="px-4 py-3 text-xs text-[var(--color-text-muted)] border-t border-[var(--color-border)]">
                        {Number.isFinite(form.lat) && Number.isFinite(form.lng)
                            ? `Lat ${form.lat.toFixed(6)}, Lng ${form.lng.toFixed(6)} (±${Math.round(form.accuracy || 0)}m)`
                            : "Location not available yet. Please allow location access."}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
