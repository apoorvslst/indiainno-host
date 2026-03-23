import { useState, useEffect } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import api from "../../utils/api";
import DEPARTMENTS, { TICKET_STATUSES } from "../../data/departments";
import toast from "react-hot-toast";

export default function ManageTickets() {
    const [tickets, setTickets] = useState([]);
    const [engineers, setEngineers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterDept, setFilterDept] = useState("all");

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [tRes, eRes] = await Promise.all([
                    api.get('/tickets/master'),
                    api.get('/users?role=engineer')
                ]);
                setTickets(tRes.data);
                setEngineers(eRes.data);
            } catch {
                toast.error("Error loading data");
            }
            setLoading(false);
        };
        fetchData();
    }, []);

    const handleAssign = async (ticketId, engId) => {
        try {
            await api.put(`/tickets/master/${ticketId}`, {
                assignedEngineerId: engId || null,
                status: engId ? "Assigned" : "Open"
            });
            setTickets(tickets.map(t => t.id === ticketId ? { ...t, assignedEngineerId: { _id: engId }, status: engId ? "Assigned" : "Open" } : t));
            toast.success(engId ? "Engineer assigned" : "Unassigned ticket");
        } catch {
            toast.error("Failed to assign");
        }
    };

    const handleStatusChange = async (ticketId, newStatus) => {
        try {
            await api.put(`/tickets/master/${ticketId}`, { status: newStatus });
            setTickets(tickets.map(t => t.id === ticketId ? { ...t, status: newStatus } : t));
            toast.success("Status updated");
        } catch {
            toast.error("Failed to update status");
        }
    };

    const filteredTickets = filterDept === "all" ? tickets : tickets.filter(t => t.department === filterDept);

    return (
        <DashboardLayout title="Master Tickets Database" subtitle="Manage, assign, and track all deduplicated issues">
            <div className="mb-6 flex gap-4 animate-fadeInUp">
                <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="input-field max-w-xs bg-[var(--color-surface)]">
                    <option value="all">All Departments</option>
                    {DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
            </div>

            <div className="card p-0 overflow-hidden animate-fadeInUp">
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Source</th>
                                <th>Category</th>
                                <th>Severity / Count</th>
                                <th>Description</th>
                                <th>Location</th>
                                <th>Status</th>
                                <th>Assignment</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="8" className="text-center py-8"><div className="spinner mx-auto" /></td></tr>
                            ) : filteredTickets.length === 0 ? (
                                <tr><td colSpan="8" className="text-center py-8 text-[var(--color-text-muted)]">No tickets found</td></tr>
                            ) : (
                                filteredTickets.map(t => (
                                    <tr key={t.id}>
                                        <td className="font-mono text-xs text-[var(--color-text-muted)]">{t.id.slice(0, 8)}</td>
                                        <td className="text-center" title={t.source === 'voice_call' ? 'Voice Call' : t.source === 'sms' ? 'SMS' : 'Web Form'}>
                                            {t.source === 'voice_call' ? '📞' : t.source === 'sms' ? '💬' : '📝'}
                                        </td>
                                        <td className="font-medium text-sm">{t.intentCategory?.replace(/_/g, " ")}</td>
                                        <td>
                                            <div className="flex flex-col gap-1 items-start">
                                                <span className={`badge severity-${(t.severity || "low").toLowerCase()}`}>{t.severity}</span>
                                                <span className="text-[10px] text-[var(--color-text-muted)]">{t.complaintCount} raw reports</span>
                                            </div>
                                        </td>
                                        <td className="text-xs max-w-[200px] truncate text-[var(--color-text-muted)]" title={t.description}>{t.description || '—'}</td>
                                        <td className="text-sm max-w-[200px] truncate" title={t.landmark}>{t.landmark || (t.lat ? "Lat/Lng Pin" : "Pending Manual Fix")}</td>
                                        <td>
                                            <select
                                                value={t.status || "Open"}
                                                onChange={(e) => handleStatusChange(t.id, e.target.value)}
                                                className={`text-xs bg-transparent border-none outline-none font-semibold uppercase status-${(t.status || "open").toLowerCase()}`}
                                            >
                                                {TICKET_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                            </select>
                                        </td>
                                        <td>
                                            <select
                                                value={t.assignedEngineerId?._id || t.assignedEngineerId || ""}
                                                onChange={(e) => handleAssign(t.id, e.target.value)}
                                                className="text-xs input-field py-1 px-2"
                                            >
                                                <option value="">Unassigned</option>
                                                {engineers.filter(e => e.department === t.department || !t.department).map(eng => (
                                                    <option key={eng._id || eng.id} value={eng._id || eng.id}>{eng.name}</option>
                                                ))}
                                            </select>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </DashboardLayout>
    );
}
