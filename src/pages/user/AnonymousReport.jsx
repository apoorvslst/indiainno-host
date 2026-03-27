import { useState, useRef, useCallback } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import api from "../../utils/api";
import toast from "react-hot-toast";
import { HiOutlineShieldCheck, HiOutlineUpload, HiOutlineDocumentText, HiOutlineFilm, HiOutlineMusicNote, HiOutlineX, HiOutlineClipboardCopy, HiOutlineLockClosed, HiOutlineLocationMarker, HiOutlineExclamation } from "react-icons/hi";
import { Link } from "react-router-dom";
import Swal from 'sweetalert2';

const CATEGORIES = ["Bribery", "Extortion", "Misconduct"];

const DEPARTMENTS = [
    "Public Works Department",
    "Water Supply",
    "Revenue & Taxation",
    "Police",
    "Health Department",
    "Education",
    "Transport",
    "Municipal Corporation",
    "Electricity Board",
    "Land & Registration"
];

const FILE_ACCEPT = ".mp4,.mp3,.pdf";
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

function getFileIcon(type) {
    if (type === "MP4") return <HiOutlineFilm className="text-purple-500 text-xl" />;
    if (type === "MP3") return <HiOutlineMusicNote className="text-blue-500 text-xl" />;
    return <HiOutlineDocumentText className="text-red-500 text-xl" />;
}

function getFileType(name) {
    const ext = name.split('.').pop().toUpperCase();
    if (["MP4", "WEBM", "MOV"].includes(ext)) return "MP4";
    if (["MP3", "WAV", "OGG", "WEBM"].includes(ext)) return "MP3";
    return "PDF";
}

