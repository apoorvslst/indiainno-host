import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import DashboardLayout from "../../components/DashboardLayout";
import api from "../../utils/api";
import { getCurrentLocation } from "../../utils/geolocation";
import DEPARTMENTS, { getCategoryDepartment } from "../../data/departments";
import toast from "react-hot-toast";
import { HiOutlineLocationMarker, HiOutlinePhotograph } from "react-icons/hi";

export default function SubmitComplaint() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [geoLoading, setGeoLoading] = useState(false);

    const [form, setForm] = useState({
        category: "",
        description: "",
        landmark: "",
        lat: null,
        lng: null,
        accuracy: null,
        department: "",
        imageFile: null,
        imagePreview: null,
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === "category") {
            const dept = getCategoryDepartment(value);
            setForm({ ...form, category: value, department: dept?.id || "" });
        } else {
            setForm({ ...form, [name]: value });
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setForm({ ...form, imageFile: file, imagePreview: reader.result });
            reader.readAsDataURL(file);
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
            <div className="max-w-2xl">
                <form onSubmit={handleSubmit} className="space-y-6 animate-fadeInUp">
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
            </div>
        </DashboardLayout>
    );
}
