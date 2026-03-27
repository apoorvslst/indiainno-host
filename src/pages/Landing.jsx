import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { HiOutlinePhone, HiOutlineLocationMarker, HiOutlineShieldCheck, HiOutlineUserGroup, HiOutlineChartBar, HiOutlineLightningBolt } from "react-icons/hi";
import axios from "axios";

const AC_API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export default function Landing() {
    const [acStats, setAcStats] = useState(null);

    useEffect(() => {
        axios.get(`${AC_API_BASE}/anticorruption/dashboard-stats`)
            .then(res => setAcStats(res.data))
            .catch(() => setAcStats({ totalReports: 0, casesResolved: 0, avgResolutionTime: 'N/A', departmentHighestIntegrity: 'N/A', resolutionRate: 0 }));
    }, []);

    return (
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#f1f5f9", fontFamily: "'Noto Sans', sans-serif", color: "#1e293b" }}>

            {/* ═══ TOP BANNER BAR ═══ */}
            <div style={{ background: "#172554", color: "#93c5fd", fontSize: 12, textAlign: "center", padding: "6px 0", letterSpacing: "0.05em" }}>
                Government of India — Public Grievance Redressal Portal
            </div>

            {/* ═══ HEADER ═══ */}
            <header style={{
                background: "#ffffff",
                borderBottom: "4px solid #f97316",
                boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                position: "sticky", top: 0, zIndex: 50,
                padding: "0 24px"
            }}>
                <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{
                            width: 40, height: 40, background: "#1e3a8a", color: "#fff",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontWeight: 800, fontSize: 16, borderRadius: 4
                        }}>CS</div>
                        <div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: "#1e3a8a", lineHeight: 1.1 }}>CivicSync</div>
                            <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}>Govt. of India Initiative</div>
                        </div>
                    </div>
                    <nav style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <Link to="/login" style={{ color: "#1e3a8a", fontWeight: 700, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.05em" }}>Citizen Login</Link>
                        <Link to="/register" style={{
                            background: "#1e3a8a", color: "#fff", padding: "8px 20px",
                            fontWeight: 700, fontSize: 13, borderRadius: 4,
                            textTransform: "uppercase", letterSpacing: "0.05em"
                        }}>Register</Link>
                    </nav>
                </div>
            </header>

            {/* ═══ HERO SECTION ═══ */}
            <section style={{ background: "#ffffff", borderBottom: "1px solid #e2e8f0", padding: "60px 24px", textAlign: "center" }}>
                <div style={{ maxWidth: 800, margin: "0 auto" }}>
                    <div style={{
                        display: "inline-block", background: "#dcfce7", color: "#166534",
                        padding: "4px 16px", fontSize: 11, fontWeight: 700,
                        textTransform: "uppercase", letterSpacing: "0.1em",
                        borderRadius: 2, border: "1px solid #86efac", marginBottom: 24
                    }}>Official Public Grievance Portal</div>

                    <h1 style={{ fontSize: 48, fontWeight: 900, color: "#1e3a8a", lineHeight: 1.15, marginBottom: 20 }}>
                        Your Voice. Your City.<br />
                        <span style={{ color: "#f97316" }}>Real Action.</span>
                    </h1>

                    <p style={{ fontSize: 18, color: "#475569", lineHeight: 1.7, marginBottom: 32, maxWidth: 650, marginLeft: "auto", marginRight: "auto" }}>
                        Report civic issues in <strong>any regional language</strong> via a simple phone call.
                        AI transcribes, geolocates, and routes your complaint to the respective department — with <strong>strict proof</strong> of resolution.
                    </p>

                    <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
                        <Link to="/register" style={{
                            background: "#f97316", color: "#fff", padding: "14px 32px",
                            fontWeight: 700, fontSize: 16, borderRadius: 4,
                            display: "inline-flex", alignItems: "center", gap: 8
                        }}>
                            <HiOutlinePhone style={{ fontSize: 20 }} />
                            File a Grievance
                        </Link>
                        <Link to="/login" style={{
                            background: "#fff", color: "#1e3a8a", padding: "14px 32px",
                            fontWeight: 700, fontSize: 16, borderRadius: 4,
                            border: "2px solid #1e3a8a",
                            display: "inline-flex", alignItems: "center", gap: 8
                        }}>
                            Track Complaint Status
                        </Link>
                    </div>
                </div>
            </section>

            {/* ═══ HOW IT WORKS ═══ */}
            <section style={{ padding: "60px 24px", background: "#f8fafc" }}>
                <div style={{ maxWidth: 1100, margin: "0 auto" }}>
                    <div style={{ textAlign: "center", marginBottom: 48 }}>
                        <h2 style={{ fontSize: 28, fontWeight: 800, color: "#1e3a8a", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                            How the System Works
                        </h2>
                        <div style={{ width: 80, height: 4, background: "#f97316", margin: "0 auto 16px auto", borderRadius: 2 }} />
                        <p style={{ color: "#64748b", fontSize: 16 }}>A transparent, 4-step process from complaint to verified resolution</p>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 }}>
                        {[
                            { step: "1", title: "Call & Report", desc: "Speak in any scheduled Indian language. AI automatically transcribes your voice." },
                            { step: "2", title: "AI Processing", desc: "Auto-categorization, geo-location detection, and 50m spatial deduplication." },
                            { step: "3", title: "Assignment", desc: "Routed to the specific local municipal engineer with strict SLA deadlines." },
                            { step: "4", title: "Verification", desc: "Geo-fenced photo proof uploaded by contractor. You vote to close the ticket." },
                        ].map((item) => (
                            <div key={item.step} style={{
                                background: "#ffffff", border: "1px solid #e2e8f0",
                                borderTop: "4px solid #1e3a8a", borderRadius: 4,
                                padding: "28px 20px 20px", textAlign: "center",
                                boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                            }}>
                                <div style={{
                                    width: 40, height: 40, borderRadius: "50%",
                                    background: "#1e3a8a", color: "#fff",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    fontWeight: 800, fontSize: 18,
                                    margin: "0 auto 16px auto"
                                }}>{item.step}</div>
                                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1e3a8a", marginBottom: 8 }}>{item.title}</h3>
                                <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══ KEY FEATURES ═══ */}
            <section style={{ padding: "60px 24px", background: "#ffffff", borderTop: "1px solid #e2e8f0" }}>
                <div style={{ maxWidth: 1100, margin: "0 auto" }}>
                    <div style={{ textAlign: "center", marginBottom: 48 }}>
                        <h2 style={{ fontSize: 28, fontWeight: 800, color: "#1e3a8a", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                            Key Features
                        </h2>
                        <div style={{ width: 80, height: 4, background: "#f97316", margin: "0 auto", borderRadius: 2 }} />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 32 }}>
                        {[
                            { icon: <HiOutlineLocationMarker style={{ fontSize: 32, color: "#1e3a8a" }} />, title: "Spatio-Temporal Deduplication", desc: "Merge hundreds of calls about the same issue into ONE ticket using 50-meter geo-clustering." },
                            { icon: <HiOutlineShieldCheck style={{ fontSize: 32, color: "#16a34a" }} />, title: "Geo-Fenced Proof of Work", desc: "Contractors MUST upload resolution photos from exact GPS coordinates. Spoofing is blocked." },
                            { icon: <HiOutlineUserGroup style={{ fontSize: 32, color: "#ea580c" }} />, title: "Citizen Validation Loop", desc: "Original reporters peer-review the fix. If false, the contractor loses trust metrics." },
                            { icon: <HiOutlinePhone style={{ fontSize: 32, color: "#2563eb" }} />, title: "Multilingual Voice NLP", desc: "22+ languages via Sarvam AI. Citizens don't need smartphones to report issues." },
                            { icon: <HiOutlineChartBar style={{ fontSize: 32, color: "#475569" }} />, title: "Officer Heatmaps", desc: "Live dashboard for District Magistrates to visualize infrastructure decay clusters." },
                            { icon: <HiOutlineLightningBolt style={{ fontSize: 32, color: "#f59e0b" }} />, title: "Auto-Routing to Departments", desc: "Instantly forwards to PWD, Water Board, or Electricity based on NLP intent." },
                        ].map((f, i) => (
                            <div key={i} style={{
                                display: "flex", gap: 16, padding: 20,
                                border: "1px solid #f1f5f9", borderRadius: 4,
                                transition: "background 0.2s"
                            }}
                                onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                            >
                                <div style={{ flexShrink: 0, marginTop: 2 }}>{f.icon}</div>
                                <div>
                                    <h3 style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", marginBottom: 6 }}>{f.title}</h3>
                                    <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>{f.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══ TRANSPARENCY DASHBOARD ═══ */}
            <section style={{ padding: "60px 24px", background: "#f0fdf4", borderTop: "1px solid #bbf7d0" }}>
                <div style={{ maxWidth: 1100, margin: "0 auto" }}>
                    <div style={{ textAlign: "center", marginBottom: 48 }}>
                        <h2 style={{ fontSize: 28, fontWeight: 800, color: "#166534", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                            Anti-Corruption Transparency
                        </h2>
                        <div style={{ width: 80, height: 4, background: "#16a34a", margin: "0 auto 16px auto", borderRadius: 2 }} />
                        <p style={{ color: "#15803d", fontSize: 16 }}>Real-time metrics from our Anti-Corruption Department</p>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 }}>
                        {[
                            { value: acStats?.totalReports ?? '—', label: "Total Reports", color: "#1e3a8a", bg: "#eff6ff" },
                            { value: acStats?.casesResolved ?? '—', label: "Cases Resolved", color: "#16a34a", bg: "#f0fdf4" },
                            { value: acStats?.avgResolutionTime ?? '—', label: "Avg Resolution Time", color: "#f59e0b", bg: "#fffbeb" },
                            { value: acStats?.departmentHighestIntegrity ?? '—', label: "Highest Integrity Dept", color: "#7c3aed", bg: "#f5f3ff" },
                        ].map((stat, i) => (
                            <div key={i} style={{
                                background: "#ffffff", border: "1px solid #e2e8f0",
                                borderTop: `4px solid ${stat.color}`, borderRadius: 8,
                                padding: "28px 20px", textAlign: "center",
                                boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
                            }}>
                                <div style={{ fontSize: 36, fontWeight: 900, color: stat.color, marginBottom: 8, lineHeight: 1 }}>
                                    {stat.value}
                                </div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                    {stat.label}
                                </div>
                            </div>
                        ))}
                    </div>

                    {acStats && acStats.resolutionRate > 0 && (
                        <div style={{ textAlign: "center", marginTop: 32 }}>
                            <div style={{
                                display: "inline-flex", alignItems: "center", gap: 8,
                                background: "#dcfce7", color: "#166534",
                                padding: "6px 20px", borderRadius: 20,
                                fontSize: 14, fontWeight: 700
                            }}>
                                <HiOutlineShieldCheck style={{ fontSize: 18 }} />
                                {acStats.resolutionRate}% Resolution Rate
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* ═══ CTA ═══ */}
            <section style={{ padding: "48px 24px", background: "#1e3a8a", textAlign: "center" }}>
                <div style={{ maxWidth: 700, margin: "0 auto" }}>
                    <h2 style={{ fontSize: 28, fontWeight: 800, color: "#ffffff", marginBottom: 12 }}>
                        Ready to make your city accountable?
                    </h2>
                    <p style={{ color: "#93c5fd", marginBottom: 24, fontSize: 16 }}>Join thousands of citizens using CivicSync to drive real change.</p>
                    <Link to="/register" style={{
                        background: "#f97316", color: "#fff", padding: "14px 40px",
                        fontWeight: 700, fontSize: 16, borderRadius: 4,
                        display: "inline-block"
                    }}>Create Free Account</Link>
                </div>
            </section>

            {/* ═══ FOOTER ═══ */}
            <footer style={{
                background: "#0f172a", color: "#cbd5e1",
                padding: "32px 24px", marginTop: "auto"
            }}>
                <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{
                            width: 36, height: 36, background: "#fff", color: "#1e3a8a",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontWeight: 800, fontSize: 14, borderRadius: 4
                        }}>CS</div>
                        <div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9" }}>CivicSync Platform</div>
                            <div style={{ fontSize: 11, color: "#64748b" }}>Public Grievance Redressal System</div>
                        </div>
                    </div>
                    <div style={{ fontSize: 13, color: "#64748b", textAlign: "right" }}>
                        © 2026 CivicSync Initiative. Designed for transparent governance.
                    </div>
                </div>
            </footer>
        </div>
    );
}
