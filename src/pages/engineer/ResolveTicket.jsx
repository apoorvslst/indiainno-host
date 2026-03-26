import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/DashboardLayout";
import api from "../../utils/api";
import { getCurrentLocation, isWithinRange } from "../../utils/geolocation";
import toast from "react-hot-toast";
import { HiOutlineLocationMarker, HiOutlinePhotograph, HiOutlineShieldCheck, HiOutlineCheckCircle, HiOutlineClock } from "react-icons/hi";

const PHASE_LABELS = ['Inspection', 'Planning', 'Execution', 'Verification', 'Completion'];

const calculatePhase = (percent) => {
    if (percent <= 20) return 1;
    if (percent <= 40) return 2;
    if (percent <= 60) return 3;
    if (percent <= 80) return 4;
    return 5;
};

const getPhaseInfo = (percent) => {
    const phase = calculatePhase(percent);
    return {
        phase,
        label: `Phase ${phase}: ${PHASE_LABELS[phase - 1]}`
    };
};

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
        progressPercent: 0,
        currentPhase: 1
    });

    useEffect(() => {
        const fetchTicket = async () => {
            try {
                const { data } = await api.get(`/tickets/master/${ticketId}`);
                setTicket(data);
                setForm(prev => ({ 
                    ...prev, 
                    progressPercent: data.progressPercent || 0,
                    currentPhase: data.currentPhase || 1
                }));
            } catch {
                toast.error("Failed to load ticket");
                navigate("/junior");
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

    const handleProgressUpdate = async () => {
        setSubmitting(true);
        try {
            const updateData = {
                progressPercent: form.progressPercent,
                currentPhase: form.currentPhase,
                juniorRemarks: form.notes
            };
            
            // Add image if provided (for any progress level)
            if (form.imagePreview) {
                updateData.progressImage = form.imagePreview;
            }
            
            // Only require location for final completion (100%)
            if (form.progressPercent === 100) {
                if (!form.lat || !form.lng) {
                    toast.error("Live geolocation required for final completion");
                    setSubmitting(false);
                    return;
                }
                updateData.resolutionLat = form.lat;
                updateData.resolutionLng = form.lng;
                updateData.resolutionRemarks = form.notes;
                updateData.resolutionImageUrl = form.imagePreview;
                
                if (ticket.lat && ticket.lng) {
                    const check = isWithinRange(ticket.lat, ticket.lng, form.lat, form.lng, 50);
                    if (!check.withinRange) {
                        toast.error(`Geo-fence failed: ${check.distance}m away from ticket location`);
                        setSubmitting(false);
                        return;
                    }
                }
            }

            await api.put(`/tickets/master/${ticketId}`, updateData);
            
            const message = form.progressPercent === 100 
                ? "Resolution submitted successfully! Awaiting verification."
                : `Progress updated to ${form.progressPercent}% (Phase ${form.currentPhase})`;
            
            toast.success(message);
            navigate("/junior");
        } catch (err) {
            console.error(err);
            toast.error("Failed to update progress");
        }
        setSubmitting(false);
    };

    if (loading) return <DashboardLayout><div className="flex justify-center py-20"><div className="spinner" /></div></DashboardLayout>;
    if (!ticket) return null;

    const getCurrentPhaseInfo = () => {
        return getPhaseInfo(form.progressPercent);
    };

    return (
        <DashboardLayout title="Resolve Issue" subtitle={`${ticket.ticketNumber || ticket.id?.slice(0, 8)}`}>
            <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-6 animate-fadeInUp">
                    <div className="card">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h2 className="text-xl font-bold">{(ticket.primaryCategory || ticket.intentCategory)?.replace(/_/g, " ")}</h2>
                                <p className="text-[var(--color-text-muted)]">{ticket.landmark || ticket.locality || "Geo-coordinate report"}</p>
                            </div>
                            <span className={`badge severity-${(ticket.severity || "low").toLowerCase()}`}>{ticket.severity}</span>
                        </div>

                        {/* Phase Progress Tracker */}
                        <div className="mb-4 p-4 bg-[var(--color-surface)] rounded-xl">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium">Progress Timeline</span>
                                <span className="text-xs text-[var(--color-text-muted)]">Current: Phase {form.currentPhase}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((phase) => (
                                    <div key={phase} className="flex-1">
                                        <div className={`h-2 rounded-full ${phase <= form.currentPhase ? 'bg-[var(--color-primary)]' : 'bg-gray-200'}`} />
                                        <div className="text-[10px] text-center mt-1 text-[var(--color-text-muted)]">{PHASE_LABELS[phase-1]?.slice(0, 4)}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-4 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] mb-4">
                            <p className="text-sm font-medium mb-1 flex items-center gap-2"><HiOutlineLocationMarker className="text-[var(--color-primary)]" /> Target Area</p>
                            <code className="text-xs text-[var(--color-text-muted)]">Lat: {ticket.lat?.toFixed(5)} | Lng: {ticket.lng?.toFixed(5)}</code>
                        </div>

                        {ticket.actionHistory?.length > 0 && (
                            <div className="mt-4">
                                <h4 className="text-sm font-semibold mb-2">Timeline ({ticket.actionHistory.length} updates)</h4>
                                <div className="space-y-2 border-l-2 border-[var(--color-border)] pl-4 max-h-48 overflow-y-auto">
                                    {ticket.actionHistory.map((entry, i) => (
                                        <div key={i} className="relative text-xs">
                                            <div className="absolute -left-[21px] w-2.5 h-2.5 rounded-full bg-[var(--color-primary)] border-2 border-white" />
                                            <span className="font-semibold">{entry.newStatus?.replace(/_/g, ' ')}</span>
                                            {entry.progressPercentage !== undefined && <span className="ml-1 text-[var(--color-text-muted)]">{entry.progressPercentage}%</span>}
                                            <p className="text-[var(--color-text-muted)]">{entry.remarks}</p>
                                            {entry.images?.length > 0 && (
                                                <div className="flex gap-1 mt-1">
                                                    {entry.images.map((img, idx) => (
                                                        <img key={idx} src={img} alt="" className="w-8 h-8 rounded object-cover" />))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="animate-fadeInUp" style={{ animationDelay: "100ms" }}>
                    <div className="card space-y-6">
                        <h3 className="text-lg font-bold">Update Progress</h3>

                        {/* Progress Slider - Any percentage allowed */}
                        <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                            <div className="flex justify-between items-center mb-3">
                                <label className="text-sm font-medium">Progress: {form.progressPercent}%</label>
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                    {getCurrentPhaseInfo().label}
                                </span>
                            </div>
                            <input
                                type="range" min="0" max="100" step="1"
                                value={form.progressPercent}
                                onChange={(e) => {
                                    const pct = parseInt(e.target.value);
                                    setForm({ 
                                        ...form, 
                                        progressPercent: pct,
                                        currentPhase: calculatePhase(pct)
                                    });
                                }}
                                className="w-full accent-[var(--color-primary)]"
                            />
                            <div className="flex justify-between text-[10px] text-[var(--color-text-muted)] mt-2">
                                <span>0%</span>
                                <span>20%</span>
                                <span>40%</span>
                                <span>60%</span>
                                <span>80%</span>
                                <span>100%</span>
                            </div>
                            <div className="mt-3 flex items-center gap-2">
                                <label className="text-xs text-[var(--color-text-muted)]">Or type %:</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={form.progressPercent}
                                    onChange={(e) => {
                                        const pct = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                                        setForm({ 
                                            ...form, 
                                            progressPercent: pct,
                                            currentPhase: calculatePhase(pct)
                                        });
                                    }}
                                    className="input-field"
                                    style={{ width: '70px', padding: '4px 8px', fontSize: '12px' }}
                                />
                                <span className="text-xs text-[var(--color-text-muted)]">%</span>
                            </div>
                            <p className="text-xs text-[var(--color-text-muted)] mt-2">
                                0-20% = Phase 1, 21-40% = Phase 2, 41-60% = Phase 3, 61-80% = Phase 4, 81-100% = Phase 5
                            </p>
                        </div>

                        {/* Phase Selection */}
                        <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                            <label className="text-sm font-medium mb-3 block">Current Phase</label>
                            <div className="flex gap-2">
                                {[1, 2, 3, 4, 5].map((phase) => (
                                    <button
                                        key={phase}
                                        type="button"
                                        onClick={() => {
                                            const pct = phase * 20;
                                            setForm({ ...form, currentPhase: phase, progressPercent: pct });
                                        }}
                                        className={`flex-1 py-2 px-1 text-xs rounded-lg border ${
                                            form.currentPhase === phase 
                                                ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' 
                                                : 'border-gray-200 hover:border-[var(--color-primary)]'
                                        }`}
                                    >
                                        P{phase}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Photo Upload - Available at ALL progress levels */}
                        <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                            <label className="text-sm font-medium mb-3 block flex items-center gap-2">
                                <HiOutlinePhotograph /> 
                                {form.progressPercent === 100 ? 'Final Resolution Photo' : 'Progress Photo (Optional)'}
                            </label>
                            <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-4 cursor-pointer transition-colors ${
                                form.imagePreview ? 'border-[var(--color-primary)]' : 'border-[var(--color-border)] hover:border-[var(--color-primary)]'
                            }`}>
                                {form.imagePreview ? (
                                    <>
                                        <img src={form.imagePreview} alt="Progress" className="max-h-32 rounded-lg mb-2" />
                                        <span className="text-xs text-[var(--color-text-muted)]">Click to change</span>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-10 h-10 rounded-full bg-[var(--color-card)] flex items-center justify-center mb-2">
                                            <HiOutlinePhotograph className="text-xl text-[var(--color-primary)]" />
                                        </div>
                                        <p className="text-sm font-medium">Add Photo</p>
                                    </>
                                )}
                                <input type="file" accept="image/*" capture="environment" onChange={handleImageChange} className="hidden" />
                            </label>
                        </div>

                        {/* Location - Only required for 100% */}
                        {form.progressPercent === 100 && (
                            <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                                <label className="text-sm font-medium mb-3 block">Verify Location (Required for completion)</label>
                                <button
                                    type="button"
                                    onClick={captureLocation}
                                    disabled={geoLoading}
                                    className={`btn-secondary w-full justify-center py-3 ${form.lat ? 'border-green-500 bg-green-50 text-green-700' : ''}`}
                                >
                                    {geoLoading ? (
                                        <><div className="spinner w-4 h-4" /> Locating...</>
                                    ) : form.lat ? (
                                        <><HiOutlineCheckCircle /> {Math.round(form.accuracy)}m accuracy</>
                                    ) : (
                                        <><HiOutlineLocationMarker /> Get Location</>
                                    )}
                                </button>
                            </div>
                        )}

                        {/* Remarks - Available at ALL progress levels */}
                        <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                            <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                                <HiOutlineClock /> 
                                {form.progressPercent === 100 ? 'Final Remarks' : 'Progress Remarks'}
                            </label>
                            <textarea
                                value={form.notes}
                                onChange={e => setForm({ ...form, notes: e.target.value })}
                                className="input-field min-h-[80px]"
                                placeholder={form.progressPercent === 100 
                                    ? "Describe the work done..." 
                                    : "What progress was made? Any challenges?"
                                }
                            />
                        </div>

                        <button 
                            onClick={handleProgressUpdate}
                            disabled={submitting}
                            className="btn-primary w-full justify-center py-4 text-base"
                        >
                            {submitting ? (
                                <div className="spinner w-5 h-5" />
                            ) : form.progressPercent === 100 ? (
                                "Complete & Submit Resolution"
                            ) : (
                                `Update Progress to ${form.progressPercent}%`
                            )}
                        </button>

                        <p className="text-xs text-[var(--color-text-muted)] text-center">
                            You can add photos and remarks at any progress level. 
                            Final completion requires location verification.
                        </p>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
