import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import DashboardLayout from "../../components/DashboardLayout";
import api from "../../utils/api";
import { getRoleTitle, normalizeRole } from "../../config/roleConfig";
import DEPARTMENTS from "../../data/departments";

export default function ImplementationPlansList() {
    const { userProfile } = useAuth();
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");

    const role = normalizeRole(userProfile?.role);
    const mode = userProfile?.mode || "urban";
    const roleTitle = getRoleTitle(role, mode);

    useEffect(() => {
        const fetchPlans = async () => {
            try {
                const res = await api.get("/implementation-plans/pending/all");
                setPlans(res.data || []);
            } catch (err) {
                console.error("Failed to fetch plans:", err);
            }
            setLoading(false);
        };
        fetchPlans();
    }, []);

    const getDeptInfo = (dept) => {
        return DEPARTMENTS.find(d => d.id === dept) || { name: dept, icon: "🏛️", color: "#6366f1" };
    };

    const getStatusColor = (stage) => {
        switch (stage) {
            case "ai_generated": return "#8b5cf6";
            case "pending_junior_review": return "#f59e0b";
            case "pending_senior_review": return "#ec4899";
            case "approved": return "#22c55e";
            case "in_progress": return "#3b82f6";
            case "completed": return "#06b6d4";
            default: return "#64748b";
        }
    };

    const filteredPlans = plans.filter(plan => {
        if (filter === "all") return true;
        if (filter === "pending") return ["ai_generated", "pending_junior_review", "pending_senior_review"].includes(plan.currentStage);
        if (filter === "in_progress") return plan.currentStage === "in_progress";
        if (filter === "completed") return ["completed", "verified"].includes(plan.currentStage);
        return true;
    });

    const counts = {
        all: plans.length,
        pending: plans.filter(p => ["ai_generated", "pending_junior_review", "pending_senior_review"].includes(p.currentStage)).length,
        in_progress: plans.filter(p => p.currentStage === "in_progress").length,
        completed: plans.filter(p => ["completed", "verified"].includes(p.currentStage)).length
    };

    return (
        <DashboardLayout title="Implementation Plans" subtitle="View and manage all implementation plans">
            {/* Filter Tabs */}
            <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
                {[
                    { key: "all", label: "All", count: counts.all },
                    { key: "pending", label: "Pending Review", count: counts.pending },
                    { key: "in_progress", label: "In Progress", count: counts.in_progress },
                    { key: "completed", label: "Completed", count: counts.completed }
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setFilter(tab.key)}
                        style={{
                            padding: "8px 16px",
                            borderRadius: 8,
                            border: "none",
                            background: filter === tab.key ? "#1e3a8a" : "#f1f5f9",
                            color: filter === tab.key ? "#fff" : "#475569",
                            fontWeight: 600,
                            fontSize: 13,
                            cursor: "pointer"
                        }}
                    >
                        {tab.label} ({tab.count})
                    </button>
                ))}
            </div>

            {/* Plans Grid */}
            {loading ? (
                <div className="flex justify-center py-20"><div className="spinner" /></div>
            ) : filteredPlans.length === 0 ? (
                <div className="card p-8 text-center">
                    <p className="text-[var(--color-text-muted)]">No implementation plans found.</p>
                    <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 8 }}>
                        Implementation plans are automatically created when new complaints are registered.
                    </p>
                </div>
            ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: 16 }}>
                    {filteredPlans.map(plan => {
                        const deptInfo = getDeptInfo(plan.department);
                        return (
                            <Link
                                key={plan._id}
                                to={`/${role}/plan/${plan.masterTicketId?._id || plan.masterTicketId}`}
                                className="card"
                                style={{ padding: 20, textDecoration: "none", color: "inherit", borderLeft: `4px solid ${deptInfo.color}` }}
                            >
                                {/* Header */}
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                                    <div>
                                        <p style={{ fontSize: 12, color: "#64748b" }}>
                                            {plan.masterTicketId?.ticketNumber || plan.ticketNumber}
                                        </p>
                                        <h3 style={{ fontSize: 15, fontWeight: 700, color: "#1e3a8a", marginTop: 4 }}>
                                            {plan.title}
                                        </h3>
                                    </div>
                                    <span style={{
                                        padding: "4px 10px",
                                        borderRadius: 4,
                                        fontSize: 10,
                                        fontWeight: 700,
                                        background: getStatusColor(plan.currentStage) + "20",
                                        color: getStatusColor(plan.currentStage)
                                    }}>
                                        {plan.currentStage?.replace(/_/g, " ").toUpperCase()}
                                    </span>
                                </div>

                                {/* Meta */}
                                <div style={{ display: "flex", gap: 16, marginBottom: 12, fontSize: 12 }}>
                                    <span style={{ color: "#64748b" }}>
                                        {deptInfo.icon} {deptInfo.name}
                                    </span>
                                    <span style={{ color: "#64748b" }}>
                                        Level {plan.level}
                                    </span>
                                    <span style={{ 
                                        color: plan.severity === "Critical" ? "#ef4444" : plan.severity === "High" ? "#f59e0b" : "#22c55e" 
                                    }}>
                                        {plan.severity}
                                    </span>
                                </div>

                                {/* Progress */}
                                <div style={{ marginBottom: 12 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                        <span style={{ fontSize: 11, color: "#64748b" }}>Progress</span>
                                        <span style={{ fontSize: 11, fontWeight: 700 }}>{plan.overallProgress || 0}%</span>
                                    </div>
                                    <div style={{ height: 6, background: "#e2e8f0", borderRadius: 3, overflow: "hidden" }}>
                                        <div style={{
                                            width: `${plan.overallProgress || 0}%`,
                                            height: "100%",
                                            background: plan.overallProgress === 100 ? "#22c55e" : "#3b82f6",
                                            borderRadius: 3
                                        }} />
                                    </div>
                                </div>

                                {/* Steps Summary */}
                                <div style={{ display: "flex", gap: 8, fontSize: 11 }}>
                                    <span style={{ color: "#22c55e" }}>
                                        ✓ {plan.steps?.filter(s => s.status === "completed").length || 0} completed
                                    </span>
                                    <span style={{ color: "#f59e0b" }}>
                                        ◐ {plan.steps?.filter(s => s.status === "in_progress").length || 0} in progress
                                    </span>
                                    <span style={{ color: "#64748b" }}>
                                        ○ {plan.steps?.filter(s => s.status === "pending").length || 0} pending
                                    </span>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </DashboardLayout>
    );
}
