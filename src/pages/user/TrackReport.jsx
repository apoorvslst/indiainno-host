import { useState } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import api from "../../utils/api";
import toast from "react-hot-toast";
import { HiOutlineSearch, HiOutlineShieldCheck, HiOutlineClock, HiOutlineCheckCircle, HiOutlineExclamation } from "react-icons/hi";

const STATUS_CONFIG = {
    Submitted: { color: "#6366f1", bg: "#eef2ff", icon: "📝", label: "Submitted" },
    Unassigned: { color: "#f59e0b", bg: "#fffbeb", icon: "⏳", label: "Awaiting Assignment" },
    Assigned: { color: "#3b82f6", bg: "#eff6ff", icon: "👤", label: "Assigned to Officer" },
    Under_Investigation: { color: "#8b5cf6", bg: "#f5f3ff", icon: "🔍", label: "Under Investigation" },
    Verified: { color: "#10b981", bg: "#ecfdf5", icon: "✅", label: "Verified" },
    Insufficient_Evidence: { color: "#ef4444", bg: "#fef2f2", icon: "⚠️", label: "Insufficient Evidence" },
    Action_Taken: { color: "#059669", bg: "#ecfdf5", icon: "⚖️", label: "Action Taken" },
    Closed: { color: "#64748b", bg: "#f8fafc", icon: "📁", label: "Case Closed" },
};

const LEVEL_CONFIG = {
    1: { color: "#22c55e", label: "Level 1 — Junior Officer" },
    2: { color: "#f59e0b", label: "Level 2 — Dept Head / DVO" },
    3: { color: "#dc2626", label: "Level 3 — Commissioner" },
};