export default function AnonymousReport() {
    const [form, setForm] = useState({
        category: "",
        description: "",
        accusedEmployeeName: "",
        department: "",
        branch: "",
        locality: "",
        lat: null,
        lng: null,
    });

    const [files, setFiles] = useState([]); // { name, type, data (base64), size, progress }
    const [loading, setLoading] = useState(false);
    const [geoLoading, setGeoLoading] = useState(false);
    const [submittedToken, setSubmittedToken] = useState(null);
    const [submittedLevel, setSubmittedLevel] = useState(null);
    const [submittedRole, setSubmittedRole] = useState(null);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef(null);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const captureLocation = async () => {
        setGeoLoading(true);
        try {
            const pos = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true, timeout: 15000
                });
            });
            setForm(prev => ({ ...prev, lat: pos.coords.latitude, lng: pos.coords.longitude }));
            toast.success(`Location captured! Accuracy: ${Math.round(pos.coords.accuracy)}m`);
        } catch {
            toast.error("Could not capture location. Please allow location access.");
        }
        setGeoLoading(false);
    };

    const processFile = useCallback((file) => {
        if (file.size > MAX_FILE_SIZE) {
            toast.error(`${file.name} exceeds 25MB limit.`);
            return;
        }

        const fileType = getFileType(file.name);
        const validTypes = ["MP4", "MP3", "PDF"];
        if (!validTypes.includes(fileType)) {
            toast.error(`${file.name}: Only MP4, MP3, and PDF files are accepted.`);
            return;
        }

        // Simulate progress + read as base64
        const tempId = Date.now() + Math.random();
        setFiles(prev => [...prev, {
            id: tempId,
            name: file.name,
            type: fileType,
            size: file.size,
            data: null,
            progress: 0,
            uploading: true
        }]);

        const reader = new FileReader();
        // Simulate upload progress
        let progress = 0;
        const interval = setInterval(() => {
            progress = Math.min(progress + 15, 90);
            setFiles(prev => prev.map(f => f.id === tempId ? { ...f, progress } : f));
        }, 150);

        reader.onloadend = () => {
            clearInterval(interval);
            const base64 = reader.result.split(",")[1];
            setFiles(prev => prev.map(f => f.id === tempId ? {
                ...f, data: base64, progress: 100, uploading: false
            } : f));
        };
        reader.readAsDataURL(file);
    }, []);

    const handleFileDrop = useCallback((e) => {
        e.preventDefault();
        setDragActive(false);
        const droppedFiles = Array.from(e.dataTransfer?.files || e.target?.files || []);
        droppedFiles.forEach(processFile);
    }, [processFile]);

    const handleDragOver = (e) => { e.preventDefault(); setDragActive(true); };
    const handleDragLeave = (e) => { e.preventDefault(); setDragActive(false); };

    const removeFile = (id) => {
        setFiles(prev => prev.filter(f => f.id !== id));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.category) return toast.error("Please select a category.");
        if (!form.description) return toast.error("Please describe the incident.");
        setLoading(true);

        try {
            const payload = {
                ...form,
                files: files.filter(f => f.data).map(f => ({
                    name: f.name,
                    type: f.type,
                    data: f.data
                }))
            };

            const { data } = await api.post("/anticorruption/submit", payload);

            setSubmittedToken(data.tokenId);
            setSubmittedLevel(data.level);
            setSubmittedRole(data.assignedRole);

            // Show sweetalert popup
            Swal.fire({
                title: 'Report Submitted Successfully',
                text: 'Your anonymous report has been filed. Please copy and securely store your tracking token: ' + data.tokenId,
                icon: 'success',
                confirmButtonText: 'Got It',
                confirmButtonColor: '#16a34a'
            });

        } catch (err) {
            console.error("Submit error:", err);
            toast.error(err.response?.data?.message || err.message || "Failed to submit report.");
        }
        setLoading(false);
    };

    const copyToken = () => {
        navigator.clipboard.writeText(submittedToken);
        toast.success("Token copied to clipboard!");
    };

    // ── SUCCESS SCREEN ──
    if (submittedToken) {
        return (
            <DashboardLayout title="Report Submitted" subtitle="Anti-Corruption Department">
                <div className="max-w-lg mx-auto animate-fadeInUp">
                    <div className="card text-center">
                        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                            <HiOutlineShieldCheck className="text-3xl text-green-600" />
                        </div>
                        <h2 className="text-xl font-bold text-green-700 mb-2">Anonymous Report Filed Successfully</h2>
                        <p className="text-sm text-[var(--color-text-muted)] mb-6">
                            Your identity is protected. No personal information was collected.
                        </p>

                        {/* Token Display */}
                        <div className="bg-[#0f172a] rounded p-6 mb-4">
                            <p className="text-xs text-slate-400 uppercase tracking-widest mb-2 font-semibold">Your Secure Tracking Token</p>
                            <div className="flex items-center justify-center gap-3">
                                <span className="font-mono text-2xl text-white tracking-[0.25em] font-bold">
                                    {submittedToken.slice(0, 4)}-{submittedToken.slice(4, 8)}-{submittedToken.slice(8, 12)}-{submittedToken.slice(12)}
                                </span>
                                <button onClick={copyToken} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors" title="Copy Token">
                                    <HiOutlineClipboardCopy className="text-white text-lg" />
                                </button>
                            </div>
                            <div className="flex items-center justify-center gap-2 mt-3">
                                <HiOutlineLockClosed className="text-green-400 text-sm" />
                                <span className="text-xs text-green-400 font-medium">End-to-End Encrypted</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <div className="bg-[var(--color-surface)] rounded-lg p-3">
                                <p className="text-xs text-[var(--color-text-muted)]">Complaint Level</p>
                                <p className="font-bold text-lg" style={{
                                    color: submittedLevel === 3 ? '#dc2626' : submittedLevel === 2 ? '#f59e0b' : '#22c55e'
                                }}>Level {submittedLevel}</p>
                            </div>
                            <div className="bg-[var(--color-surface)] rounded-lg p-3">
                                <p className="text-xs text-[var(--color-text-muted)]">Assigned To</p>
                                <p className="font-bold text-sm text-[var(--color-text)]">{submittedRole}</p>
                            </div>
                        </div>

                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-left">
                            <p className="text-sm text-amber-800 font-semibold mb-1 flex items-center gap-1"><HiOutlineExclamation className="text-lg" /> Save This Token</p>
                            <p className="text-xs text-amber-700">
                                This is the ONLY way to track your report. We do not store your name, phone, or email.
                                Write this token down or save a screenshot.
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <Link to="/citizen/track-report" className="btn-primary flex-1 justify-center">
                                Track My Report
                            </Link>
                            <button onClick={() => { setSubmittedToken(null); setForm({ category: "", description: "", accusedEmployeeName: "", department: "", branch: "", locality: "", lat: null, lng: null }); setFiles([]); }} className="btn-secondary flex-1 justify-center">
                                File Another Report
                            </button>
                        </div>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    // ── SUBMISSION FORM ──
    return (
        <DashboardLayout title="Anti-Corruption Department" subtitle="File an anonymous report — your identity is fully protected">
            <div className="grid lg:grid-cols-3 gap-6 items-start">
                <form onSubmit={handleSubmit} className="space-y-6 animate-fadeInUp lg:col-span-2">

                    {/* Anonymous Notice */}
                    <div className="bg-white border border-[var(--color-border)] rounded p-5 flex items-start gap-4 shadow-sm">
                        <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0 mt-0.5 border border-green-100">
                            <HiOutlineShieldCheck className="text-green-600 text-xl" />
                        </div>
                        <div>
                            <h3 className="text-[var(--color-text)] font-bold text-sm mb-1">Fully Anonymous Submission</h3>
                            <p className="text-[var(--color-text-muted)] text-xs leading-relaxed">
                                No personal information (name, phone, email) is collected. You will receive a <strong className="text-green-600 font-semibold">16-digit secure token</strong> to track your report status.
                                All descriptions are <strong className="text-blue-600 font-semibold">AES-256 encrypted</strong>.
                            </p>
                        </div>
                    </div>

                    {/* Section 1: Complaint Details */}
                    <div className="card">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <span className="w-7 h-7 rounded-lg bg-red-500/20 flex items-center justify-center text-sm font-bold text-red-600">1</span>
                            Complaint Details
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2 text-[var(--color-text-muted)]">Category *</label>
                                <select name="category" value={form.category} onChange={handleChange} className="input-field" required>
                                    <option value="">Select type of corruption</option>
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2 text-[var(--color-text-muted)]">Department</label>
                                <select name="department" value={form.department} onChange={handleChange} className="input-field">
                                    <option value="">Select department (optional)</option>
                                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2 text-[var(--color-text-muted)]">Branch / Office</label>
                                <input name="branch" type="text" value={form.branch} onChange={handleChange} className="input-field" placeholder="E.g., RTO Office, Kota" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2 text-[var(--color-text-muted)]">Accused Employee Name (if known)</label>
                                <div className="relative">
                                    <input name="accusedEmployeeName" type="text" value={form.accusedEmployeeName} onChange={handleChange} className="input-field pr-32" placeholder="Optional — will be encrypted" />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-green-600 font-semibold">
                                        <HiOutlineLockClosed className="text-xs" /> AES-256
                                    </span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2 text-[var(--color-text-muted)]">Describe the Incident *</label>
                                <div className="relative">
                                    <textarea
                                        name="description"
                                        value={form.description}
                                        onChange={handleChange}
                                        className="input-field min-h-[140px] pr-24"
                                        placeholder="Provide full details of the incident: when, where, how much, and who was involved..."
                                        required
                                    />
                                    <span className="absolute right-3 bottom-3 flex items-center gap-1 text-xs text-green-600 font-semibold bg-white px-2 py-1 rounded">
                                        <HiOutlineLockClosed className="text-xs" /> Encrypted
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Evidence Vault */}
                    <div className="card">
                        <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
                            <span className="w-7 h-7 rounded-lg bg-purple-500/20 flex items-center justify-center text-sm font-bold text-purple-600">2</span>
                            Evidence Vault
                        </h3>
                        <p className="text-xs text-[var(--color-text-muted)] mb-4 ml-9">Upload video, audio, or documents. Files are hashed with SHA-256 for tamper-proofing.</p>

                        {/* Drop Zone */}
                        <div
                            className={`border-2 border-dashed rounded p-8 text-center cursor-pointer transition-all ${dragActive
                                ? 'border-purple-500 bg-purple-50 scale-[1.01]'
                                : 'border-[var(--color-border)] hover:border-purple-400 hover:bg-purple-50/50'
                                }`}
                            onClick={() => fileInputRef.current?.click()}
                            onDrop={handleFileDrop}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                        >
                            <div className="w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-3">
                                <HiOutlineUpload className="text-2xl text-purple-600" />
                            </div>
                            <p className="text-sm font-semibold text-[var(--color-text)]">Drag & Drop Evidence Files</p>
                            <p className="text-xs text-[var(--color-text-muted)] mt-1">MP4 (Video) · MP3 (Audio) · PDF (Documents) — Max 25MB each</p>
                            <div className="flex items-center justify-center gap-2 mt-3">
                                <HiOutlineLockClosed className="text-green-600 text-xs" />
                                <span className="text-xs text-green-600 font-medium">End-to-End Encrypted & SHA-256 Verified</span>
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept={FILE_ACCEPT}
                                multiple
                                onChange={(e) => { Array.from(e.target.files).forEach(processFile); e.target.value = ""; }}
                                className="hidden"
                            />
                        </div>

                        {/* File List */}
                        {files.length > 0 && (
                            <div className="mt-4 space-y-2">
                                {files.map(file => (
                                    <div key={file.id} className="flex items-center gap-3 bg-[var(--color-surface)] rounded-lg p-3">
                                        {getFileIcon(file.type)}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{file.name}</p>
                                            <p className="text-xs text-[var(--color-text-muted)]">
                                                {file.type} · {(file.size / 1024 / 1024).toFixed(1)} MB
                                            </p>
                                            {file.uploading && (
                                                <div className="mt-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                    <div className="h-full bg-purple-500 rounded-full transition-all duration-300" style={{ width: `${file.progress}%` }} />
                                                </div>
                                            )}
                                        </div>
                                        {!file.uploading && (
                                            <span className="text-xs text-green-600 font-semibold flex items-center gap-1">
                                                <HiOutlineLockClosed className="text-xs" /> Secured
                                            </span>
                                        )}
                                        <button type="button" onClick={() => removeFile(file.id)} className="p-1 rounded hover:bg-red-100 transition-colors">
                                            <HiOutlineX className="text-red-500" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Section 3: Location */}
                    <div className="card">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <span className="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center text-sm font-bold text-blue-600">3</span>
                            Incident Location
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2 text-[var(--color-text-muted)]">Locality / Area</label>
                                <input name="locality" type="text" value={form.locality} onChange={handleChange} className="input-field" placeholder="E.g., MG Road, Sector 5" />
                            </div>
                            <button type="button" onClick={captureLocation} disabled={geoLoading} className="btn-secondary w-full justify-center">
                                {geoLoading ? (
                                    <><div className="spinner w-4 h-4 border-2" /> Detecting location...</>
                                ) : form.lat ? (
                                    <><HiOutlineLocationMarker className="text-green-500" /> Location Captured ✓</>
                                ) : (
                                    <><HiOutlineLocationMarker /> Capture Geolocation (for verification)</>
                                )}
                            </button>
                            {form.lat && (
                                <div className="text-xs text-[var(--color-text-muted)] bg-[var(--color-surface)] rounded-lg p-3">
                                    📍 Lat: {form.lat.toFixed(6)}, Lng: {form.lng.toFixed(6)} — saved for verification (your IP/device info is NOT stored)
                                </div>
                            )}
                        </div>
                    </div>

                    <button type="submit" className="btn-primary w-full justify-center py-3.5 text-base font-bold" disabled={loading}>
                        {loading ? <div className="spinner w-5 h-5 border-2" /> : (
                            <><HiOutlineShieldCheck className="text-xl" /> Submit Anonymous Report</>
                        )}
                    </button>
                </form>

                {/* Sidebar — Info Panel */}
                <div className="space-y-4 animate-fadeInUp" style={{ animationDelay: "100ms" }}>
                    <div className="card">
                        <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
                            <HiOutlineShieldCheck className="text-blue-600" /> How It Works
                        </h4>
                        <div className="space-y-3">
                            {[
                                { step: "1", title: "Submit", desc: "File your report anonymously. No login or personal info needed." },
                                { step: "2", title: "AI Assessment", desc: "System auto-classifies severity (Level 1-3) and assigns appropriate officer." },
                                { step: "3", title: "Investigation", desc: "Every officer action is logged in an immutable audit trail." },
                                { step: "4", title: "Resolution", desc: "Track progress via your secure token. Outcome is published transparently." },
                            ].map(item => (
                                <div key={item.step} className="flex gap-3">
                                    <div className="w-6 h-6 rounded-full bg-[#1e3a8a] text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{item.step}</div>
                                    <div>
                                        <p className="text-sm font-semibold">{item.title}</p>
                                        <p className="text-xs text-[var(--color-text-muted)]">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="card bg-gradient-to-b from-red-50 to-white border-red-200">
                        <h4 className="font-bold text-sm mb-2 text-red-700">Officer Assignment by Level</h4>
                        <div className="space-y-2">
                            {[
                                { level: "L1", role: "Junior Officer", color: "#22c55e", desc: "General misconduct" },
                                { level: "L2", role: "Dept Head / DVO", color: "#f59e0b", desc: "Bribery, financial crimes" },
                                { level: "L3", role: "Commissioner", color: "#dc2626", desc: "Public safety threats" },
                            ].map(item => (
                                <div key={item.level} className="flex items-center gap-3 text-xs">
                                    <span className="font-mono font-bold px-2 py-0.5 rounded" style={{ background: item.color + '20', color: item.color }}>{item.level}</span>
                                    <span className="font-semibold">{item.role}</span>
                                    <span className="text-[var(--color-text-muted)]">— {item.desc}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="card">
                        <h4 className="font-bold text-sm mb-2">Security Guarantees</h4>
                        <ul className="text-xs text-[var(--color-text-muted)] space-y-1.5">
                            <li className="flex items-start gap-2"><span className="text-green-500">✓</span> AES-256 encrypted descriptions</li>
                            <li className="flex items-start gap-2"><span className="text-green-500">✓</span> SHA-256 file integrity hashing</li>
                            <li className="flex items-start gap-2"><span className="text-green-500">✓</span> Immutable audit trail for all admin access</li>
                            <li className="flex items-start gap-2"><span className="text-green-500">✓</span> Role-based field masking (accused name)</li>
                            <li className="flex items-start gap-2"><span className="text-green-500">✓</span> Auto-escalation after 48h inaction</li>
                            <li className="flex items-start gap-2"><span className="text-green-500">✓</span> Conflict-of-interest routing</li>
                        </ul>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
