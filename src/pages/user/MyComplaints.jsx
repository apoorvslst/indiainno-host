import { useState, useEffect, useRef } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import api from "../../utils/api";
import { TICKET_STATUSES } from "../../data/departments";
import toast from "react-hot-toast";

export default function MyComplaints() {
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");
    const [expandedTimeline, setExpandedTimeline] = useState(null);
    const fetchedRef = useRef(false);

    const [reComplainId, setReComplainId] = useState(null);
    const [reComplainRemark, setReComplainRemark] = useState("");

    useEffect(() => {
        if (fetchedRef.current) return;
        fetchedRef.current = true;

        const fetchComplaints = async () => {
            try {
                const { data } = await api.get('/tickets/my-complaints', { timeout: 30000 });
                setComplaints(data);
            } catch (err) {
                console.error("Error fetching complaints:", err);
                const msg = err?.code === 'ECONNABORTED'
                    ? "Complaints are taking longer than expected. Please wait and refresh."
                    : (err?.response?.data?.message || "Could not load complaints. Please refresh.");
                toast.error(msg);
            } finally {
                setLoading(false);
            }
        };
        fetchComplaints();
    }, []);

    const handleVerify = async (ticketId, verified, rating = null, remark = "") => {
        try {
            await api.put(`/tickets/master/${ticketId}/verify`, { verified, rating, feedback: remark });
            setComplaints(complaints.map(c => {
                if (c.ticket?.id === ticketId || c.masterTicketId?._id === ticketId) {
                    return {
                        ...c,
                        ticket: c.ticket ? { ...c.ticket, status: verified ? 'Closed' : 'Reopened', citizenRating: rating } : undefined,
                        status: verified ? 'Closed' : 'Reopened'
                    };
                }
                return c;
            }));
            setReComplainId(null);
            setReComplainRemark("");
            if (verified) toast.success('Thank you! Issue marked as resolved.');
            else toast.success('Re-complaint submitted. The engineer will be notified.');
        } catch (error) {
            console.error(error);
            toast.error('Failed to submit verification');
        }
    };

    const filteredComplaints = filter === "all"
        ? complaints
        : complaints.filter((c) => (c.ticket?.status || c.status || "Registered") === filter);

    const getCategoryIcon = (cat) => {
        const iconMap = {
            Pothole: "🕳️", Road_Damage: "🛣️", Streetlight: "💡", Power_Outage: "⚡",
            Water_Leak: "💧", No_Water: "🚰", Garbage: "🗑️", Sewage_Overflow: "🚿",
            Traffic_Signal: "🚦", Fire_Hazard: "🔥", Noise_Complaint: "📢",
            Hospital_Issue: "🏥", Tree_Felling: "🌳",
        };
        return iconMap[cat] || "📋";
    };

    return (
        <DashboardLayout title="My Complaints" subtitle="Track all your submitted complaints">
            {/* Filters */}
            <div className="flex flex-wrap gap-2 mb-6 animate-fadeInUp">
                <button
                    onClick={() => setFilter("all")}
                    className={`badge cursor-pointer transition-all ${filter === "all" ? "bg-[var(--color-primary)]/20 text-[var(--color-primary-light)] ring-1 ring-[var(--color-primary)]" : "bg-[var(--color-surface)] text-[var(--color-text-muted)]"}`}
                >
                    All ({complaints.length})
                </button>
                {TICKET_STATUSES.slice(0, 8).map((s) => {
                    const count = complaints.filter((c) => (c.ticket?.status || c.status) === s.value).length;
                    return (
                        <button
                            key={s.value}
                            onClick={() => setFilter(s.value)}
                            className={`badge cursor-pointer transition-all ${filter === s.value ? `status-${s.value.toLowerCase()} ring-1` : "bg-[var(--color-surface)] text-[var(--color-text-muted)]"}`}
                        >
                            {s.label} ({count})
                        </button>
                    );
                })}
            </div>

            {loading ? (
                <div className="flex justify-center py-16"><div className="spinner" /></div>
            ) : filteredComplaints.length === 0 ? (
                <div className="card text-center py-16">
                    <p className="text-4xl mb-3">🔍</p>
                    <p className="text-[var(--color-text-muted)]">No complaints found</p>
                </div>
            ) : (
                <div className="space-y-4 stagger">
                    {filteredComplaints.map((c) => {
                        const status = c.ticket?.status || c.status || "Registered";
                        const severity = c.ticket?.severity || "Low";
                        const category = c.ticket?.primaryCategory || c.intentCategory;
                        return (
                            <div key={c.id} className="card animate-fadeInUp hover:bg-[var(--color-card-hover)]">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center text-2xl flex-shrink-0">
                                        {getCategoryIcon(category)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                            {c.ticket?.ticketNumber && <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded-sm">{c.ticket.ticketNumber}</span>}
                                            <h3 className="font-semibold">{category?.replace(/_/g, " ")}</h3>
                                            <span className={`badge status-${status.toLowerCase()}`}>{status.replace(/_/g, " ")}</span>
                                            <span className={`badge severity-${severity.toLowerCase()}`}>{severity}</span>
                                            {c.ticket?.source === 'voice_call' && <span className="badge bg-purple-100 text-purple-700">📞 Voice</span>}
                                        </div>
                                        <p className="text-sm text-[var(--color-text-muted)] mb-2 line-clamp-2">{c.transcriptOriginal}</p>
                                        <div className="flex items-center gap-4 text-xs text-[var(--color-text-muted)]">
                                            {c.extractedLandmark && <span>📍 {c.extractedLandmark}</span>}
                                            {c.ticket?.locality && <span>🏘️ {c.ticket.locality}</span>}
                                            {c.ticket?.wardNumber && <span>🏛️ Ward {c.ticket.wardNumber}</span>}
                                            <span>🕐 {new Date(c.createdAt).toLocaleDateString()}</span>
                                            {c.ticket?.complaintCount > 1 && (
                                                <span className="text-[var(--color-warning)]">👥 {c.ticket.complaintCount} reports</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Citizen Images */}
                                {c.ticket?.citizenImages?.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {c.ticket.citizenImages.slice(0, 4).map((img, i) => (
                                            <img key={i} src={img} alt={`Evidence ${i + 1}`} className="w-16 h-16 object-cover rounded-lg border border-[var(--color-border)]" />
                                        ))}
                                        {c.ticket.citizenImages.length > 4 && (
                                            <div className="w-16 h-16 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center text-xs font-bold text-[var(--color-text-muted)]">+{c.ticket.citizenImages.length - 4}</div>
                                        )}
                                    </div>
                                )}

                                {/* Action History Timeline */}
                                {c.ticket?.actionHistory?.length > 0 && (
                                    <div className="mt-3">
                                        <button
                                            onClick={() => setExpandedTimeline(expandedTimeline === c.id ? null : c.id)}
                                            className="text-xs font-semibold text-[var(--color-primary-light)] hover:underline"
                                        >
                                            {expandedTimeline === c.id ? '▼' : '▶'} Timeline ({c.ticket.actionHistory.length} updates)
                                        </button>
                                        {expandedTimeline === c.id && (
                                            <div className="mt-2 space-y-2 border-l-2 border-[var(--color-border)] pl-4">
                                                {c.ticket.actionHistory.map((entry, i) => (
                                                    <div key={i} className="relative">
                                                        <div className="absolute -left-[21px] w-2.5 h-2.5 rounded-full bg-[var(--color-primary)] border-2 border-white" />
                                                        <div className="text-xs">
                                                            <span className="font-semibold">{entry.newStatus?.replace(/_/g, " ")}</span>
                                                            {entry.progressPercentage !== undefined && <span className="ml-2 text-[var(--color-text-muted)]">({entry.progressPercentage}%)</span>}
                                                            <p className="text-[var(--color-text-muted)]">{entry.remarks}</p>
                                                            {entry.images?.length > 0 && (
                                                                <div className="flex gap-1 mt-1">
                                                                    {entry.images.map((img, j) => (
                                                                        <img key={j} src={img} alt="Phase" className="w-12 h-12 object-cover rounded border" />
                                                                    ))}
                                                                </div>
                                                            )}
                                                            <span className="text-[var(--color-text-muted)]">{new Date(entry.actionDate).toLocaleString()}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Verification: Satisfied / Re-complain */}
                                {c.ticket?.status === "Pending_Verification" && (
                                    <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
                                        <h4 className="font-semibold text-sm mb-2 text-[var(--color-warning)]">Review Resolution</h4>
                                        <p className="text-sm text-[var(--color-text)] mb-3 bg-[var(--color-surface)] p-3 rounded-md">
                                            {c.ticket?.resolutionRemarks || "Fix implemented."}
                                        </p>
                                        {c.ticket?.resolutionImages?.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mb-3">
                                                {c.ticket.resolutionImages.map((img, i) => (
                                                    <img key={i} src={img} alt={`Resolution ${i + 1}`} className="w-24 h-24 object-cover rounded-md border" />
                                                ))}
                                            </div>
                                        )}

                                        {reComplainId === c.ticket.id ? (
                                            <div className="space-y-3 mt-3">
                                                <textarea
                                                    value={reComplainRemark}
                                                    onChange={(e) => setReComplainRemark(e.target.value)}
                                                    placeholder="Describe why you are not satisfied..."
                                                    className="input-field min-h-[80px]"
                                                />
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => {
                                                            if (!reComplainRemark.trim()) return toast.error("Please provide a remark.");
                                                            handleVerify(c.ticket.id, false, null, reComplainRemark);
                                                        }}
                                                        className="btn-primary text-sm py-2 bg-red-600 hover:bg-red-700"
                                                    >
                                                        🔄 Submit Re-complaint
                                                    </button>
                                                    <button
                                                        onClick={() => { setReComplainId(null); setReComplainRemark(""); }}
                                                        className="btn-secondary text-sm py-2"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-3 mt-3">
                                                <button
                                                    onClick={() => handleVerify(c.ticket.id, true, 5)}
                                                    className="btn-primary text-sm py-2"
                                                >
                                                    ✅ Satisfied
                                                </button>
                                                <button
                                                    onClick={() => setReComplainId(c.ticket.id)}
                                                    className="btn-secondary text-sm py-2 bg-red-50 text-red-600 hover:bg-red-100 border-red-200"
                                                >
                                                    🔄 Re-complain
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {c.ticket?.progressPercent > 0 && c.ticket?.status !== "Pending_Verification" && c.ticket?.status !== "Closed" && (
                                    <div className="mt-4">
                                        <div className="flex justify-between text-xs mb-1">
                                            <span>Progress</span>
                                            <span className="font-bold">{c.ticket.progressPercent}%</span>
                                        </div>
                                        <div className="w-full bg-[var(--color-surface)] rounded-full h-2">
                                            <div className="bg-[var(--color-primary)] h-2 rounded-full transition-all" style={{ width: `${c.ticket.progressPercent}%` }}></div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </DashboardLayout>
    );
}
