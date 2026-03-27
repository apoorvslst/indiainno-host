import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import DashboardLayout from "../../components/DashboardLayout";
import api from "../../utils/api";
import { HiOutlineCog, HiOutlineClock, HiOutlineCheckCircle, HiOutlineLocationMarker, HiOutlinePhone, HiOutlineOfficeBuilding, HiOutlineRefresh, HiOutlineLightBulb, HiOutlineBeaker, HiOutlineTrash, HiOutlineFire, HiOutlineLibrary, HiOutlineDocumentText } from "react-icons/hi";
import DEPARTMENTS from "../../data/departments";

export default function EngineerDashboard() {
    const { user, userProfile } = useAuth();
    const [tickets, setTickets] = useState([]);
    const [stats, setStats] = useState({ assigned: 0, pending: 0, resolved: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTickets = async () => {
            try {
                const { data } = await api.get('/tickets/master');

                // Process manually
                let assigned = 0, pending = 0, resolved = 0;
                const myTickets = data.filter(t => {
                    if (t.status === "Closed") {
                        if (t.assignedEngineerId?._id === user.uid || t.assignedEngineerId === user.uid) resolved++;
                        return false;
                    }
                    if (t.status === "Pending_Verification") pending++;

                    if (t.assignedEngineerId?._id === user.uid || t.assignedEngineerId === user.uid || !t.assignedEngineerId) {
                        if (t.status !== "Pending_Verification") assigned++;
                        return true;
                    }
                    return false;
                });

                setStats({ assigned, pending, resolved });
                setTickets(myTickets);
            } catch (err) {
                console.error("Error fetching tickets:", err);
            }
            setLoading(false);
        };
        fetchTickets();
    }, [userProfile, user]);

    const deptName = DEPARTMENTS.find(d => d.id === userProfile?.department)?.name || "Unknown Department";

    return (
        <DashboardLayout title="Engineer Dashboard" subtitle={`${deptName} | Trust Score: ${userProfile?.trustScore || 100}/100`}>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 stagger">
                <div className="stat-card bg-gradient-to-br from-[#8b5cf6]/10 to-transparent animate-fadeInUp">
                    <div className="flex items-center justify-between mb-3">
                        <HiOutlineCog className="text-2xl text-[#8b5cf6]" />
                        <span className="text-2xl font-bold">{stats.assigned}</span>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] font-medium">To Do</p>
                </div>
                <div className="stat-card bg-gradient-to-br from-[#f59e0b]/10 to-transparent animate-fadeInUp">
                    <div className="flex items-center justify-between mb-3">
                        <HiOutlineClock className="text-2xl text-[#f59e0b]" />
                        <span className="text-2xl font-bold">{stats.pending}</span>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] font-medium">Awaiting Verification</p>
                </div>
                <div className="stat-card bg-gradient-to-br from-[#22c55e]/10 to-transparent animate-fadeInUp">
                    <div className="flex items-center justify-between mb-3">
                        <HiOutlineCheckCircle className="text-2xl text-[#22c55e]" />
                        <span className="text-2xl font-bold">{stats.resolved}</span>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] font-medium">Resolved (Lifetime)</p>
                </div>
            </div>

            {/* Ticket List */}
            <h2 className="text-lg font-semibold mb-4 animate-fadeInUp">Active Tasks</h2>
            {loading ? (
                <div className="flex justify-center py-16"><div className="spinner" /></div>
            ) : tickets.length === 0 ? (
                <div className="card text-center py-16 animate-fadeInUp flex flex-col items-center">
                    <HiOutlineCheckCircle className="text-4xl mb-3 text-[var(--color-primary)] opacity-50" />
                    <p className="text-[var(--color-text-muted)]">No active tickets for your department. All clear!</p>
                </div>
            ) : (
                <div className="grid gap-4 stagger">
                    {tickets.map(t => {
                        const category = t.primaryCategory || t.intentCategory;
                        return (
                            <div key={t.id} className="card animate-fadeInUp hover:bg-[var(--color-card-hover)] flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded bg-[var(--color-surface)] flex items-center justify-center text-2xl flex-shrink-0 border border-[var(--color-border)] text-[var(--color-primary)]">
                                        {category === "Pothole" ? <HiOutlineLocationMarker /> :
                                            category === "Streetlight" ? <HiOutlineLightBulb /> :
                                                category === "Water_Leak" ? <HiOutlineBeaker /> :
                                                    category === "Garbage" ? <HiOutlineTrash /> :
                                                        category === "Fire_Hazard" ? <HiOutlineFire /> :
                                                            category === "Building_Safety" ? <HiOutlineOfficeBuilding /> :
                                                                category === "Sewage_Overflow" ? <HiOutlineBeaker /> :
                                                                    <HiOutlineDocumentText />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                            {t.ticketNumber && <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded-sm">{t.ticketNumber}</span>}
                                            <h3 className="font-semibold text-lg">{category?.replace(/_/g, " ")}</h3>
                                            <span className={`badge severity-${(t.severity || "low").toLowerCase()}`}>{t.severity || "Low"} Priority</span>
                                            <span className={`badge status-${(t.status || "open").toLowerCase()}`}>{t.status || "Open"}</span>
                                            {t.source === 'voice_call' && <span className="badge bg-purple-100 text-purple-700 flex items-center gap-1"><HiOutlinePhone className="text-sm" /> Voice</span>}
                                            {t.level && (
                                                <span className={`badge ${t.level === 1 ? 'bg-green-100 text-green-700' : t.level === 2 ? 'bg-yellow-100 text-yellow-700' : t.level === 3 ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                                                    L{t.level}
                                                </span>
                                            )}
                                        </div>

                                        {/* DEPARTMENT & LEVEL INFO - PROMINENT */}
                                        <div className="flex flex-wrap items-center gap-2 mb-2">
                                            <span className="px-2 py-1 flex items-center gap-1 rounded-md text-xs font-bold uppercase" style={{
                                                backgroundColor: t.department === 'fire' ? '#fee2e2' : t.department === 'health' ? '#fef3c7' : t.department === 'water_supply' ? '#dbeafe' : t.department === 'electricity' ? '#fef3c7' : t.department === 'pwd' ? '#e5e7eb' : '#f0fdf4',
                                                color: t.department === 'fire' ? '#991b1b' : t.department === 'health' ? '#92400e' : t.department === 'water_supply' ? '#1e40af' : t.department === 'electricity' ? '#92400e' : t.department === 'pwd' ? '#374151' : '#166534'
                                            }}>
                                                <HiOutlineOfficeBuilding /> {t.department || 'municipal'}
                                            </span>
                                            <span className="text-xs text-[var(--color-text-muted)]">
                                                Level {t.level || 1} → {t.level === 1 ? 'Junior Engineer' : t.level === 2 ? 'Dept Head' : t.level === 3 ? 'Officer' : 'Top Authority'}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-4 text-sm text-[var(--color-text-muted)] mb-2 group">
                                            <span className="flex items-center gap-1">
                                                <HiOutlineLocationMarker className="text-[var(--color-primary)]" />
                                                {t.landmark || t.locality || "Coordinates Only"}
                                            </span>
                                            {t.wardNumber && <span className="flex items-center gap-1"><HiOutlineLibrary /> Ward {t.wardNumber}</span>}
                                            {t.lat && t.lng && (
                                                <a
                                                    href={`https://www.google.com/maps/dir/?api=1&destination=${t.lat},${t.lng}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-[var(--color-primary-light)] hover:underline opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                                                >
                                                    Directions ↗
                                                </a>
                                            )}
                                        </div>
                                        <p className="text-xs text-[var(--color-text-muted)]">
                                            Reported {new Date(t.createdAt).toLocaleString()} • {t.complaintCount || 1} citizens affected
                                            {t.actionHistory?.length > 0 && ` • ${t.actionHistory.length} updates`}
                                        </p>
                                    </div>
                                </div>

                                <div className="md:text-right flex-shrink-0">
                                    {t.status === "Pending_Verification" ? (
                                        <button className="btn-secondary" disabled>Awaiting Citizen Check</button>
                                    ) : (t.status === "Disputed" || t.status === "Reopened") ? (
                                        <div className="space-y-2">
                                            {(t.reComplaintRemark || t.citizenFeedbackText) && (
                                                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-left">
                                                    <p className="text-xs font-semibold text-red-600 mb-1 flex items-center gap-1"><HiOutlineRefresh /> Citizen Re-complaint</p>
                                                    <p className="text-sm text-red-800">{t.reComplaintRemark || t.citizenFeedbackText}</p>
                                                </div>
                                            )}
                                            <Link to={`/engineer/resolve/${t.id}`} className="btn-primary w-full md:w-auto bg-red-600 hover:bg-red-700">
                                                Resolve Again
                                            </Link>
                                        </div>
                                    ) : (
                                        <Link to={`/engineer/resolve/${t.id}`} className="btn-primary w-full md:w-auto">
                                            Resolve Issue
                                        </Link>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </DashboardLayout>
    );
}