export default function TrackReport() {
    const [tokenInput, setTokenInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState(null);
    const [error, setError] = useState(null);

    const handleTrack = async (e) => {
        e.preventDefault();
        const cleaned = tokenInput.replace(/[-\s]/g, "");
        if (cleaned.length !== 16) {
            return toast.error("Please enter a valid 16-digit tracking token.");
        }

        setLoading(true);
        setError(null);
        setReport(null);

        try {
            const { data } = await api.get(`/anticorruption/track/${cleaned}`);
            setReport(data);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to find report. Please check your token.");
        }
        setLoading(false);
    };

    const statusConf = report ? STATUS_CONFIG[report.status] || STATUS_CONFIG.Submitted : null;
    const levelConf = report ? LEVEL_CONFIG[report.level] || LEVEL_CONFIG[1] : null;

    // Build timeline stages
    const stages = [
        "Submitted", "Unassigned", "Assigned", "Under_Investigation", "Verified", "Action_Taken", "Closed"
    ];
    const currentStageIndex = report ? stages.indexOf(report.status) : -1;

    return (
        <DashboardLayout title="Track Your Report" subtitle="Anti-Corruption Department — Enter your 16-digit secure token">
            <div className="max-w-2xl mx-auto space-y-6 animate-fadeInUp">

                {/* Search Card */}
                <div className="card">
                    <form onSubmit={handleTrack} className="flex gap-3">
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                value={tokenInput}
                                onChange={e => setTokenInput(e.target.value)}
                                className="input-field px-4 font-mono text-lg tracking-wider"
                                placeholder="XXXX-XXXX-XXXX-XXXX"
                                maxLength={19}
                            />
                        </div>
                        <button type="submit" className="btn-primary px-6" disabled={loading}>
                            {loading ? <div className="spinner w-5 h-5 border-2" /> : "Track"}
                        </button>
                    </form>
                </div>

                {/* Error State */}
                {error && (
                    <div className="card bg-red-50 border-red-200">
                        <div className="flex items-center gap-3">
                            <HiOutlineExclamation className="text-red-500 text-xl flex-shrink-0" />
                            <p className="text-sm text-red-700 font-medium">{error}</p>
                        </div>
                    </div>
                )}

                {/* Report Details */}
                {report && (
                    <div className="space-y-4 animate-fadeInUp">

                        {/* Status Header */}
                        <div className="card">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: statusConf.bg }}>
                                        {statusConf.icon}
                                    </div>
                                    <div>
                                        <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider font-semibold">Current Status</p>
                                        <p className="text-lg font-bold" style={{ color: statusConf.color }}>{statusConf.label}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-[var(--color-text-muted)]">Token</p>
                                    <p className="font-mono text-sm font-bold">{report.tokenId.slice(0, 4)}-{report.tokenId.slice(4, 8)}-{report.tokenId.slice(8, 12)}-{report.tokenId.slice(12)}</p>
                                </div>
                            </div>

                            {/* Timeline Progress */}
                            <div className="flex items-center gap-1 mt-4">
                                {stages.map((stage, i) => {
                                    const isComplete = i <= currentStageIndex;
                                    const isCurrent = i === currentStageIndex;
                                    const conf = STATUS_CONFIG[stage];
                                    return (
                                        <div key={stage} className="flex-1 flex flex-col items-center">
                                            <div
                                                className={`w-full h-2 rounded-full transition-all ${i === 0 ? 'rounded-l-full' : ''} ${i === stages.length - 1 ? 'rounded-r-full' : ''}`}
                                                style={{
                                                    background: isComplete ? conf.color : '#e2e8f0',
                                                    boxShadow: isCurrent ? `0 0 8px ${conf.color}40` : 'none'
                                                }}
                                            />
                                            <p className={`text-[9px] mt-1 text-center font-medium ${isCurrent ? 'font-bold' : ''}`} style={{ color: isComplete ? conf.color : '#94a3b8' }}>
                                                {stage.replace(/_/g, ' ')}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="card">
                                <p className="text-xs text-[var(--color-text-muted)] mb-1">Category</p>
                                <p className="font-bold text-[var(--color-text)]">{report.category}</p>
                            </div>
                            <div className="card">
                                <p className="text-xs text-[var(--color-text-muted)] mb-1">Department</p>
                                <p className="font-bold text-[var(--color-text)]">{report.department || "Not specified"}</p>
                            </div>
                            <div className="card">
                                <p className="text-xs text-[var(--color-text-muted)] mb-1">Complaint Level</p>
                                <p className="font-bold text-[var(--color-text)]">{levelConf.label}</p>
                            </div>
                            <div className="card">
                                <p className="text-xs text-[var(--color-text-muted)] mb-1">Assigned Role</p>
                                <p className="font-bold text-[var(--color-text)]">{report.assignedRole}</p>
                            </div>
                            <div className="card">
                                <p className="text-xs text-[var(--color-text-muted)] mb-1">Urgency</p>
                                <p className="font-bold text-[var(--color-text)]">{report.urgency}</p>
                            </div>
                            <div className="card">
                                <p className="text-xs text-[var(--color-text-muted)] mb-1">Escalation Level</p>
                                <p className="font-bold text-[var(--color-text)]">{report.escalationLevel > 0 ? `Level ${report.escalationLevel} Oversight` : 'Standard'}</p>
                            </div>
                        </div>

                        {/* Timestamps */}
                        <div className="card">
                            <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
                                <HiOutlineClock className="text-blue-600" /> Timeline
                            </h4>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-[var(--color-text-muted)]">Submitted</span>
                                    <span className="font-medium">{new Date(report.submittedAt).toLocaleString('en-IN')}</span>
                                </div>
                                {report.resolvedAt && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-[var(--color-text-muted)]">Resolved</span>
                                        <span className="font-medium text-green-600">{new Date(report.resolvedAt).toLocaleString('en-IN')}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Resolution Outcome */}
                        {report.resolutionOutcome && (
                            <div className="card bg-green-50 border-green-200">
                                <div className="flex items-start gap-3">
                                    <HiOutlineCheckCircle className="text-green-600 text-xl flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-bold text-sm text-green-800 mb-1">Resolution Outcome</p>
                                        <p className="text-sm text-green-700">{report.resolutionOutcome}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Security Notice */}
                        <div className="flex items-center justify-center gap-2 py-4 text-xs text-[var(--color-text-muted)]">
                            <HiOutlineShieldCheck className="text-green-600" />
                            <span>All data is encrypted. No personal information is stored with this report.</span>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
