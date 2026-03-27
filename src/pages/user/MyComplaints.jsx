import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../../components/DashboardLayout";
import api from "../../utils/api";
import { TICKET_STATUSES } from "../../data/departments";
import toast from "react-hot-toast";
import { HiOutlineShieldCheck, HiArrowRight, HiOutlineSearchCircle, HiOutlineLocationMarker, HiOutlineLightBulb, HiOutlineBeaker, HiOutlineTrash, HiOutlineDocumentText, HiOutlinePhone } from "react-icons/hi";

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
        const catMap = {
            Pothole: <HiOutlineLocationMarker />, Road_Damage: <HiOutlineLocationMarker />,
            Streetlight: <HiOutlineLightBulb />, Power_Outage: <HiOutlineLightBulb />,
            Water_Leak: <HiOutlineBeaker />, No_Water: <HiOutlineBeaker />,
            Garbage: <HiOutlineTrash />, Sewage_Overflow: <HiOutlineBeaker />,
            Traffic_Signal: <HiOutlineLightBulb />, Fire_Hazard: <HiOutlineLightBulb />,
            Noise_Complaint: <HiOutlineDocumentText />, Hospital_Issue: <HiOutlineDocumentText />,
            Tree_Felling: <HiOutlineDocumentText />,
        };
        return catMap[cat] || <HiOutlineDocumentText />;
    };

    return (
        <DashboardLayout title="My Complaints" subtitle="Track all your submitted complaints">
            {/* ── Anti-Corruption Banner ── */}
            <div className="mb-6 bg-white rounded p-5 flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4 border border-[var(--color-border)] shadow-sm animate-fadeInUp">
                <div className="flex items-center gap-4 text-[var(--color-text)]">
                    <div className="w-12 h-12 rounded bg-green-50 flex items-center justify-center flex-shrink-0 border border-green-100">
                        <HiOutlineShieldCheck className="text-2xl text-green-600" />
                    </div>
                    <div>
                        <h4 className="font-bold text-base text-[var(--color-text)]">Looking for an Anti-Corruption Report?</h4>
                        <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
                            For your safety, corruption reports are <strong className="text-green-600 font-semibold">100% anonymous</strong> and are NOT linked to this dashboard.
                            You must use your 16-digit Secure Token to track them.
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => window.location.href = '/citizen/track-report'}
                    className="flex-shrink-0 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded transition-colors shadow-sm flex items-center gap-2"
                >
                    Track Secure Report <HiArrowRight />
                </button>
            </div>

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
                    <HiOutlineSearchCircle className="text-4xl mb-3 mx-auto text-[var(--color-primary)] opacity-50" />
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
                                    <div className="w-12 h-12 rounded bg-[var(--color-primary)]/10 flex items-center justify-center text-2xl flex-shrink-0 text-[var(--color-primary)]">
                                        {getCategoryIcon(category)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                            {c.ticket?.ticketNumber && <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded-sm">{c.ticket.ticketNumber}</span>}
                                            <h3 className="font-semibold">{category?.replace(/_/g, " ")}</h3>
                                            <span className={`badge status-${status.toLowerCase()}`}>{status.replace(/_/g, " ")}</span>
                                            <span className={`badge severity-${severity.toLowerCase()}`}>{severity}</span>
                                            {c.ticket?.source === 'voice_call' && <span className="badge bg-purple-100 text-purple-700 flex items-center gap-1"><HiOutlinePhone /> Voice</span>}
                                        </div>
                                        <p className="text-sm text-[var(--color-text-muted)] mb-2 line-clamp-2">{c.transcriptOriginal}</p>

                                        {/* LOCATION & DATE INFO */}
                                        <div className="flex items-center gap-4 text-xs text-[var(--color-text-muted)]">
                                            {c.extractedLandmark && <span>📍 {c.extractedLandmark}</span>}
                                            {c.ticket?.locality && <span>🏘️ {c.ticket.locality}</span>}
                                            {c.ticket?.wardNumber && <span>🏛️ Ward {c.ticket.wardNumber}</span>}
                                            <span>🕐 {new Date(c.createdAt).toLocaleDateString()}</span>
                                            {c.ticket?.complaintCount > 1 && (
                                                <span className="text-[var(--color-warning)]">👥 {c.ticket.complaintCount} reports</span>
                                            )}
                                        </div>

                                        {/* ═══ DEPARTMENT & LEVEL INFO - PROMINENT DISPLAY ═══ */}
                                        <div className="mt-3 p-3 rounded-lg border-2" style={{
                                            backgroundColor: c.ticket?.level === 1 ? '#f0fdf4' : c.ticket?.level === 2 ? '#fefce8' : c.ticket?.level === 3 ? '#fff7ed' : '#fef2f2',
                                            borderColor: c.ticket?.level === 1 ? '#22c55e' : c.ticket?.level === 2 ? '#eab308' : c.ticket?.level === 3 ? '#f97316' : '#ef4444'
                                        }}>
                                            <div className="flex flex-wrap items-center gap-3">
                                                {/* DEPARTMENT */}
                                                <div className="flex items-center gap-1">
                                                    <span className="text-lg">🏢</span>
                                                    <div>
                                                        <span className="text-xs text-gray-500">Department</span>
                                                        <p className="font-bold text-sm uppercase" style={{ color: c.ticket?.level === 1 ? '#166534' : c.ticket?.level === 2 ? '#854d0e' : c.ticket?.level === 3 ? '#9a3412' : '#991b1b' }}>
                                                            {c.ticket?.department || 'municipal'}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* LEVEL */}
                                                <div className="flex items-center gap-1 px-3 py-1 rounded-full" style={{ backgroundColor: c.ticket?.level === 1 ? '#dcfce7' : c.ticket?.level === 2 ? '#fef9c3' : c.ticket?.level === 3 ? '#ffedd5' : '#fecaca' }}>
                                                    <span className="text-xs text-gray-600">Level</span>
                                                    <span className="font-bold text-lg" style={{ color: c.ticket?.level === 1 ? '#166534' : c.ticket?.level === 2 ? '#854d0e' : c.ticket?.level === 3 ? '#9a3412' : '#991b1b' }}>
                                                        {c.ticket?.level || 1}
                                                    </span>
                                                </div>

                                                {/* RESPONSIBLE AUTHORITY */}
                                                <div className="flex items-center gap-1">
                                                    <span className="text-lg">👤</span>
                                                    <div>
                                                        <span className="text-xs text-gray-500">Responsible Authority</span>
                                                        <p className="font-semibold text-sm">
                                                            {c.ticket?.level === 1 ? 'Junior Engineer' :
                                                                c.ticket?.level === 2 ? 'Dept Head / BDO' :
                                                                    c.ticket?.level === 3 ? 'Officer / Commissioner' :
                                                                        'Top Authority / SDM'}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* VIEW IMPLEMENTATION PLAN LINK */}
                                                {c.ticket?._id && (
                                                    <Link
                                                        to={`/citizen/plan/${c.ticket._id}`}
                                                        className="ml-auto px-3 py-1.5 rounded-md text-xs font-semibold"
                                                        style={{ backgroundColor: '#1e3a8a', color: '#fff' }}
                                                    >
                                                        📋 View Plan
                                                    </Link>
                                                )}
                                            </div>
                                        </div>

                                        {/* ─── Assigned Official + Responsibility Info ─── */}
                                        {(() => {
                                            const ticket = c.ticket;
                                            if (!ticket) return null;
                                            const level = ticket.level;
                                            const assigned = ticket.assignedJuniorId || ticket.assignedEngineerId;
                                            const approver = ticket.approvedBy;
                                            const isPending = ticket.isApproved === null;
                                            const levelLabels = {
                                                1: { role: 'Junior Engineer / Gramsevak', color: 'green' },
                                                2: { role: 'Dept Head / BDO', color: 'yellow' },
                                                3: { role: 'Officer / Commissioner', color: 'orange' },
                                                4: { role: 'Top Authority / SDM / Mayor', color: 'red' },
                                            };
                                            const levelInfo = levelLabels[level] || levelLabels[1];

                                            return (
                                                <div className="mt-2 space-y-1.5">
                                                    {/* Responsible Authority per Level */}
                                                    <div className={`text-xs px-3 py-1.5 rounded-md bg-${levelInfo.color}-50 text-${levelInfo.color}-800 border border-${levelInfo.color}-100`}
                                                        style={{
                                                            backgroundColor: level === 1 ? '#f0fdf4' : level === 2 ? '#fefce8' : level === 3 ? '#fff7ed' : '#fef2f2',
                                                            color: level === 1 ? '#166534' : level === 2 ? '#854d0e' : level === 3 ? '#9a3412' : '#991b1b',
                                                            borderColor: level === 1 ? '#bbf7d0' : level === 2 ? '#fef08a' : level === 3 ? '#fed7aa' : '#fecaca'
                                                        }}>
                                                        <strong>Level {level} →</strong> Responsible: <strong>{levelInfo.role}</strong>
                                                        {isPending && level >= 2 && ` (⏳ Awaiting ${level === 2 ? 'Dept Head' : 'Officer'} approval)`}
                                                    </div>

                                                    {/* Assigned Engineer with Phone */}
                                                    {assigned && (
                                                        <div className="flex items-center gap-3 text-xs px-3 py-2 rounded-md border"
                                                            style={{ backgroundColor: '#eff6ff', borderColor: '#bfdbfe', color: '#1e40af' }}>
                                                            <span className="font-bold">👷 Assigned Engineer:</span>
                                                            <span className="font-semibold">{assigned.name || 'Official'}</span>
                                                            {assigned.phone && <span>📞 {assigned.phone}</span>}
                                                            {assigned.department && <span>• {assigned.department}</span>}
                                                            {assigned.role && <span className="opacity-60">({assigned.role})</span>}
                                                        </div>
                                                    )}

                                                    {/* Approving Officer with Phone (for Level 2+) */}
                                                    {approver && typeof approver === 'object' && (
                                                        <div className="flex items-center gap-3 text-xs px-3 py-2 rounded-md border"
                                                            style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', color: '#166534' }}>
                                                            <span className="font-bold">✅ Approved by:</span>
                                                            <span className="font-semibold">{approver.name}</span>
                                                            {approver.phone && <span>📞 {approver.phone}</span>}
                                                            {approver.department && <span>• {approver.department}</span>}
                                                            {approver.role && <span className="opacity-60">({approver.role})</span>}
                                                        </div>
                                                    )}

                                                    {/* Pending: not assigned, waiting for approval */}
                                                    {isPending && !assigned && (
                                                        <div className="text-xs px-3 py-2 rounded-md border"
                                                            style={{ backgroundColor: '#fffbeb', borderColor: '#fde68a', color: '#92400e' }}>
                                                            ⏳ Awaiting approval from <strong>{level === 2 ? 'Dept Head / BDO' : level === 3 ? 'Officer / Commissioner' : 'Top Authority / SDM'}</strong> before a junior engineer is assigned
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}
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
