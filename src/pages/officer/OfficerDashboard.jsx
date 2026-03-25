import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import DashboardLayout from "../../components/DashboardLayout";
import api from "../../utils/api";
import { getRoleTitle } from "../../config/roleConfig";
import { HiOutlineTicket, HiOutlineUsers, HiOutlineExclamationCircle, HiOutlineChartPie, HiOutlineShieldCheck } from "react-icons/hi";
import { Link } from "react-router-dom";
import DEPARTMENTS from "../../data/departments";

export default function OfficerDashboard() {
    const { userProfile } = useAuth();
    const [tickets, setTickets] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    const mode = userProfile?.mode || "urban";
    const roleTitle = getRoleTitle("officer", mode);
    const deptHeadTitle = getRoleTitle("dept_head", mode);
    const juniorTitle = getRoleTitle("junior", mode);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [ticketsRes, usersRes] = await Promise.all([
                    api.get("/tickets/master"),
                    api.get("/users"),
                ]);
                setTickets(ticketsRes.data || []);
                setUsers(usersRes.data || []);
            } catch (err) {
                console.error("Officer fetch error:", err);
            }
            setLoading(false);
        };
        fetchData();
    }, []);

    const activeTickets = tickets.filter(t => !["Closed", "Invalid_Spam", "Rejected"].includes(t.status));
    const criticalTickets = activeTickets.filter(t => t.severity === "Critical");
    const totalOfficials = users.filter(u => ["junior", "dept_head", "engineer"].includes(u.role));
    const deptHeads = users.filter(u => u.role === "dept_head");
    const juniors = users.filter(u => ["junior", "engineer"].includes(u.role));

    // Department-wise breakdown
    const deptBreakdown = DEPARTMENTS.map(dept => {
        const deptTickets = tickets.filter(t => t.department === dept.id);
        const deptActive = deptTickets.filter(t => !["Closed", "Invalid_Spam", "Rejected"].includes(t.status));
        const deptClosed = deptTickets.filter(t => t.status === "Closed");
        const deptOverdue = deptActive.filter(t => t.slaDeadline && new Date(t.slaDeadline) < new Date());

        // Average resolution time (for closed tickets)
        let avgDays = "—";
        const closedWithTime = deptClosed.filter(t => t.resolvedAt && t.createdAt);
        if (closedWithTime.length > 0) {
            const totalDays = closedWithTime.reduce((sum, t) => {
                return sum + (new Date(t.resolvedAt) - new Date(t.createdAt)) / (1000 * 60 * 60 * 24);
            }, 0);
            avgDays = (totalDays / closedWithTime.length).toFixed(1);
        }

        return {
            ...dept,
            total: deptTickets.length,
            active: deptActive.length,
            overdue: deptOverdue.length,
            resolved: deptClosed.length,
            avgDays,
        };
    }).filter(d => d.total > 0).sort((a, b) => b.active - a.active);

    // Days pending breakdown
    const pendingBreakdown = (() => {
        const buckets = { "0-2 days": 0, "3-7 days": 0, "8-14 days": 0, "15-30 days": 0, "30+ days": 0 };
        activeTickets.forEach(t => {
            const days = Math.floor((Date.now() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60 * 24));
            if (days <= 2) buckets["0-2 days"]++;
            else if (days <= 7) buckets["3-7 days"]++;
            else if (days <= 14) buckets["8-14 days"]++;
            else if (days <= 30) buckets["15-30 days"]++;
            else buckets["30+ days"]++;
        });
        return buckets;
    })();

    const statCards = [
        { label: "Total Tickets", value: tickets.length, icon: <HiOutlineTicket className="text-2xl text-[#6366f1]" />, bg: "from-[#6366f1]/10" },
        { label: "Active Issues", value: activeTickets.length, icon: <HiOutlineChartPie className="text-2xl text-[#f59e0b]" />, bg: "from-[#f59e0b]/10" },
        { label: "Critical Issues", value: criticalTickets.length, icon: <HiOutlineExclamationCircle className="text-2xl text-[#ef4444]" />, bg: "from-[#ef4444]/10", textColor: "#ef4444" },
        { label: "Total Officials", value: totalOfficials.length, icon: <HiOutlineUsers className="text-2xl text-[#06b6d4]" />, bg: "from-[#06b6d4]/10" },
    ];

    return (
        <DashboardLayout title={`${roleTitle} Command Center`} subtitle={`${userProfile?.city || ""} — City-wide Civic Operations`}>
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
                {/* Department Performance Table */}
                <div className="md:col-span-2 animate-fadeInUp">
                    <h2 className="text-lg font-bold mb-4">Department Performance</h2>
                    {loading ? (
                        <div className="flex justify-center py-10"><div className="spinner" /></div>
                    ) : deptBreakdown.length === 0 ? (
                        <div className="card p-6 text-center"><p className="text-[var(--color-text-muted)]">No department data available</p></div>
                    ) : (
                        <div className="card" style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                                <thead>
                                    <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                                        <th style={{ textAlign: "left", padding: "10px 14px", fontWeight: 700, color: "#475569" }}>Department</th>
                                        <th style={{ textAlign: "center", padding: "10px 14px", fontWeight: 700, color: "#475569" }}>Active</th>
                                        <th style={{ textAlign: "center", padding: "10px 14px", fontWeight: 700, color: "#475569" }}>Overdue</th>
                                        <th style={{ textAlign: "center", padding: "10px 14px", fontWeight: 700, color: "#475569" }}>Resolved</th>
                                        <th style={{ textAlign: "center", padding: "10px 14px", fontWeight: 700, color: "#475569" }}>Avg Days</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {deptBreakdown.map(d => (
                                        <tr key={d.id} style={{ borderBottom: "1px solid #f1f5f9", background: d.overdue > 0 ? "#fffbeb" : "transparent" }}>
                                            <td style={{ padding: "10px 14px" }}>
                                                <span style={{ marginRight: 6 }}>{d.icon}</span>
                                                <span style={{ fontWeight: 600 }}>{d.name}</span>
                                            </td>
                                            <td style={{ textAlign: "center", padding: "10px 14px", fontWeight: 600 }}>{d.active}</td>
                                            <td style={{ textAlign: "center", padding: "10px 14px", fontWeight: 600, color: d.overdue > 0 ? "#ef4444" : "#64748b" }}>
                                                {d.overdue > 0 ? `⚠ ${d.overdue}` : "0"}
                                            </td>
                                            <td style={{ textAlign: "center", padding: "10px 14px", color: "#22c55e", fontWeight: 600 }}>{d.resolved}</td>
                                            <td style={{ textAlign: "center", padding: "10px 14px", color: "#64748b" }}>{d.avgDays}d</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Right Panel */}
                <div className="space-y-4 animate-fadeInUp" style={{ animationDelay: "100ms" }}>
                    {/* Pending Days Breakdown */}
                    <h2 className="text-lg font-bold mb-4">Issue Age Breakdown</h2>
                    <div className="card p-4 space-y-3">
                        {Object.entries(pendingBreakdown).map(([label, count]) => {
                            const maxCount = Math.max(...Object.values(pendingBreakdown), 1);
                            const pct = (count / maxCount) * 100;
                            const isOld = label.includes("30+") || label.includes("15-30");
                            return (
                                <div key={label}>
                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                                        <span style={{ fontWeight: 600, color: isOld ? "#ef4444" : "#475569" }}>{label}</span>
                                        <span style={{ fontWeight: 700 }}>{count}</span>
                                    </div>
                                    <div style={{ height: 6, background: "#e2e8f0", borderRadius: 3, overflow: "hidden" }}>
                                        <div style={{ width: `${pct}%`, height: "100%", background: isOld ? "#ef4444" : "#3b82f6", borderRadius: 3, transition: "width 0.5s" }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Command Center Quick Links */}
                    <h2 className="text-lg font-bold mb-2 mt-6">Command Center</h2>

                    <Link to="/officer/tickets" className="block card p-5 hover:bg-[var(--color-surface)] border-[var(--color-primary)]/30 group" style={{ textDecoration: "none", color: "inherit" }}>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-2xl">🎫</span>
                            <span className="text-[var(--color-primary-light)] group-hover:translate-x-1 transition-transform">→</span>
                        </div>
                        <h3 className="font-semibold text-lg mb-1">Manage Tickets</h3>
                        <p className="text-xs text-[var(--color-text-muted)]">View and manage all tickets city-wide</p>
                    </Link>

                    <Link to="/officer/map" className="block card p-5 hover:bg-[var(--color-surface)] border-[var(--color-primary)]/30 group" style={{ textDecoration: "none", color: "inherit" }}>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-2xl">🗺️</span>
                            <span className="text-[var(--color-primary-light)] group-hover:translate-x-1 transition-transform">→</span>
                        </div>
                        <h3 className="font-semibold text-lg mb-1">Live Heatmap</h3>
                        <p className="text-xs text-[var(--color-text-muted)]">Real-time clustering of civic issues</p>
                    </Link>

                    <Link to="/officer/manual-queue" className="block card p-5 hover:bg-[var(--color-surface)] border-[#f59e0b]/30 group" style={{ textDecoration: "none", color: "inherit" }}>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-2xl">📌</span>
                            <span className="text-[#f59e0b] group-hover:translate-x-1 transition-transform">→</span>
                        </div>
                        <h3 className="font-semibold text-lg mb-1">Manual Pin-Drop Queue</h3>
                        <p className="text-xs text-[var(--color-text-muted)]">Resolve NLP geocoding failures</p>
                    </Link>
                </div>
            </div>

            {/* Officials Overview */}
            <div className="mt-8 animate-fadeInUp">
                <h2 className="text-lg font-bold mb-4"><HiOutlineShieldCheck className="inline mr-2" />Officials Overview</h2>
                <div className="grid md:grid-cols-2 gap-4">
                    {/* Dept Heads */}
                    <div className="card p-4">
                        <h3 className="font-semibold text-sm mb-3">{deptHeadTitle}s ({deptHeads.length})</h3>
                        {deptHeads.length === 0 ? (
                            <p className="text-xs text-[var(--color-text-muted)]">No {deptHeadTitle}s registered</p>
                        ) : (
                            <div className="space-y-2">
                                {deptHeads.map(dh => {
                                    const dept = DEPARTMENTS.find(d => d.id === dh.department);
                                    return (
                                        <div key={dh._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #f1f5f9" }}>
                                            <div>
                                                <span style={{ fontWeight: 600, fontSize: 13 }}>{dh.name}</span>
                                                <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: 8 }}>{dept?.name || dh.department}</span>
                                            </div>
                                            <span className={`badge ${dh.active ? "status-open" : "status-closed"}`}>{dh.active ? "Active" : "Locked"}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Juniors Summary */}
                    <div className="card p-4">
                        <h3 className="font-semibold text-sm mb-3">{juniorTitle}s ({juniors.length})</h3>
                        {juniors.length === 0 ? (
                            <p className="text-xs text-[var(--color-text-muted)]">No {juniorTitle}s registered</p>
                        ) : (
                            <div className="space-y-2">
                                {juniors.slice(0, 8).map(j => {
                                    const dept = DEPARTMENTS.find(d => d.id === j.department);
                                    const daysSinceActive = j.lastActiveDate
                                        ? Math.floor((Date.now() - new Date(j.lastActiveDate).getTime()) / (1000 * 60 * 60 * 24))
                                        : "—";
                                    return (
                                        <div key={j._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #f1f5f9" }}>
                                            <div>
                                                <span style={{ fontWeight: 600, fontSize: 13 }}>{j.name}</span>
                                                <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: 8 }}>{dept?.icon || ""} {j.performancePoints ?? 100}pts</span>
                                            </div>
                                            <span style={{ fontSize: 11, color: daysSinceActive > 5 ? "#ef4444" : "#64748b" }}>
                                                {daysSinceActive === "—" ? "—" : `${daysSinceActive}d`}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
