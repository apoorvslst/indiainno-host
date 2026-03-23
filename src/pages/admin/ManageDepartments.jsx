import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import DEPARTMENTS from "../../data/departments";
import api from "../../utils/api";

const emptyStats = {
    total: 0,
    active: 0,
    closed: 0,
    critical: 0,
    engineers: 0,
    avgProgress: 0,
    closeRate: 0,
};

export default function ManageDepartments() {
    const [loading, setLoading] = useState(true);
    const [selectedDeptId, setSelectedDeptId] = useState(DEPARTMENTS[0]?.id || "");
    const [deptStats, setDeptStats] = useState({});
    const [deptDetails, setDeptDetails] = useState({});

    const getDelayMeta = (ticket) => {
        const createdAt = ticket?.createdAt ? new Date(ticket.createdAt) : null;
        if (!createdAt || Number.isNaN(createdAt.getTime())) {
            return { label: "--", slaLabel: "--", breached: false, hours: 0 };
        }

        const elapsedMs = Date.now() - createdAt.getTime();
        const hours = Math.max(0, Math.floor(elapsedMs / (1000 * 60 * 60)));
        const days = Math.floor(hours / 24);
        const remHours = hours % 24;
        const label = days > 0 ? `${days}d ${remHours}h` : `${hours}h`;

        const severitySlaHours = {
            Critical: 24,
            High: 72,
            Medium: 120,
            Low: 168,
        };
        const slaHours = severitySlaHours[ticket?.severity] || severitySlaHours.Low;

        return {
            label,
            slaLabel: `${Math.floor(slaHours / 24)}d`,
            breached: hours > slaHours,
            hours,
        };
    };

    useEffect(() => {
        const fetchDepartmentPerformance = async () => {
            try {
                const [ticketRes, engineerRes] = await Promise.all([
                    api.get('/tickets/master'),
                    api.get('/users?role=engineer')
                ]);

                const tickets = ticketRes.data;
                const engineers = engineerRes.data;
                const nextStats = {};
                const nextDetails = {};

                DEPARTMENTS.forEach((dept) => {
                    const deptTickets = tickets.filter((t) => t.department === dept.id);
                    const total = deptTickets.length;
                    const closed = deptTickets.filter((t) => t.status === "Closed").length;
                    const active = deptTickets.filter((t) => !["Closed", "Invalid_Spam"].includes(t.status)).length;
                    const critical = deptTickets.filter((t) => t.severity === "Critical" && t.status !== "Closed").length;
                    const avgProgress = total
                        ? Math.round(deptTickets.reduce((sum, t) => sum + (t.progressPercent || 0), 0) / total)
                        : 0;
                    const closeRate = total ? Math.round((closed / total) * 100) : 0;
                    const deptEngineers = engineers.filter((e) => e.department === dept.id);
                    const pendingIssues = deptTickets
                        .filter((t) => !["Closed", "Invalid_Spam"].includes(t.status))
                        .map((t) => ({ ...t, delayMeta: getDelayMeta(t) }))
                        .sort((a, b) => b.delayMeta.hours - a.delayMeta.hours);

                    nextStats[dept.id] = {
                        total,
                        active,
                        closed,
                        critical,
                        engineers: deptEngineers.length,
                        activeEngineers: deptEngineers.filter((e) => e.active !== false).length,
                        avgProgress,
                        closeRate,
                    };

                    nextDetails[dept.id] = {
                        engineers: deptEngineers,
                        pendingIssues,
                    };
                });

                setDeptStats(nextStats);
                setDeptDetails(nextDetails);
            } catch (error) {
                console.error("Department performance fetch failed:", error);
            }
            setLoading(false);
        };

        fetchDepartmentPerformance();
    }, []);

    const selectedDept = useMemo(
        () => DEPARTMENTS.find((d) => d.id === selectedDeptId) || DEPARTMENTS[0],
        [selectedDeptId]
    );
    const selectedStats = selectedDept ? (deptStats[selectedDept.id] || emptyStats) : emptyStats;
    const selectedDetails = selectedDept ? (deptDetails[selectedDept.id] || { engineers: [], pendingIssues: [] }) : { engineers: [], pendingIssues: [] };

    return (
        <DashboardLayout title="Department Ontology" subtitle="Mapping of Civic Intents to Responsible Agencies">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fadeInUp">
                {DEPARTMENTS.map(dept => (
                    <button
                        key={dept.id}
                        type="button"
                        onClick={() => setSelectedDeptId(dept.id)}
                        className={`card text-left transition-colors ${selectedDeptId === dept.id ? "border-[var(--color-primary-light)]" : "hover:border-[var(--color-primary-light)]"}`}
                    >
                        <div className="flex items-center gap-3 mb-4 border-b border-[var(--color-border)] pb-4">
                            <div className="text-3xl">{dept.icon}</div>
                            <h2 className="font-bold text-lg leading-tight">{dept.name}</h2>
                        </div>
                        <p className="text-sm text-[var(--color-text-muted)] mb-4">{dept.description}</p>

                        <p className="text-xs mb-3 text-[var(--color-primary-light)] font-semibold">
                            {loading ? "Loading performance..." : `${(deptStats[dept.id] || emptyStats).active} active issues`}
                        </p>

                        <div>
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Maps to AI Intents</h3>
                            <div className="flex flex-wrap gap-2">
                                {dept.categories.map(cat => (
                                    <span key={cat} className="badge bg-[var(--color-primary)]/10 text-[var(--color-primary-light)] border border-[var(--color-primary)]/20 text-xs">
                                        {cat.replace(/_/g, " ")}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </button>
                ))}
            </div>

            {selectedDept && (
                <div className="card mt-6 animate-fadeInUp">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold">{selectedDept.icon} {selectedDept.name} Performance</h2>
                        <span className="badge bg-[var(--color-primary)]/15 text-[var(--color-primary-light)]">
                            {loading ? "Loading" : `Close Rate ${selectedStats.closeRate}%`}
                        </span>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="p-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
                            <p className="text-xs text-[var(--color-text-muted)] mb-1">Total Issues</p>
                            <p className="text-2xl font-bold">{loading ? "--" : selectedStats.total}</p>
                        </div>
                        <div className="p-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
                            <p className="text-xs text-[var(--color-text-muted)] mb-1">Active Issues</p>
                            <p className="text-2xl font-bold text-[#f59e0b]">{loading ? "--" : selectedStats.active}</p>
                        </div>
                        <div className="p-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
                            <p className="text-xs text-[var(--color-text-muted)] mb-1">Critical Open</p>
                            <p className="text-2xl font-bold text-[#ef4444]">{loading ? "--" : selectedStats.critical}</p>
                        </div>
                        <div className="p-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
                            <p className="text-xs text-[var(--color-text-muted)] mb-1">Closed Issues</p>
                            <p className="text-2xl font-bold text-[#22c55e]">{loading ? "--" : selectedStats.closed}</p>
                        </div>
                        <div className="p-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
                            <p className="text-xs text-[var(--color-text-muted)] mb-1">Active Engineers</p>
                            <p className="text-2xl font-bold">{loading ? "--" : `${selectedStats.activeEngineers}/${selectedStats.engineers}`}</p>
                        </div>
                        <div className="p-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
                            <p className="text-xs text-[var(--color-text-muted)] mb-1">Avg Progress</p>
                            <p className="text-2xl font-bold">{loading ? "--" : `${selectedStats.avgProgress}%`}</p>
                        </div>
                    </div>

                    <div className="mt-6 grid lg:grid-cols-2 gap-6">
                        <div className="rounded-lg border border-[var(--color-border)] overflow-hidden">
                            <div className="px-4 py-3 bg-[var(--color-surface)] border-b border-[var(--color-border)] flex items-center justify-between">
                                <h3 className="font-semibold">All Engineers</h3>
                                <span className="text-xs text-[var(--color-text-muted)]">{loading ? "--" : selectedDetails.engineers.length} total</span>
                            </div>

                            {loading ? (
                                <div className="p-4 text-sm text-[var(--color-text-muted)]">Loading engineers...</div>
                            ) : selectedDetails.engineers.length === 0 ? (
                                <div className="p-4 text-sm text-[var(--color-text-muted)]">No engineers mapped to this department.</div>
                            ) : (
                                <div className="max-h-[360px] overflow-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-left text-xs text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
                                                <th className="px-4 py-2">Engineer</th>
                                                <th className="px-4 py-2">Status</th>
                                                <th className="px-4 py-2">Trust</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedDetails.engineers.map((eng) => (
                                                <tr key={eng._id || eng.id} className="border-b border-[var(--color-border)]/60">
                                                    <td className="px-4 py-3">
                                                        <p className="font-medium">{eng.name}</p>
                                                        <p className="text-xs text-[var(--color-text-muted)]">{eng.email}</p>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`badge ${eng.active !== false ? "status-closed" : "status-disputed"}`}>
                                                            {eng.active !== false ? "Active" : "Suspended"}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 font-semibold">{eng.trustScore ?? 100}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        <div className="rounded-lg border border-[var(--color-border)] overflow-hidden">
                            <div className="px-4 py-3 bg-[var(--color-surface)] border-b border-[var(--color-border)] flex items-center justify-between">
                                <h3 className="font-semibold">Pending Issues</h3>
                                <span className="text-xs text-[var(--color-text-muted)]">{loading ? "--" : selectedDetails.pendingIssues.length} open</span>
                            </div>

                            {loading ? (
                                <div className="p-4 text-sm text-[var(--color-text-muted)]">Loading pending issues...</div>
                            ) : selectedDetails.pendingIssues.length === 0 ? (
                                <div className="p-4 text-sm text-[var(--color-text-muted)]">No pending issues in this department.</div>
                            ) : (
                                <div className="max-h-[360px] overflow-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-left text-xs text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
                                                <th className="px-4 py-2">Issue</th>
                                                <th className="px-4 py-2">Status</th>
                                                <th className="px-4 py-2">Delay</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedDetails.pendingIssues.map((issue) => (
                                                <tr key={issue.id || issue._id} className="border-b border-[var(--color-border)]/60">
                                                    <td className="px-4 py-3">
                                                        <p className="font-medium">{issue.intentCategory?.replace(/_/g, " ") || "Issue"}</p>
                                                        <p className="text-xs text-[var(--color-text-muted)] truncate max-w-[260px]">{issue.landmark || "Location unavailable"}</p>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`badge status-${(issue.status || "open").toLowerCase()}`}>{issue.status || "Open"}</span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <p className={`font-semibold ${issue.delayMeta.breached ? "text-[#ef4444]" : "text-[var(--color-text)]"}`}>
                                                            {issue.delayMeta.label}
                                                        </p>
                                                        <p className="text-xs text-[var(--color-text-muted)]">
                                                            SLA {issue.delayMeta.slaLabel} {issue.delayMeta.breached ? "(Breached)" : "(Within SLA)"}
                                                        </p>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
