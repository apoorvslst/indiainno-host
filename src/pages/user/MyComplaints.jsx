import { useState, useEffect } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import api from "../../utils/api";
import { TICKET_STATUSES } from "../../data/departments";

export default function MyComplaints() {
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");

    useEffect(() => {
        const fetchComplaints = async () => {
            try {
                const { data } = await api.get('/tickets/my-complaints');
                setComplaints(data);
            } catch (err) {
                console.error("Error fetching complaints:", err);
            }
            setLoading(false);
        };
        fetchComplaints();
    }, []);

    const handleVerify = async (ticketId, verified, rating = null) => {
        try {
            await api.put(`/tickets/master/${ticketId}/verify`, { verified, rating });
            setComplaints(complaints.map(c => {
                if (c.ticket?.id === ticketId || c.masterTicketId?._id === ticketId) {
                    return {
                        ...c,
                        ticket: c.ticket ? { ...c.ticket, status: verified ? 'Closed' : 'Disputed', citizenRating: rating } : undefined,
                        status: verified ? 'Closed' : 'Disputed'
                    };
                }
                return c;
            }));
            if (verified) alert('Thank you for verifying! Issue closed.');
            else alert('Dispute has been logged.');
        } catch (error) {
            console.error(error);
            alert('Failed to submit verification');
        }
    };

    const filteredComplaints = filter === "all"
        ? complaints
        : complaints.filter((c) => (c.ticket?.status || c.status || "Open") === filter);

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
                {TICKET_STATUSES.slice(0, 6).map((s) => {
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
                        const status = c.ticket?.status || c.status || "Open";
                        const severity = c.ticket?.severity || "Low";
                        return (
                            <div key={c.id} className="card animate-fadeInUp hover:bg-[var(--color-card-hover)]">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center text-2xl flex-shrink-0">
                                        {getCategoryIcon(c.intentCategory)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                            {c.ticket?.ticketNumber && <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded-sm">{c.ticket.ticketNumber}</span>}
                                            <h3 className="font-semibold">{c.intentCategory?.replace(/_/g, " ")}</h3>
                                            <span className={`badge status-${status.toLowerCase()}`}>{status.replace(/_/g, " ")}</span>
                                            <span className={`badge severity-${severity.toLowerCase()}`}>{severity}</span>
                                        </div>
                                        <p className="text-sm text-[var(--color-text-muted)] mb-2 line-clamp-2">{c.transcriptOriginal}</p>
                                        <div className="flex items-center gap-4 text-xs text-[var(--color-text-muted)]">
                                            {c.extractedLandmark && <span>📍 {c.extractedLandmark}</span>}
                                            <span>🕐 {new Date(c.createdAt).toLocaleDateString()}</span>
                                            {c.ticket?.complaintCount > 1 && (
                                                <span className="text-[var(--color-warning)]">👥 {c.ticket.complaintCount} reports</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {c.ticket?.status === "Pending_Verification" && (
                                    <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
                                        <h4 className="font-semibold text-sm mb-2 text-[var(--color-warning)]">Review Resolution</h4>
                                        <p className="text-sm text-[var(--color-text)] mb-3 bg-[var(--color-surface)] p-3 rounded-md">
                                            {c.ticket?.resolutionNotes || "Fix implemented."}
                                        </p>
                                        {c.ticket?.resolutionImageUrl && (
                                            <img src={c.ticket.resolutionImageUrl} alt="Resolution" className="w-full h-48 object-cover rounded-md mb-3" />
                                        )}
                                        <div className="flex items-center gap-3 mt-3">
                                            <button
                                                onClick={() => handleVerify(c.ticket.id, true, prompt("Rate out of 5 stars (1-5):") || 5)}
                                                className="btn-primary text-sm py-2">
                                                ✅ Mark as Resolved
                                            </button>
                                            <button
                                                onClick={() => handleVerify(c.ticket.id, false)}
                                                className="btn-secondary text-sm py-2 bg-red-50 text-red-600 hover:bg-red-100 border-red-200">
                                                ❌ Reject / Disputed
                                            </button>
                                        </div>
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
