import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import DashboardLayout from "../../components/DashboardLayout";
import api from "../../utils/api";
import { getRoleTitle, normalizeRole } from "../../config/roleConfig";
import DEPARTMENTS from "../../data/departments";

export default function ImplementationPlanSheet() {
    const { ticketId, planId } = useParams();
    const navigate = useNavigate();
    const { userProfile } = useAuth();
    const [plan, setPlan] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [connectedUsers, setConnectedUsers] = useState({});

    const role = normalizeRole(userProfile?.role);
    const mode = userProfile?.mode || "urban";

    useEffect(() => {
        const fetchPlan = async () => {
            try {
                let planData = null;
                if (ticketId) {
                    const res = await api.get(`/implementation-plans/${ticketId}`);
                    planData = res.data;
                } else if (planId) {
                    const res = await api.get(`/implementation-plans/id/${planId}`);
                    planData = res.data;
                }
                setPlan(planData);
                
                if (planData?.department) {
                    fetchConnectedOfficials(planData.department);
                }
            } catch (err) {
                console.error("Failed to fetch plan:", err);
                setError(err.response?.data?.message || "Failed to load implementation plan");
            }
            setLoading(false);
        };
        fetchPlan();
    }, [ticketId, planId]);

    const fetchConnectedOfficials = async (department) => {
        try {
            const res = await api.get("/users");
            const allUsers = res.data || [];
            const deptUsers = allUsers.filter(u => 
                u.department === department && 
                ["junior", "engineer", "senior_engineer", "dept_head", "officer"].includes(u.role)
            );
            
            const officials = {
                commissioner: deptUsers.find(u => u.role === "officer"),
                deptHead: deptUsers.find(u => u.role === "dept_head"),
                juniors: deptUsers.filter(u => ["junior", "engineer"].includes(u.role))
            };
            setConnectedUsers(officials);
        } catch (err) {
            console.error("Failed to fetch officials:", err);
        }
    };

    const handleJuniorReview = async (forwardToSenior = true) => {
        setSaving(true);
        try {
            const res = await api.put(`/implementation-plans/${plan._id}/junior-review`, {
                forwardToSenior,
                remarks: "Reviewed by junior engineer"
            });
            setPlan(res.data.plan);
            alert(forwardToSenior ? "Plan forwarded to senior for approval" : "Draft saved");
        } catch (err) {
            alert(err.response?.data?.message || "Failed to submit review");
        }
        setSaving(false);
    };

    const handleSeniorReview = async (action) => {
        setSaving(true);
        try {
            const res = await api.put(`/implementation-plans/${plan._id}/senior-review`, {
                action,
                remarks: action === "approve" ? "Plan approved" : action === "send_back" ? "Sent back for revision" : "Plan rejected"
            });
            setPlan(res.data.plan);
            alert(action === "approve" ? "Plan approved!" : action === "send_back" ? "Plan sent back to junior" : "Plan rejected");
        } catch (err) {
            alert(err.response?.data?.message || "Failed to submit review");
        }
        setSaving(false);
    };

    const handleLevel1Approve = async () => {
        setSaving(true);
        try {
            const res = await api.put(`/implementation-plans/${plan._id}/level1-approve`, {});
            setPlan(res.data.plan);
            alert("Plan approved and work can begin!");
        } catch (err) {
            alert(err.response?.data?.message || "Failed to approve");
        }
        setSaving(false);
    };

    const handleStartWork = async () => {
        setSaving(true);
        try {
            const res = await api.put(`/implementation-plans/${plan._id}/start-work`, {});
            setPlan(res.data.plan);
            alert("Work started!");
        } catch (err) {
            alert(err.response?.data?.message || "Failed to start work");
        }
        setSaving(false);
    };

    const handleStepProgress = async (stepNumber, status) => {
        setSaving(true);
        try {
            const res = await api.put(`/implementation-plans/${plan._id}/step-progress`, {
                stepNumber,
                status
            });
            setPlan(res.data.plan);
        } catch (err) {
            alert(err.response?.data?.message || "Failed to update progress");
        }
        setSaving(false);
    };

    const canEdit = role === "junior" || role === "engineer";
    const canApprove = ["senior_engineer", "dept_head", "officer"].includes(role);
    const isCitizen = role === "citizen" || role === "user";

    const getDeptColor = (dept) => {
        const d = DEPARTMENTS.find(d => d.id === dept);
        return d?.color || "#6366f1";
    };

    const getDeptIcon = (dept) => {
        const d = DEPARTMENTS.find(d => d.id === dept);
        return d?.icon || "🏛️";
    };

    const getStatusBadge = (status) => {
        const colors = {
            pending: "#64748b",
            in_progress: "#f59e0b",
            completed: "#22c55e",
            verified: "#06b6d4",
            rejected: "#ef4444"
        };
        return colors[status] || "#64748b";
    };

    if (loading) {
        return (
            <DashboardLayout title="Implementation Plan">
                <div className="flex justify-center py-20"><div className="spinner" /></div>
            </DashboardLayout>
        );
    }

    if (error) {
        return (
            <DashboardLayout title="Implementation Plan">
                <div className="card p-8 text-center">
                    <p className="text-red-500 mb-4">{error}</p>
                    <Link to="/citizen/complaints" className="btn-primary">Back to My Complaints</Link>
                </div>
            </DashboardLayout>
        );
    }

    if (!plan) {
        return (
            <DashboardLayout title="Implementation Plan">
                <div className="card p-8 text-center">
                    <p className="text-[var(--color-text-muted)] mb-4">No implementation plan found for this ticket.</p>
                    <Link to="/citizen/complaints" className="btn-primary">Back to My Complaints</Link>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="Implementation Plan">
            <div style={{ maxWidth: 210 * 3.78, margin: "0 auto", background: "#fff", padding: 32, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                {/* Header */}
                <div style={{ borderBottom: "2px solid #1e3a8a", paddingBottom: 16, marginBottom: 24 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{ width: 48, height: 48, background: "#1e3a8a", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, borderRadius: 8 }}>CS</div>
                            <div>
                                <h1 style={{ fontSize: 20, fontWeight: 800, color: "#1e3a8a" }}>CivicSync Implementation Plan</h1>
                                <p style={{ fontSize: 11, color: "#64748b" }}>Government of India</p>
                            </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                            <p style={{ fontSize: 24, fontWeight: 800, color: "#1e3a8a" }}>{plan.ticketNumber}</p>
                            <span style={{ 
                                padding: "4px 12px", borderRadius: 4, fontSize: 11, fontWeight: 600,
                                background: getDeptColor(plan.department) + "20", color: getDeptColor(plan.department)
                            }}>
                                {getDeptIcon(plan.department)} {plan.department?.toUpperCase()}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Ticket Details */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24, padding: "12px 16px", background: "#f8fafc", borderRadius: 8 }}>
                    <div>
                        <p style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase" }}>Severity</p>
                        <p style={{ fontSize: 14, fontWeight: 700, color: plan.severity === "Critical" ? "#ef4444" : plan.severity === "High" ? "#f59e0b" : "#22c55e" }}>{plan.severity}</p>
                    </div>
                    <div>
                        <p style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase" }}>Level</p>
                        <p style={{ fontSize: 14, fontWeight: 700 }}>{plan.level}</p>
                    </div>
                    <div>
                        <p style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase" }}>Status</p>
                        <p style={{ fontSize: 14, fontWeight: 700, color: "#1e3a8a" }}>{plan.currentStage?.replace(/_/g, " ").toUpperCase()}</p>
                    </div>
                </div>

                {/* Title & Description */}
                <div style={{ marginBottom: 24 }}>
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1e3a8a", marginBottom: 8 }}>{plan.title}</h2>
                    <p style={{ fontSize: 12, color: "#475569", lineHeight: 1.6 }}>{plan.description}</p>
                </div>

                {/* Problem Analysis */}
                <div style={{ marginBottom: 24 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1e3a8a", marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
                        📋 PROBLEM ANALYSIS
                    </h3>
                    <div style={{ padding: 16, background: "#f0f9ff", borderRadius: 8, borderLeft: "4px solid #0ea5e9" }}>
                        <p style={{ fontSize: 12, color: "#334155", lineHeight: 1.6 }}>{plan.problemAnalysis}</p>
                    </div>
                </div>

                {/* Estimates */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
                    <div style={{ padding: 16, background: "#f8fafc", borderRadius: 8, textAlign: "center" }}>
                        <p style={{ fontSize: 20, fontWeight: 800, color: "#1e3a8a" }}>{plan.totalEstimatedHours}h</p>
                        <p style={{ fontSize: 10, color: "#64748b" }}>Estimated Time</p>
                    </div>
                    <div style={{ padding: 16, background: "#f8fafc", borderRadius: 8, textAlign: "center" }}>
                        <p style={{ fontSize: 20, fontWeight: 800, color: "#1e3a8a" }}>₹{plan.totalEstimatedCost?.toLocaleString()}</p>
                        <p style={{ fontSize: 10, color: "#64748b" }}>Estimated Cost</p>
                    </div>
                    <div style={{ padding: 16, background: "#f8fafc", borderRadius: 8, textAlign: "center" }}>
                        <p style={{ fontSize: 20, fontWeight: 800, color: "#1e3a8a" }}>{plan.steps?.length || 0}</p>
                        <p style={{ fontSize: 10, color: "#64748b" }}>Steps</p>
                    </div>
                </div>

                {/* Implementation Steps */}
                <div style={{ marginBottom: 24 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1e3a8a", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                        📝 IMPLEMENTATION STEPS
                    </h3>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                        <thead>
                            <tr style={{ background: "#f1f5f9" }}>
                                <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>#</th>
                                <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>Step</th>
                                <th style={{ padding: "8px 12px", textAlign: "center", fontWeight: 600 }}>Hours</th>
                                <th style={{ padding: "8px 12px", textAlign: "center", fontWeight: 600 }}>Status</th>
                                {canEdit && <th style={{ padding: "8px 12px", textAlign: "center", fontWeight: 600 }}>Action</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {plan.steps?.map((step) => (
                                <tr key={step.stepNumber} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                    <td style={{ padding: "8px 12px", fontWeight: 600 }}>{step.stepNumber}</td>
                                    <td style={{ padding: "8px 12px" }}>
                                        <p style={{ fontWeight: 600, marginBottom: 2 }}>{step.title}</p>
                                        <p style={{ fontSize: 10, color: "#64748b" }}>{step.description}</p>
                                    </td>
                                    <td style={{ padding: "8px 12px", textAlign: "center" }}>{step.estimatedHours}h</td>
                                    <td style={{ padding: "8px 12px", textAlign: "center" }}>
                                        <span style={{ 
                                            padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 600,
                                            background: getStatusBadge(step.status) + "20", color: getStatusBadge(step.status)
                                        }}>
                                            {step.status?.replace(/_/g, " ").toUpperCase()}
                                        </span>
                                    </td>
                                    {canEdit && (
                                        <td style={{ padding: "8px 12px", textAlign: "center" }}>
                                            {step.status === "pending" && plan.currentStage === "approved" && (
                                                <button 
                                                    onClick={() => handleStepProgress(step.stepNumber, "in_progress")}
                                                    style={{ fontSize: 10, padding: "4px 8px", background: "#f59e0b", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}
                                                >
                                                    Start
                                                </button>
                                            )}
                                            {step.status === "in_progress" && (
                                                <button 
                                                    onClick={() => handleStepProgress(step.stepNumber, "completed")}
                                                    style={{ fontSize: 10, padding: "4px 8px", background: "#22c55e", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}
                                                >
                                                    Complete
                                                </button>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Progress Bar */}
                <div style={{ marginBottom: 24 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: 12 }}>Overall Progress</span>
                        <span style={{ fontWeight: 700, fontSize: 14, color: "#1e3a8a" }}>{plan.overallProgress || 0}%</span>
                    </div>
                    <div style={{ height: 12, background: "#e2e8f0", borderRadius: 6, overflow: "hidden" }}>
                        <div style={{ 
                            width: `${plan.overallProgress || 0}%`, 
                            height: "100%", 
                            background: "linear-gradient(90deg, #3b82f6, #22c55e)",
                            borderRadius: 6,
                            transition: "width 0.5s ease"
                        }} />
                    </div>
                </div>

                {/* Connected Officials */}
                {Object.keys(connectedUsers).length > 0 && (
                    <div style={{ marginBottom: 24, padding: 16, background: "#f8fafc", borderRadius: 8 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1e3a8a", marginBottom: 12 }}>
                            👥 Connected Officials
                        </h3>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 12 }}>
                            {connectedUsers.commissioner && (
                                <div>
                                    <p style={{ color: "#64748b", fontSize: 10 }}>Commissioner / SDM / CEO</p>
                                    <p style={{ fontWeight: 600 }}>{connectedUsers.commissioner.name}</p>
                                    <p style={{ fontSize: 10, color: "#64748b" }}>{connectedUsers.commissioner.phone}</p>
                                </div>
                            )}
                            {connectedUsers.deptHead && (
                                <div>
                                    <p style={{ color: "#64748b", fontSize: 10 }}>Department Head</p>
                                    <p style={{ fontWeight: 600 }}>{connectedUsers.deptHead.name}</p>
                                    <p style={{ fontSize: 10, color: "#64748b" }}>{connectedUsers.deptHead.phone}</p>
                                </div>
                            )}
                            {connectedUsers.juniors?.length > 0 && (
                                <div>
                                    <p style={{ color: "#64748b", fontSize: 10 }}>Engineers ({connectedUsers.juniors.length})</p>
                                    {connectedUsers.juniors.slice(0, 2).map(j => (
                                        <p key={j._id} style={{ fontWeight: 600 }}>{j.name} - {j.phone}</p>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Approval History */}
                <div style={{ marginBottom: 24 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1e3a8a", marginBottom: 12 }}>
                        📜 APPROVAL HISTORY
                    </h3>
                    <div style={{ fontSize: 11, color: "#475569" }}>
                        {plan.approvalHistory?.slice().reverse().map((h, i) => (
                            <p key={i} style={{ marginBottom: 4, padding: "4px 0", borderBottom: "1px solid #f1f5f9" }}>
                                {h.action === "ai_generated" && "🤖"} {h.action === "junior_reviewed" && "👷"} {h.action === "senior_reviewed" && "👨‍💼"} {h.action === "approved" && "✅"} {" "}
                                {h.action?.replace(/_/g, " ")} - {new Date(h.timestamp).toLocaleString()}
                                {h.remarks && <span style={{ color: "#64748b" }}> ({h.remarks})</span>}
                            </p>
                        ))}
                    </div>
                </div>

                {/* Action Buttons */}
                {!isCitizen && (
                    <div style={{ display: "flex", gap: 12, justifyContent: "center", paddingTop: 16, borderTop: "2px solid #e2e8f0" }}>
                        {plan.level === 1 && plan.currentStage === "ai_generated" && canEdit && (
                            <button onClick={handleLevel1Approve} disabled={saving} className="btn-primary" style={{ padding: "12px 24px" }}>
                                {saving ? "Approving..." : "✓ Approve & Start Work"}
                            </button>
                        )}
                        
                        {["ai_generated", "pending_junior_review"].includes(plan.currentStage) && canEdit && (
                            <>
                                <button onClick={() => handleJuniorReview(false)} disabled={saving} className="btn-secondary" style={{ padding: "12px 24px" }}>
                                    Save Draft
                                </button>
                                <button onClick={() => handleJuniorReview(true)} disabled={saving} className="btn-primary" style={{ padding: "12px 24px" }}>
                                    {saving ? "Submitting..." : "📤 Forward to Senior"}
                                </button>
                            </>
                        )}

                        {plan.currentStage === "pending_senior_review" && canApprove && (
                            <>
                                <button onClick={() => handleSeniorReview("send_back")} disabled={saving} className="btn-secondary" style={{ padding: "12px 24px", background: "#ef4444", color: "#fff" }}>
                                    ❌ Send Back
                                </button>
                                <button onClick={() => handleSeniorReview("approve")} disabled={saving} className="btn-primary" style={{ padding: "12px 24px" }}>
                                    {saving ? "Approving..." : "✅ Approve Plan"}
                                </button>
                            </>
                        )}

                        {plan.currentStage === "approved" && canEdit && (
                            <button onClick={handleStartWork} disabled={saving} className="btn-primary" style={{ padding: "12px 24px", background: "#22c55e" }}>
                                {saving ? "Starting..." : "🚧 Start Work"}
                            </button>
                        )}
                    </div>
                )}

                {/* Print Button */}
                <div style={{ textAlign: "center", marginTop: 24, paddingTop: 16, borderTop: "1px solid #e2e8f0" }}>
                    <button onClick={() => window.print()} className="btn-secondary" style={{ padding: "12px 24px" }}>
                        🖨️ Print / Export PDF
                    </button>
                </div>

                {/* Footer */}
                <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid #e2e8f0", textAlign: "center", fontSize: 10, color: "#94a3b8" }}>
                    <p>CivicSync — Government of India</p>
                    <p>Document generated on {new Date().toLocaleDateString()}</p>
                    <p>This document is accountable and traceable.</p>
                </div>
            </div>

            <style>{`
                @media print {
                    body * { visibility: hidden; }
                    .sidebar, .navbar { display: none !important; }
                }
            `}</style>
        </DashboardLayout>
    );
}
