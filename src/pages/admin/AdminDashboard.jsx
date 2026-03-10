import { useState, useEffect } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import api from "../../utils/api";
import { HiOutlineChartPie, HiOutlineUsers, HiOutlineTicket, HiOutlineExclamationCircle } from "react-icons/hi";
import { Link } from "react-router-dom";

export default function AdminDashboard() {
    const [stats, setStats] = useState({ total: 0, open: 0, critical: 0, users: 0 });
    const [recentTickets, setRecentTickets] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const [ticketsRes, usersRes] = await Promise.all([
                    api.get('/tickets/master'),
                    api.get('/users')
                ]);

                const ticketsSnap = ticketsRes.data;
                const usersSnap = usersRes.data;

                let total = ticketsSnap.length, open = 0, critical = 0;
                ticketsSnap.forEach(t => {
                    if (t.status !== "Closed") open++;
                    if (t.severity === "Critical" && t.status !== "Closed") critical++;
                });

                setStats({ total, open, critical, users: usersSnap.length });
                setRecentTickets(ticketsSnap.slice(0, 5));
            } catch (err) {
                console.error("Dashboard fetch error:", err);
            }
            setLoading(false);
        };
        fetchDashboard();
    }, []);

    return (
        <DashboardLayout title="Senior Officer Dashboard" subtitle="City-wide Civic Operations Center">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 stagger">
                <div className="stat-card bg-gradient-to-br from-[#6366f1]/10 to-transparent animate-fadeInUp">
                    <div className="flex items-center justify-between mb-3">
                        <HiOutlineTicket className="text-2xl text-[#6366f1]" />
                        <span className="text-2xl font-bold">{loading ? "—" : stats.total}</span>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] font-medium">Total Tickets</p>
                </div>
                <div className="stat-card bg-gradient-to-br from-[#f59e0b]/10 to-transparent animate-fadeInUp">
                    <div className="flex items-center justify-between mb-3">
                        <HiOutlineChartPie className="text-2xl text-[#f59e0b]" />
                        <span className="text-2xl font-bold">{loading ? "—" : stats.open}</span>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] font-medium">Active Issues</p>
                </div>
                <div className="stat-card bg-gradient-to-br from-[#ef4444]/10 border-[#ef4444]/20 animate-fadeInUp">
                    <div className="flex items-center justify-between mb-3">
                        <HiOutlineExclamationCircle className="text-2xl text-[#ef4444]" />
                        <span className="text-2xl font-bold text-[#ef4444]">{loading ? "—" : stats.critical}</span>
                    </div>
                    <p className="text-xs text-[#f87171] font-medium">Critical Issues</p>
                </div>
                <div className="stat-card bg-gradient-to-br from-[#06b6d4]/10 to-transparent animate-fadeInUp">
                    <div className="flex items-center justify-between mb-3">
                        <HiOutlineUsers className="text-2xl text-[#06b6d4]" />
                        <span className="text-2xl font-bold">{loading ? "—" : stats.users}</span>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] font-medium">Registered Users</p>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-4 animate-fadeInUp">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-bold">Live Ticket Feed</h2>
                        <Link to="/admin/tickets" className="text-sm text-[var(--color-primary-light)] hover:underline">View All →</Link>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-10"><div className="spinner" /></div>
                    ) : (
                        <div className="space-y-3">
                            {recentTickets.map(t => (
                                <div key={t.id} className="card p-4 flex items-center justify-between hover:bg-[var(--color-surface)]">
                                    <div>
                                        <div className="flex gap-2 items-center mb-1">
                                            <span className="font-semibold text-sm">{t.intentCategory?.replace(/_/g, " ")}</span>
                                            <span className={`badge status-${(t.status || "open").toLowerCase()}`}>{t.status}</span>
                                        </div>
                                        <p className="text-xs text-[var(--color-text-muted)] truncate max-w-sm">{t.landmark || "Coordinates pinned"}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className={`badge severity-${(t.severity || "low").toLowerCase()}`}>{t.severity}</span>
                                        <p className="text-[10px] text-[var(--color-text-muted)] mt-1">{t.complaintCount} reports</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="space-y-4 animate-fadeInUp" style={{ animationDelay: "100ms" }}>
                    <h2 className="text-lg font-bold mb-4">Command Center</h2>

                    <Link to="/admin/map" className="block card p-5 hover:bg-[var(--color-surface)] border-[var(--color-primary)]/30 group">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-2xl">🗺️</span>
                            <span className="text-[var(--color-primary-light)] group-hover:translate-x-1 transition-transform">→</span>
                        </div>
                        <h3 className="font-semibold text-lg mb-1">Live Heatmap</h3>
                        <p className="text-xs text-[var(--color-text-muted)]">View real-time clustering of civic issues across the city.</p>
                    </Link>

                    <Link to="/admin/manual-queue" className="block card p-5 hover:bg-[var(--color-surface)] border-[#f59e0b]/30 group">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-2xl">📌</span>
                            <span className="text-[#f59e0b] group-hover:translate-x-1 transition-transform">→</span>
                        </div>
                        <h3 className="font-semibold text-lg mb-1">Manual Pin-Drop Queue</h3>
                        <p className="text-xs text-[var(--color-text-muted)]">Resolve NLP geocoding failures by listening to audio.</p>
                    </Link>
                </div>
            </div>
        </DashboardLayout>
    );
}
