import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/DashboardLayout";
import api from "../../utils/api";
import { getCurrentLocation, isWithinRange } from "../../utils/geolocation";
import toast from "react-hot-toast";
import { HiOutlineLocationMarker, HiOutlinePhotograph, HiOutlineShieldCheck, HiOutlineCheckCircle } from "react-icons/hi";

export default function ResolveTicket() {
    const { ticketId } = useParams();
    const navigate = useNavigate();
    const [ticket, setTicket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [geoLoading, setGeoLoading] = useState(false);

    const [form, setForm] = useState({
        lat: null,
        lng: null,
        accuracy: null,
        imageFile: null,
        imagePreview: null,
        notes: "",
        progressPercent: 0
    });

    useEffect(() => {
        const fetchTicket = async () => {
            try {
                const { data } = await api.get(`/tickets/master/${ticketId}`);
                setTicket(data);
                setForm(prev => ({ ...prev, progressPercent: data.progressPercent || 0 }));
            } catch {
                toast.error("Failed to load ticket");
                navigate("/engineer");
            }
            setLoading(false);
        };
        fetchTicket();
    }, [ticketId, navigate]);

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

            if (ticket.lat && ticket.lng) {
                const check = isWithinRange(ticket.lat, ticket.lng, loc.lat, loc.lng, 50);
                if (check.withinRange) {
                    toast.success(`Location verified! You are ${check.distance}m from site.`, { icon: '✅' });
                } else {
                    toast.error(`Geo-fence Audit Failed: You are ${check.distance}m away. Must be within 50m to resolve.`);
                }
            } else {
                toast.success("Location captured.");
            }
        } catch (err) {
            toast.error(err.message);
        }
        setGeoLoading(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // If not 100%, just update progress
        if (form.progressPercent < 100) {
            setSubmitting(true);
            try {
                await api.put(`/tickets/master/${ticketId}`, {
                    progressPercent: form.progressPercent
                });
                toast.success("Progress updated successfully!");
                navigate("/engineer");
            } catch {
                toast.error("Failed to update progress.");
            }
            setSubmitting(false);
            return;
        }

        // Full resolution constraints
        if (!form.lat || !form.lng) return toast.error("Live geolocation is strictly required to prove presence.");
        if (!form.imagePreview) return toast.error("Must upload a live photo of the resolution.");

        if (ticket.lat && ticket.lng) {
            const check = isWithinRange(ticket.lat, ticket.lng, form.lat, form.lng, 50);
            if (!check.withinRange) {
                toast.error(`CRYPTOGRAPHIC DENIAL: Upload coordinates are ${check.distance}m away from the ticket coordinates.`);
                return;
            }
        }

        setSubmitting(true);
        try {
            await api.put(`/tickets/master/${ticketId}`, {
                resolutionLat: form.lat,
                resolutionLng: form.lng,
                resolutionNotes: form.notes,
                resolutionImageUrl: form.imagePreview,
                progressPercent: 100
            });

            toast.success("Resolution submitted successfully. Awaiting citizen verification.", { duration: 5000 });
            navigate("/engineer");
        } catch (err) {
            console.error(err);
            toast.error("Failed to commit resolution block.");
        }
        setSubmitting(false);
    };

    if (loading) return <DashboardLayout><div className="flex justify-center py-20"><div className="spinner" /></div></DashboardLayout>;
    if (!ticket) return null;

    return (
        <DashboardLayout title="Resolve Issue" subtitle={`Ticket ID: ${ticket.id.slice(0, 8)}`}>
            <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-6 animate-fadeInUp">
                    <div className="card">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h2 className="text-xl font-bold">{ticket.intentCategory?.replace(/_/g, " ")}</h2>
                                <p className="text-[var(--color-text-muted)]">{ticket.landmark || "Geo-coordinate report"}</p>
                            </div>
                            <span className={`badge severity-${(ticket.severity || "low").toLowerCase()}`}>{ticket.severity}</span>
                        </div>

                        <div className="p-4 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] mb-4">
                            <p className="text-sm font-medium mb-1 flex items-center gap-2"><HiOutlineLocationMarker className="text-[var(--color-primary)]" /> Target Area</p>
                            <code className="text-xs text-[var(--color-text-muted)]">Lat: {ticket.lat?.toFixed(5)} | Lng: {ticket.lng?.toFixed(5)}</code>
                        </div>

                        <div className="bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-xl p-4 flex gap-3 text-sm">
                            <HiOutlineShieldCheck className="text-2xl text-[#ef4444] shrink-0" />
                            <div>
                                <strong className="block text-[#ef4444] mb-1">Strict Geo-Fencing Active</strong>
                                <p className="text-[#f87171]">You must be physically within exactly 50 meters of the target coordinates to submit this resolution. Submissions outside this radius are cryptographically rejected.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="animate-fadeInUp" style={{ animationDelay: "100ms" }}>
                    <form onSubmit={handleSubmit} className="card space-y-6">
                        <h3 className="text-lg font-bold">Cryptographic Proof of Work</h3>

                        <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                            <label className="block text-sm font-medium mb-3 text-[var(--color-text-muted)]">Current Progress: {form.progressPercent}%</label>
                            <input
                                type="range" min="0" max="100" step="10"
                                value={form.progressPercent}
                                onChange={(e) => setForm({ ...form, progressPercent: parseInt(e.target.value) })}
                                className="w-full accent-[var(--color-primary)]"
                            />
                            <p className="text-xs text-[var(--color-text-muted)] mt-2">
                                If less than 100%, this will just update the progress for the citizen without requiring geo-proof or images.
                            </p>
                        </div>

                        {form.progressPercent === 100 && (
                            <div className="space-y-4">
                                <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                                    <label className="block text-sm font-medium mb-3 text-[var(--color-text-muted)]">Step 1: Verify Location Identity</label>
                                    <button
                                        type="button"
                                        onClick={captureLocation}
                                        disabled={geoLoading}
                                        className={`btn-secondary w-full justify-center py-3 ${form.lat ? 'border-[#22c55e] bg-[#22c55e]/10 text-[#4ade80]' : ''}`}
                                    >
                                        {geoLoading ? (
                                            <><div className="spinner w-4 h-4 border-2" /> Polling Satellites...</>
                                        ) : form.lat ? (
                                            <><HiOutlineCheckCircle className="text-lg" /> Coordinates Locked ({Math.round(form.accuracy)}m acc)</>
                                        ) : (
                                            <><HiOutlineLocationMarker className="text-lg" /> Fetch Live GPS Sig</>
                                        )}
                                    </button>
                                </div>

                                <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                                    <label className="block text-sm font-medium mb-3 text-[var(--color-text-muted)]">Step 2: Live Camera Proof</label>
                                    <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 cursor-pointer transition-colors ${form.imagePreview ? 'border-[var(--color-primary)]' : 'border-[var(--color-border)] hover:border-[var(--color-primary)]'}`}>
                                        {form.imagePreview ? (
                                            <img src={form.imagePreview} alt="Resolution proof" className="max-h-48 rounded-lg mb-0" />
                                        ) : (
                                            <>
                                                <div className="w-12 h-12 rounded-full bg-[var(--color-card)] flex items-center justify-center mb-3 shadow-lg">
                                                    <HiOutlinePhotograph className="text-2xl text-[var(--color-primary)]" />
                                                </div>
                                                <p className="text-sm font-medium">Open Camera</p>
                                            </>
                                        )}
                                        <input type="file" accept="image/*" capture="environment" onChange={handleImageChange} className="hidden" />
                                    </label>
                                </div>

                                <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                                    <label className="block text-sm font-medium mb-2 text-[var(--color-text-muted)]">Engineer Remarks (Optional)</label>
                                    <textarea
                                        value={form.notes}
                                        onChange={e => setForm({ ...form, notes: e.target.value })}
                                        className="input-field min-h-[80px]"
                                    />
                                </div>
                            </div>
                        )}

                        <button type="submit" className="btn-primary w-full justify-center py-4 text-base" disabled={submitting}>
                            {submitting ? <div className="spinner w-5 h-5 border-2" /> : (form.progressPercent === 100 ? "Commit Final Resolution Block" : "Update Progress")}
                        </button>
                    </form>
                </div>
            </div>
        </DashboardLayout>
    );
}
