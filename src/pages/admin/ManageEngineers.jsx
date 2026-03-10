import { useState, useEffect } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import api from "../../utils/api";
import toast from "react-hot-toast";

export default function ManageEngineers() {
    const [engineers, setEngineers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEngineers = async () => {
            try {
                const { data } = await api.get('/users?role=engineer');
                setEngineers(data);
            } catch (err) {
                toast.error("Failed to fetch engineers");
            }
            setLoading(false);
        };
        fetchEngineers();
    }, []);

    const updateEngineer = async (id, updates) => {
        try {
            await api.put(`/users/${id}`, updates);
            setEngineers(engineers.map(e => e._id === id ? { ...e, ...updates } : e));
            toast.success("Updated successfully");
        } catch (err) {
            toast.error("Update failed");
        }
    };

    return (
        <DashboardLayout title="Manage Contractors" subtitle="Monitor performance and adjust trust scores">
            <div className="card p-0 overflow-hidden animate-fadeInUp">
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Contractor Name</th>
                                <th>Department</th>
                                <th>Trust Score</th>
                                <th>Account Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="5" className="text-center py-8"><div className="spinner mx-auto" /></td></tr>
                            ) : engineers.length === 0 ? (
                                <tr><td colSpan="5" className="text-center py-8 text-[var(--color-text-muted)]">No engineers registered</td></tr>
                            ) : (
                                engineers.map(eng => {
                                    const id = eng._id || eng.id;
                                    return (
                                        <tr key={id}>
                                            <td>
                                                <div className="font-medium text-sm">{eng.name}</div>
                                                <div className="text-xs text-[var(--color-text-muted)]">{eng.email}</div>
                                            </td>
                                            <td className="text-sm">{eng.department || "No Dept"}</td>
                                            <td>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-full bg-[var(--color-surface)] rounded-full h-1.5 max-w-[100px]">
                                                        <div className={`h-1.5 rounded-full ${eng.trustScore < 40 ? 'bg-[#ef4444]' : eng.trustScore < 70 ? 'bg-[#f59e0b]' : 'bg-[#22c55e]'}`} style={{ width: `${Math.max(0, Math.min(100, eng.trustScore || 0))}%` }}></div>
                                                    </div>
                                                    <span className="text-xs font-bold">{eng.trustScore}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`badge ${eng.active !== false ? 'status-closed' : 'status-disputed'}`}>
                                                    {eng.active !== false ? "Active" : "Suspended"}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => updateEngineer(id, { trustScore: (eng.trustScore || 100) + 10 })}
                                                        className="btn-secondary py-1 px-2 text-xs" title="Add Trust"
                                                    >+10</button>
                                                    <button
                                                        onClick={() => updateEngineer(id, { trustScore: (eng.trustScore || 100) - 10 })}
                                                        className="btn-danger py-1 px-2 text-xs" title="Penalize Trust"
                                                    >-10</button>
                                                    <button
                                                        onClick={() => updateEngineer(id, { active: eng.active === false })}
                                                        className={`btn-secondary py-1 px-2 text-xs ${eng.active === false ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}
                                                    >
                                                        {eng.active !== false ? 'Suspend' : 'Unsuspend'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </DashboardLayout>
    );
}
