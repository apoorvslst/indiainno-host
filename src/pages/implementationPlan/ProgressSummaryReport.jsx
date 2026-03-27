import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import DashboardLayout from "../../components/DashboardLayout";
import api from "../../utils/api";
import { getRoleTitle, normalizeRole } from "../../config/roleConfig";

export default function ProgressSummaryReport() {
    const { planId } = useParams();
    const navigate = useNavigate();
    const { userProfile } = useAuth();
    const [plan, setPlan] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [progressNote, setProgressNote] = useState("");
    const [recording, setRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    const role = normalizeRole(userProfile?.role);
    const canEdit = role === "junior" || role === "engineer";
    const canVerify = ["senior_engineer", "dept_head", "officer"].includes(role);

    useEffect(() => {
        const fetchPlan = async () => {
            try {
                const res = await api.get(`/implementation-plans/id/${planId}`);
                setPlan(res.data);
            } catch (err) {
                console.error("Failed to fetch plan:", err);
                setError(err.response?.data?.message || "Failed to load progress report");
            }
            setLoading(false);
        };
        if (planId) fetchPlan();
    }, [planId]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (e) => {
                audioChunksRef.current.push(e.data);
            };

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
                setAudioBlob(blob);
            };

            mediaRecorderRef.current.start();
            setRecording(true);
        } catch (err) {
            alert("Could not access microphone. Please check permissions.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            setRecording(false);
        }
    };

    const transcribeAudio = async () => {
        if (!audioBlob) return;
        setSaving(true);
        try {
            const formData = new FormData();
            formData.append("audio", audioBlob, "recording.webm");
            const res = await api.post("/voice/transcribe", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            setProgressNote(prev => prev + (prev ? " " : "") + (res.data.text || ""));
        } catch (err) {
            alert("Transcription failed. Please type manually.");
        }
        setSaving(false);
    };

    const handleAddComment = async () => {
        if (!progressNote.trim()) return;
        setSaving(true);
        try {
            const res = await api.post(`/implementation-plans/${plan._id}/comment`, {
                content: progressNote
            });
            setPlan(prev => ({
                ...prev,
                comments: [...(prev.comments || []), res.data.comment]
            }));
            setProgressNote("");
        } catch (err) {
            alert(err.response?.data?.message || "Failed to add comment");
        }
        setSaving(false);
    };

    const handleStepProgress = async (stepNumber, status) => {
        setSaving(true);
        try {
            const res = await api.put(`/implementation-plans/${plan._id}/step-progress`, {
                stepNumber,
                status,
                juniorRemarks: progressNote
            });
            setPlan(res.data.plan);
            setProgressNote("");
        } catch (err) {
            alert(err.response?.data?.message || "Failed to update progress");
        }
        setSaving(false);
    };

    const handleVerifyStep = async (stepNumber, verified) => {
        setSaving(true);
        try {
            const res = await api.put(`/implementation-plans/${plan._id}/verify-step`, {
                stepNumber,
                verified,
                seniorRemarks: progressNote
            });
            setPlan(res.data.plan);
            setProgressNote("");
        } catch (err) {
            alert(err.response?.data?.message || "Failed to verify step");
        }
        setSaving(false);
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case "completed": return "✓";
            case "in_progress": return "◐";
            case "verified": return "✅";
            case "rejected": return "❌";
            default: return "○";
        }
    };

    if (loading) {
        return (
            <DashboardLayout title="Progress Summary">
                <div className="flex justify-center py-20"><div className="spinner" /></div>
            </DashboardLayout>
        );
    }

    if (error || !plan) {
        return (
            <DashboardLayout title="Progress Summary">
                <div className="card p-8 text-center">
                    <p className="text-red-500 mb-4">{error || "No progress report found."}</p>
                    <button onClick={() => navigate(-1)} className="btn-primary">Go Back</button>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="Progress Summary Report">
            <div style={{ maxWidth: 900, margin: "0 auto" }}>
                {/* Header Card */}
                <div className="card p-6 mb-6">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                        <div>
                            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1e3a8a" }}>{plan.title}</h2>
                            <p style={{ color: "#64748b" }}>{plan.ticketNumber} • {plan.department}</p>
                        </div>
                        <div style={{ textAlign: "right" }}>
                            <p style={{ fontSize: 24, fontWeight: 800, color: "#1e3a8a" }}>{plan.overallProgress || 0}%</p>
                            <p style={{ fontSize: 12, color: "#64748b" }}>Complete</p>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div style={{ height: 16, background: "#e2e8f0", borderRadius: 8, overflow: "hidden" }}>
                        <div style={{ 
                            width: `${plan.overallProgress || 0}%`, 
                            height: "100%", 
                            background: "linear-gradient(90deg, #3b82f6, #22c55e)",
                            borderRadius: 8,
                            transition: "width 0.5s ease"
                        }} />
                    </div>

                    {/* Quick Stats */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginTop: 16 }}>
                        <div style={{ textAlign: "center", padding: 12, background: "#f8fafc", borderRadius: 8 }}>
                            <p style={{ fontSize: 24, fontWeight: 800, color: "#22c55e" }}>
                                {plan.steps?.filter(s => s.status === "completed").length || 0}
                            </p>
                            <p style={{ fontSize: 11, color: "#64748b" }}>Completed</p>
                        </div>
                        <div style={{ textAlign: "center", padding: 12, background: "#f8fafc", borderRadius: 8 }}>
                            <p style={{ fontSize: 24, fontWeight: 800, color: "#f59e0b" }}>
                                {plan.steps?.filter(s => s.status === "in_progress").length || 0}
                            </p>
                            <p style={{ fontSize: 11, color: "#64748b" }}>In Progress</p>
                        </div>
                        <div style={{ textAlign: "center", padding: 12, background: "#f8fafc", borderRadius: 8 }}>
                            <p style={{ fontSize: 24, fontWeight: 800, color: "#64748b" }}>
                                {plan.steps?.filter(s => s.status === "pending").length || 0}
                            </p>
                            <p style={{ fontSize: 11, color: "#64748b" }}>Pending</p>
                        </div>
                    </div>
                </div>

                {/* Voice Recording Section */}
                {canEdit && (
                    <div className="card p-6 mb-6">
                        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1e3a8a", marginBottom: 12 }}>
                            🎙️ Voice Progress Update
                        </h3>
                        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
                            {!recording ? (
                                <button onClick={startRecording} className="btn-primary" style={{ background: "#22c55e" }}>
                                    🎙️ Start Recording
                                </button>
                            ) : (
                                <button onClick={stopRecording} className="btn-primary" style={{ background: "#ef4444" }}>
                                    ⏹️ Stop Recording
                                </button>
                            )}
                            {audioBlob && (
                                <>
                                    <audio controls src={URL.createObjectURL(audioBlob)} style={{ height: 40 }} />
                                    <button onClick={transcribeAudio} disabled={saving} className="btn-secondary">
                                        🤖 Transcribe
                                    </button>
                                </>
                            )}
                        </div>
                        <textarea
                            value={progressNote}
                            onChange={(e) => setProgressNote(e.target.value)}
                            placeholder="Enter progress update notes..."
                            style={{
                                width: "100%",
                                padding: 12,
                                border: "1px solid #e2e8f0",
                                borderRadius: 8,
                                fontSize: 14,
                                minHeight: 80,
                                resize: "vertical"
                            }}
                        />
                    </div>
                )}

                {/* Steps Progress */}
                <div className="card p-6 mb-6">
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1e3a8a", marginBottom: 16 }}>
                        🚧 Step-by-Step Progress
                    </h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {plan.steps?.map((step) => (
                            <div key={step.stepNumber} style={{ 
                                padding: 16, 
                                background: step.status === "completed" ? "#f0fdf4" : step.status === "in_progress" ? "#fffbeb" : "#f8fafc",
                                borderRadius: 8,
                                borderLeft: `4px solid ${step.status === "completed" ? "#22c55e" : step.status === "in_progress" ? "#f59e0b" : "#e2e8f0"}`
                            }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                                        <span style={{ 
                                            width: 32, height: 32, borderRadius: "50%", 
                                            background: step.status === "completed" ? "#22c55e" : step.status === "in_progress" ? "#f59e0b" : "#e2e8f0",
                                            color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 
                                        }}>
                                            {getStatusIcon(step.status)}
                                        </span>
                                        <div>
                                            <p style={{ fontWeight: 600, marginBottom: 2 }}>{step.stepNumber}. {step.title}</p>
                                            <p style={{ fontSize: 12, color: "#64748b" }}>{step.description}</p>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: "right" }}>
                                        <span style={{ fontSize: 12, fontWeight: 600, color: step.status === "completed" ? "#22c55e" : "#64748b" }}>
                                            {step.status?.replace(/_/g, " ").toUpperCase()}
                                        </span>
                                        <p style={{ fontSize: 11, color: "#94a3b8" }}>{step.estimatedHours}h</p>
                                    </div>
                                </div>

                                {/* Step Actions */}
                                {canEdit && plan.currentStage === "in_progress" && (
                                    <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                                        {step.status === "pending" && (
                                            <button 
                                                onClick={() => handleStepProgress(step.stepNumber, "in_progress")}
                                                disabled={saving}
                                                style={{ fontSize: 12, padding: "6px 12px", background: "#f59e0b", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}
                                            >
                                                Start Work
                                            </button>
                                        )}
                                        {step.status === "in_progress" && (
                                            <button 
                                                onClick={() => handleStepProgress(step.stepNumber, "completed")}
                                                disabled={saving}
                                                style={{ fontSize: 12, padding: "6px 12px", background: "#22c55e", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}
                                            >
                                                Mark Complete
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Senior Verification */}
                                {canVerify && step.status === "completed" && (
                                    <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                                        <button 
                                            onClick={() => handleVerifyStep(step.stepNumber, true)}
                                            disabled={saving}
                                            style={{ fontSize: 12, padding: "6px 12px", background: "#06b6d4", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}
                                        >
                                            ✓ Verify
                                        </button>
                                        <button 
                                            onClick={() => handleVerifyStep(step.stepNumber, false)}
                                            disabled={saving}
                                            style={{ fontSize: 12, padding: "6px 12px", background: "#ef4444", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}
                                        >
                                            ✗ Reject
                                        </button>
                                    </div>
                                )}

                                {/* Remarks */}
                                {(step.juniorRemarks || step.seniorRemarks) && (
                                    <div style={{ marginTop: 12, padding: 8, background: "#fff", borderRadius: 4, fontSize: 12 }}>
                                        {step.juniorRemarks && (
                                            <p style={{ color: "#64748b", marginBottom: 4 }}>
                                                <strong>Jr Engineer:</strong> {step.juniorRemarks}
                                            </p>
                                        )}
                                        {step.seniorRemarks && (
                                            <p style={{ color: "#06b6d4" }}>
                                                <strong>Senior:</strong> {step.seniorRemarks}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Timestamps */}
                                <div style={{ marginTop: 8, fontSize: 10, color: "#94a3b8" }}>
                                    {step.startedAt && `Started: ${new Date(step.startedAt).toLocaleString()} `}
                                    {step.completedAt && `Completed: ${new Date(step.completedAt).toLocaleString()} `}
                                    {step.seniorVerifiedAt && `Verified: ${new Date(step.seniorVerifiedAt).toLocaleString()}`}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Comments Section */}
                <div className="card p-6 mb-6">
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1e3a8a", marginBottom: 16 }}>
                        💬 Activity Log
                    </h3>
                    
                    {/* Add Comment */}
                    <div style={{ marginBottom: 16, display: "flex", gap: 8 }}>
                        <input
                            type="text"
                            value={progressNote}
                            onChange={(e) => setProgressNote(e.target.value)}
                            placeholder="Add a progress note..."
                            style={{
                                flex: 1,
                                padding: "10px 14px",
                                border: "1px solid #e2e8f0",
                                borderRadius: 8,
                                fontSize: 14
                            }}
                        />
                        <button onClick={handleAddComment} disabled={saving || !progressNote.trim()} className="btn-primary">
                            Post
                        </button>
                    </div>

                    {/* Comments List */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {plan.comments?.slice().reverse().map((comment, i) => (
                            <div key={i} style={{ padding: 12, background: "#f8fafc", borderRadius: 8 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                    <span style={{ fontWeight: 600, fontSize: 13 }}>
                                        {comment.authorName || "User"} 
                                        <span style={{ fontWeight: 400, color: "#64748b", marginLeft: 8 }}>
                                            ({comment.authorRole})
                                        </span>
                                    </span>
                                    <span style={{ fontSize: 11, color: "#94a3b8" }}>
                                        {new Date(comment.timestamp).toLocaleString()}
                                    </span>
                                </div>
                                <p style={{ fontSize: 13, color: "#334155" }}>{comment.content}</p>
                            </div>
                        ))}
                        {(!plan.comments || plan.comments.length === 0) && (
                            <p style={{ textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No activity yet.</p>
                        )}
                    </div>
                </div>

                {/* Print Button */}
                <div style={{ textAlign: "center", marginBottom: 24 }}>
                    <button onClick={() => window.print()} className="btn-secondary" style={{ padding: "12px 24px" }}>
                        🖨️ Print Progress Report
                    </button>
                </div>
            </div>

            <style>{`
                @media print {
                    .sidebar, .navbar { display: none !important; }
                }
            `}</style>
        </DashboardLayout>
    );
}
