import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import DashboardLayout from "../../components/DashboardLayout";
import api from "../../utils/api";
import { getRoleTitle } from "../../config/roleConfig";
import { HiOutlineTicket, HiOutlineUsers, HiOutlineExclamationCircle, HiOutlineChartPie } from "react-icons/hi";
import { Link } from "react-router-dom";
import DEPARTMENTS from "../../data/departments";

export default function DeptHeadDashboard() {
    const { userProfile } = useAuth();
    const [tickets, setTickets] = useState([]);
    const [juniors, setJuniors] = useState([]);
    const [loading, setLoading] = useState(true);

    const mode = userProfile?.mode || "urban";
    const roleTitle = getRoleTitle("dept_head", mode);
    const juniorTitle = getRoleTitle("junior", mode);
    const deptInfo = DEPARTMENTS.find(d => d.id === userProfile?.department);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [ticketsRes, juniorsRes] = await Promise.all([
                    api.get("/tickets/master"),
                    api.get("/users?role=junior"),
                ]);
                setTickets(ticketsRes.data || []);
                setJuniors(juniorsRes.data || []);
            } catch (err) {
                console.error("DeptHead fetch error:", err);
            }
            setLoading(false);
        };
        fetchData();
    }, []);

    const activeTickets = tickets.filter(t => !["Closed", "Invalid_Spam", "Rejected"].includes(t.status));
    const pendingTickets = activeTickets.filter(t => t.status === "Registered" || t.status === "Open");
    const inProgressTickets = activeTickets.filter(t => t.status === "In_Progress" || t.status === "Assigned");
    const delayedTickets = activeTickets.filter(t => {
        if (!t.slaDeadline) return false;
        return new Date(t.slaDeadline) < new Date();
    });

    const handleAssignJunior = async (ticketId, juniorId) => {
        try {
            await api.put(`/tickets/master/${ticketId}`, {
                assignedJuniorId: juniorId,
                assignedEngineerId: juniorId,
                status: "Assigned",
            });
            // Refresh
            const res = await api.get("/tickets/master");
            setTickets(res.data || []);
        } catch (err) {
            console.error("Assign error:", err);
        }
    };

    const statCards = [
        { label: "Total Cases", value: tickets.length, icon: <HiOutlineTicket className="text-2xl text-[#6366f1]" />, bg: "from-[#6366f1]/10" },
        { label: "Pending Assignment", value: pendingTickets.length, icon: <HiOutlineChartPie className="text-2xl text-[#f59e0b]" />, bg: "from-[#f59e0b]/10" },
        { label: "SLA Breached", value: delayedTickets.length, icon: <HiOutlineExclamationCircle className="text-2xl text-[#ef4444]" />, bg: "from-[#ef4444]/10", textColor: "#ef4444" },
        { label: `Active ${juniorTitle}s`, value: juniors.length, icon: <HiOutlineUsers className="text-2xl text-[#06b6d4]" />, bg: "from-[#06b6d4]/10" },
    ];

    return (
        <DashboardLayout title={`${roleTitle} Dashboard`} subtitle={deptInfo ? `${deptInfo.icon} ${deptInfo.name} — ${userProfile?.city || ""}` : "Department Operations"}>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 stagger">
                {statCards.map((s, i) => (
                    <div key={i} className={`stat-card bg-gradient-to-br ${s.bg} to-transparent animate-fadeInUp`}>
                        <div className="flex items-center justify-between mb-3">
                            {s.icon}
                            <span className="text-2xl font-bold" style={s.textColor ? { color: s.textColor } : {}}>{loading ? "—" : s.value}</span>
                        </div>
                        <p className="text-xs text-[var(--color-text-muted)] font-medium">{s.label}</p>
                    </div>
                ))}
            </div>

            <div className="grid md:grid-cols-3 gap-8">
                {/* Junior Performance Table */}
                <div className="md:col-span-2 animate-fadeInUp">
                    <h2 className="text-lg font-bold mb-4">{juniorTitle} Performance</h2>
                    {loading ? (
                        <div className="flex justify-center py-10"><div className="spinner" /></div>
                    ) : juniors.length === 0 ? (
                        <div className="card p-6 text-center"><p className="text-[var(--color-text-muted)]">No {juniorTitle}s found in your department</p></div>
                    ) : (
                        <div className="card" style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                                <thead>
                                    <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                                        <th style={{ textAlign: "left", padding: "10px 14px", fontWeight: 700, color: "#475569" }}>Name</th>
                                        <th style={{ textAlign: "center", padding: "10px 14px", fontWeight: 700, color: "#475569" }}>Active Tickets</th>
                                        <th style={{ textAlign: "center", padding: "10px 14px", fontWeight: 700, color: "#475569" }}>Points</th>
                                        <th style={{ textAlign: "center", padding: "10px 14px", fontWeight: 700, color: "#475569" }}>Last Active</th>
                                        <th style={{ textAlign: "center", padding: "10px 14px", fontWeight: 700, color: "#475569" }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {juniors.map(j => {
                                        const jTickets = tickets.filter(t =>
                                            (t.assignedJuniorId?._id || t.assignedJuniorId || t.assignedEngineerId?._id || t.assignedEngineerId) === j._id &&
                                            !["Closed", "Rejected"].includes(t.status)
                                        );
                                        const daysSinceActive = j.lastActiveDate
                                            ? Math.floor((Date.now() - new Date(j.lastActiveDate).getTime()) / (1000 * 60 * 60 * 24))
                                            : "—";
                                        const isDelayed = daysSinceActive > 5;

                                        return (
                                            <tr key={j._id} style={{ borderBottom: "1px solid #f1f5f9", background: isDelayed ? "#fef2f2" : "transparent" }}>
                                                <td style={{ padding: "10px 14px" }}>
                                                    <div style={{ fontWeight: 600, color: "#1e293b" }}>{j.name}</div>
                                                    <div style={{ fontSize: 11, color: "#94a3b8" }}>{j.email}</div>
                                                </td>
                                                <td style={{ textAlign: "center", padding: "10px 14px", fontWeight: 600 }}>{jTickets.length}</td>
                                                <td style={{ textAlign: "center", padding: "10px 14px" }}>
                                                    <span style={{
                                                        fontWeight: 700,
                                                        color: (j.performancePoints || 0) > 50 ? "#22c55e" : (j.performancePoints || 0) > 20 ? "#f59e0b" : "#ef4444"
                                                    }}>{j.performancePoints ?? 100}</span>
                                                </td>
                                                <td style={{ textAlign: "center", padding: "10px 14px", fontSize: 12, color: isDelayed ? "#ef4444" : "#64748b" }}>
                                                    {daysSinceActive === "—" ? "—" : `${daysSinceActive}d ago`}
                                                    {isDelayed && <span style={{ display: "block", fontSize: 10, color: "#ef4444", fontWeight: 600 }}>⚠ INACTIVE</span>}
                                                </td>
                                                <td style={{ textAlign: "center", padding: "10px 14px" }}>
                                                    <span className={`badge ${j.active ? "status-open" : "status-closed"}`}>
                                                        {j.active ? "Active" : "Locked"}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Pending Cases + Actions */}
                <div className="space-y-4 animate-fadeInUp" style={{ animationDelay: "100ms" }}>
                    <h2 className="text-lg font-bold mb-4">Pending Assignment</h2>
                    {pendingTickets.length === 0 ? (
                        <div className="card p-6 text-center"><p className="text-sm text-[var(--color-text-muted)]">All cases assigned!</p></div>
                    ) : (
                        pendingTickets.slice(0, 6).map(t => (
                            <div key={t._id || t.id} className="card p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-semibold text-sm">{(t.primaryCategory || "").replace(/_/g, " ")}</span>
                                    <span className={`badge severity-${(t.severity || "low").toLowerCase()}`}>{t.severity}</span>
                                </div>
                                <p className="text-xs text-[var(--color-text-muted)] mb-3">{t.description?.substring(0, 60) || "—"}</p>
                                <select
                                    style={{ width: "100%", padding: "6px 10px", fontSize: 12, border: "1px solid #cbd5e1", borderRadius: 6, background: "#f8fafc" }}
                                    defaultValue=""
                                    onChange={(e) => { if (e.target.value) handleAssignJunior(t._id || t.id, e.target.value); }}
                                >
                                    <option value="">Assign to {juniorTitle}...</option>
                                    {juniors.filter(j => j.active).map(j => (
                                        <option key={j._id} value={j._id}>{j.name} ({j.performancePoints ?? 100}pts)</option>
                                    ))}
                                </select>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* SLA Breached Cases */}
            {delayedTickets.length > 0 && (
                <div className="mt-8 animate-fadeInUp">
                    <h2 className="text-lg font-bold mb-4" style={{ color: "#ef4444" }}>⚠ SLA Breached Cases ({delayedTickets.length})</h2>
                    <div className="space-y-3">
                        {delayedTickets.slice(0, 5).map(t => {
                            const assignee = t.assignedJuniorId || t.assignedEngineerId;
                            const assigneeName = typeof assignee === "object" ? assignee?.name : "Unassigned";
                            const daysOverdue = Math.floor((Date.now() - new Date(t.slaDeadline).getTime()) / (1000 * 60 * 60 * 24));
                            return (
                                <div key={t._id || t.id} className="card p-4" style={{ borderLeft: "4px solid #ef4444" }}>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className="font-semibold text-sm">{(t.primaryCategory || "").replace(/_/g, " ")}</span>
                                            <p className="text-xs text-[#ef4444] mt-1">{daysOverdue} days overdue — Assigned: {assigneeName}</p>
                                        </div>
                                        <span className="badge" style={{ background: "#fecaca", color: "#991b1b" }}>{daysOverdue}d late</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
