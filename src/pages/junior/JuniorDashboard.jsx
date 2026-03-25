import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import DashboardLayout from "../../components/DashboardLayout";
import api from "../../utils/api";
import { getRoleTitle } from "../../config/roleConfig";
import { HiOutlineCog, HiOutlineClock, HiOutlineCheckCircle, HiOutlineLocationMarker } from "react-icons/hi";
import DEPARTMENTS from "../../data/departments";

export default function JuniorDashboard() {
    const { userProfile } = useAuth();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);

    const mode = userProfile?.mode || "urban";
    const roleTitle = getRoleTitle("junior", mode);

    useEffect(() => {
        const fetchTickets = async () => {
            try {
                const res = await api.get("/tickets/master");
                const data = res.data || [];
                setTickets(data);
            } catch (err) {
                console.error("Failed to fetch tickets:", err);
            }
            setLoading(false);
        };
        fetchTickets();
    }, []);

    const myTickets = tickets.filter(t =>
        (t.assignedJuniorId?._id || t.assignedJuniorId) === userProfile?._id ||
        (t.assignedEngineerId?._id || t.assignedEngineerId) === userProfile?._id
    );
    const unassigned = tickets.filter(t => !t.assignedJuniorId && !t.assignedEngineerId);

    const active = myTickets.filter(t => !["Closed", "Rejected", "Invalid_Spam"].includes(t.status));
    const inProgress = myTickets.filter(t => t.status === "In_Progress");
    const pending = myTickets.filter(t => t.status === "Pending_Verification");
    const resolved = myTickets.filter(t => t.status === "Closed");

    const deptInfo = DEPARTMENTS.find(d => d.id === userProfile?.department);

    const statCards = [
        { label: "Assigned to Me", value: myTickets.length, icon: <HiOutlineCog className="text-2xl text-[#6366f1]" />, bg: "from-[#6366f1]/10" },
        { label: "In Progress", value: inProgress.length, icon: <HiOutlineClock className="text-2xl text-[#f59e0b]" />, bg: "from-[#f59e0b]/10" },
        { label: "Pending Verification", value: pending.length, icon: <HiOutlineLocationMarker className="text-2xl text-[#f97316]" />, bg: "from-[#f97316]/10" },
        { label: "Resolved", value: resolved.length, icon: <HiOutlineCheckCircle className="text-2xl text-[#22c55e]" />, bg: "from-[#22c55e]/10" },
    ];

    return (
        <DashboardLayout title={`${roleTitle} Dashboard`} subtitle={deptInfo ? `${deptInfo.icon} ${deptInfo.name}` : "Field Operations"}>
            {/* Performance Points Bar */}
            <div style={{
                background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8,
                padding: "12px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 16
            }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Performance Points:</span>
                <div style={{ flex: 1, height: 8, background: "#e2e8f0", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{
                        width: `${userProfile?.performancePoints || 0}%`, height: "100%",
                        background: (userProfile?.performancePoints || 0) > 50 ? "#22c55e" : (userProfile?.performancePoints || 0) > 20 ? "#f59e0b" : "#ef4444",
                        borderRadius: 4, transition: "width 0.5s ease"
                    }} />
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>{userProfile?.performancePoints ?? 100}/100</span>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 stagger">
                {statCards.map((s, i) => (
                    <div key={i} className={`stat-card bg-gradient-to-br ${s.bg} to-transparent animate-fadeInUp`}>
                        <div className="flex items-center justify-between mb-3">
                            {s.icon}
                            <span className="text-2xl font-bold">{loading ? "—" : s.value}</span>
                        </div>
                        <p className="text-xs text-[var(--color-text-muted)] font-medium">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Active Tickets */}
            <div className="space-y-4 animate-fadeInUp">
                <h2 className="text-lg font-bold mb-4">My Active Tickets</h2>
                {loading ? (
                    <div className="flex justify-center py-10"><div className="spinner" /></div>
                ) : active.length === 0 ? (
                    <div className="card p-8 text-center">
                        <p className="text-[var(--color-text-muted)]">No active tickets assigned. Great job!</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {active.map(t => (
                            <Link to={`/junior/resolve/${t._id || t.id}`} key={t._id || t.id}
                                className="card p-4 flex items-center justify-between hover:bg-[var(--color-surface)] cursor-pointer" style={{ textDecoration: "none", color: "inherit" }}>
                                <div>
                                    <div className="flex gap-2 items-center mb-1">
                                        <span className="font-semibold text-sm">{(t.primaryCategory || t.intentCategory || "").replace(/_/g, " ")}</span>
                                        <span className={`badge status-${(t.status || "open").toLowerCase().replace(/_/g, "-")}`}>{(t.status || "").replace(/_/g, " ")}</span>
                                    </div>
                                    <p className="text-xs text-[var(--color-text-muted)] truncate max-w-sm">{t.description?.substring(0, 80) || t.landmark || "No description"}</p>
                                </div>
                                <div className="text-right">
                                    <div style={{
                                        width: 48, height: 48, borderRadius: "50%",
                                        background: `conic-gradient(#3b82f6 ${(t.progressPercent || 0) * 3.6}deg, #e2e8f0 0deg)`,
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                    }}>
                                        <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>
                                            {t.progressPercent || 0}%
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* Unassigned Tickets in Department */}
            {unassigned.length > 0 && (
                <div className="space-y-4 animate-fadeInUp mt-8">
                    <h2 className="text-lg font-bold mb-4">Unassigned in My Department ({unassigned.length})</h2>
                    <div className="space-y-3">
                        {unassigned.slice(0, 5).map(t => (
                            <div key={t._id || t.id} className="card p-4 flex items-center justify-between opacity-75">
                                <div>
                                    <span className="font-semibold text-sm">{(t.primaryCategory || "").replace(/_/g, " ")}</span>
                                    <p className="text-xs text-[var(--color-text-muted)] mt-1">{t.description?.substring(0, 60) || "—"}</p>
                                </div>
                                <span className={`badge severity-${(t.severity || "low").toLowerCase()}`}>{t.severity}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
