import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import DEPARTMENTS from "../data/departments";
import { getRoleTitle, getRoleDescription } from "../config/roleConfig";
import toast from "react-hot-toast";

export default function Register() {
    const [form, setForm] = useState({
        name: "", phone: "", pin: "", confirmPin: "", email: "",
        city: "", role: "citizen", department: "",
        mode: "urban", district: "", block: "", village: "",
        officialSubRole: "junior",
    });
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
    const handlePinChange = (e) => setForm({ ...form, [e.target.name]: e.target.value.replace(/\D/g, '').slice(0, 6) });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (form.pin !== form.confirmPin) return toast.error("PINs don't match");
        if (form.pin.length < 4) return toast.error("PIN must be at least 4 digits");
        if (!form.phone || form.phone.replace(/\D/g, '').length < 10) return toast.error("Please enter a valid phone number");
        setLoading(true);
        try {
            const finalRole = form.role === "official" ? form.officialSubRole : "citizen";
            await register({
                name: form.name,
                phone: form.phone,
                pin: form.pin,
                email: form.email || undefined,
                city: form.city,
                role: finalRole,
                department: form.department || null,
                mode: form.mode,
                district: form.district,
                block: form.block,
                village: form.village,
            });
            toast.success("Account created successfully!");
            navigate("/");
        } catch (err) {
            toast.error(err?.response?.data?.message || err.message || "Registration failed");
        }
        setLoading(false);
    };

    const isOfficial = form.role === "official";
    const mode = form.mode;

    const modeToggleStyle = (m) => ({
        flex: 1, padding: "10px 16px", border: "none",
        background: form.mode === m ? (m === "urban" ? "#1e3a8a" : "#15803d") : "transparent",
        color: form.mode === m ? "#fff" : "#64748b",
        fontWeight: 700, fontSize: 13, cursor: "pointer", borderRadius: 6,
        transition: "all 0.25s ease",
    });

    const mainRoleStyle = (val) => ({
        flex: 1, padding: "18px 12px", textAlign: "center", cursor: "pointer",
        border: form.role === val ? "2px solid #1e3a8a" : "1px solid #cbd5e1",
        background: form.role === val ? "#eff6ff" : "#fff",
        borderRadius: 10, transition: "all 0.2s",
        boxShadow: form.role === val ? "0 2px 10px rgba(30,58,138,0.15)" : "none",
    });

    const subRoleStyle = (val) => ({
        flex: 1, padding: "12px 8px", textAlign: "center", cursor: "pointer",
        border: form.officialSubRole === val ? "2px solid #ea580c" : "1px solid #e2e8f0",
        background: form.officialSubRole === val ? "#fff7ed" : "#fafafa",
        borderRadius: 8, transition: "all 0.2s",
        boxShadow: form.officialSubRole === val ? "0 2px 8px rgba(234,88,12,0.12)" : "none",
    });

    const subRoles = [
        { value: "junior", icon: "🔧" },
        { value: "dept_head", icon: "📋" },
        { value: "officer", icon: "🏛️" },
    ];

    const labelStyle = { display: "block", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6 };

    return (
        <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f0f4ff 0%, #e0e7ff 50%, #f1f5f9 100%)", display: "flex", flexDirection: "column" }}>
            {/* Top bar */}
            <div style={{ background: "linear-gradient(90deg, #1e3a8a, #1e40af)", padding: "14px 24px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 2px 12px rgba(30,58,138,0.3)" }}>
                <Link to="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
                    <div style={{ width: 36, height: 36, background: "#fff", color: "#1e3a8a", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, borderRadius: 6, boxShadow: "0 2px 6px rgba(0,0,0,0.15)" }}>CS</div>
                    <span style={{ color: "#fff", fontWeight: 700, fontSize: 17 }}>CivicSync</span>
                </Link>
            </div>

            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
                <div style={{ width: "100%", maxWidth: 540 }}>
                    <div style={{ textAlign: "center", marginBottom: 28 }}>
                        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#1e3a8a", marginBottom: 6 }}>Create Account</h1>
                        <p style={{ color: "#64748b", fontSize: 14 }}>Register on the CivicSync platform</p>
                    </div>

                    <form onSubmit={handleSubmit} style={{
                        background: "#fff", border: "1px solid #cbd5e1",
                        borderTop: `4px solid ${mode === "urban" ? "#1e3a8a" : "#15803d"}`,
                        borderRadius: 8, padding: 32,
                        boxShadow: "0 4px 20px rgba(0,0,0,0.06)"
                    }}>
                        {/* Urban/Rural Toggle */}
                        <div style={{ marginBottom: 20 }}>
                            <label style={labelStyle}>Area Mode</label>
                            <div style={{ display: "flex", gap: 4, background: "#e2e8f0", borderRadius: 8, padding: 4 }}>
                                <button type="button" onClick={() => setForm({ ...form, mode: "urban" })} style={modeToggleStyle("urban")} id="register-mode-urban">
                                    🏙️ Urban
                                </button>
                                <button type="button" onClick={() => setForm({ ...form, mode: "rural" })} style={modeToggleStyle("rural")} id="register-mode-rural">
                                    🌾 Rural
                                </button>
                            </div>
                            <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 6, textAlign: "center" }}>
                                {mode === "urban" ? "Municipal Corporation / Urban Local Body (ULB)" : "Panchayati Raj / Block Development"}
                            </p>
                        </div>

                        {/* Citizen vs Official — 2 main cards */}
                        <div style={{ marginBottom: 20 }}>
                            <label style={labelStyle}>I am a</label>
                            <div style={{ display: "flex", gap: 12 }}>
                                <button type="button" onClick={() => setForm({ ...form, role: "citizen" })} style={mainRoleStyle("citizen")} id="register-role-citizen">
                                    <div style={{ fontSize: 28, marginBottom: 6 }}>👤</div>
                                    <div style={{ fontSize: 15, fontWeight: 800, color: "#1e293b" }}>Citizen</div>
                                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>Report & track civic issues</div>
                                </button>
                                <button type="button" onClick={() => setForm({ ...form, role: "official" })} style={mainRoleStyle("official")} id="register-role-official">
                                    <div style={{ fontSize: 28, marginBottom: 6 }}>🏛️</div>
                                    <div style={{ fontSize: 15, fontWeight: 800, color: "#1e293b" }}>Official</div>
                                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>Manage & resolve operations</div>
                                </button>
                            </div>
                        </div>

                        {/* Official Sub-Roles (only visible when Official selected) */}
                        {isOfficial && (
                            <div style={{
                                marginBottom: 20, padding: 16, background: "#fef9f4",
                                border: "1px solid #fed7aa", borderRadius: 10,
                                animation: "fadeIn 0.3s ease"
                            }}>
                                <label style={{ ...labelStyle, color: "#c2410c", marginBottom: 10 }}>Select Official Role</label>
                                <div style={{ display: "flex", gap: 8 }}>
                                    {subRoles.map((r) => (
                                        <button key={r.value} type="button"
                                            onClick={() => setForm({ ...form, officialSubRole: r.value })}
                                            style={subRoleStyle(r.value)} id={`register-subrole-${r.value}`}>
                                            <div style={{ fontSize: 20, marginBottom: 3 }}>{r.icon}</div>
                                            <div style={{ fontSize: 12, fontWeight: 700, color: "#1e293b", lineHeight: 1.2 }}>
                                                {getRoleTitle(r.value, mode)}
                                            </div>
                                            <div style={{ fontSize: 9, color: "#94a3b8", marginTop: 3, lineHeight: 1.2 }}>
                                                {getRoleDescription(r.value, mode).substring(0, 50)}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Name */}
                        <div style={{ marginBottom: 16 }}>
                            <label style={labelStyle}>Full Name</label>
                            <input name="name" type="text" value={form.name} onChange={handleChange} className="input-field" placeholder="Your full name" required id="register-name" />
                        </div>

                        {/* Phone Number (primary identifier) */}
                        <div style={{ marginBottom: 16 }}>
                            <label style={labelStyle}>Phone Number <span style={{ color: "#ef4444" }}>*</span></label>
                            <input name="phone" type="tel" value={form.phone} onChange={handleChange}
                                className="input-field" placeholder="+91 9876543210" required id="register-phone"
                                style={{ fontSize: 16, letterSpacing: "0.5px" }} />
                            <p style={{ fontSize: 10, color: "#94a3b8", marginTop: 4 }}>This will be your login ID</p>
                        </div>

                        {/* Email (optional) */}
                        <div style={{ marginBottom: 16 }}>
                            <label style={labelStyle}>Email <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 400 }}>(optional)</span></label>
                            <input name="email" type="email" value={form.email} onChange={handleChange} className="input-field" placeholder="you@example.com" id="register-email" />
                        </div>

                        {/* City */}
                        <div style={{ marginBottom: 16 }}>
                            <label style={labelStyle}>City / Town</label>
                            <input name="city" type="text" value={form.city} onChange={handleChange} className="input-field" placeholder="e.g. Jaipur" required id="register-city" />
                        </div>

                        {/* Rural-specific fields */}
                        {mode === "rural" && (
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
                                <div>
                                    <label style={labelStyle}>District</label>
                                    <input name="district" type="text" value={form.district} onChange={handleChange} className="input-field" placeholder="e.g. Kota" id="register-district" />
                                </div>
                                <div>
                                    <label style={labelStyle}>Block</label>
                                    <input name="block" type="text" value={form.block} onChange={handleChange} className="input-field" placeholder="e.g. Ladpura" id="register-block" />
                                </div>
                                <div>
                                    <label style={labelStyle}>Village</label>
                                    <input name="village" type="text" value={form.village} onChange={handleChange} className="input-field" placeholder="e.g. Nanta" id="register-village" />
                                </div>
                            </div>
                        )}

                        {/* Department for officials */}
                        {isOfficial && (
                            <div style={{ marginBottom: 16 }}>
                                <label style={labelStyle}>Department</label>
                                <select name="department" value={form.department} onChange={handleChange} className="input-field" id="register-department">
                                    <option value="">Select Department</option>
                                    {DEPARTMENTS.map((d) => (
                                        <option key={d.id} value={d.id}>{d.icon} {d.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* PIN */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
                            <div>
                                <label style={labelStyle}>Set PIN <span style={{ color: "#ef4444" }}>*</span></label>
                                <input name="pin" type="password" value={form.pin} onChange={handlePinChange}
                                    className="input-field" placeholder="4-6 digits" required id="register-pin"
                                    inputMode="numeric" maxLength={6}
                                    style={{ fontSize: 20, letterSpacing: "6px", textAlign: "center", fontWeight: 700 }} />
                            </div>
                            <div>
                                <label style={labelStyle}>Confirm PIN</label>
                                <input name="confirmPin" type="password" value={form.confirmPin} onChange={handlePinChange}
                                    className="input-field" placeholder="Re-enter" required id="register-confirm-pin"
                                    inputMode="numeric" maxLength={6}
                                    style={{ fontSize: 20, letterSpacing: "6px", textAlign: "center", fontWeight: 700 }} />
                            </div>
                        </div>

                        <button type="submit" className="btn-primary" style={{
                            width: "100%", justifyContent: "center", padding: "13px",
                            borderRadius: 8, fontSize: 14, fontWeight: 700,
                            background: mode === "urban" ? "#1e3a8a" : "#15803d"
                        }} disabled={loading} id="register-submit">
                            {loading ? <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> : "Create Account"}
                        </button>

                        <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "#64748b" }}>
                            Already have an account?{" "}
                            <Link to="/login" style={{ color: "#1e3a8a", fontWeight: 600 }}>Sign In</Link>
                        </p>
                    </form>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
}
