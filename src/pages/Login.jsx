import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";

export default function Login() {
    const [phone, setPhone] = useState("");
    const [pin, setPin] = useState("");
    const [loading, setLoading] = useState(false);
    const [section, setSection] = useState("citizen");
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (pin.length < 4) return toast.error("PIN must be at least 4 digits");
        setLoading(true);
        try {
            await login(phone, pin);
            toast.success("Welcome back!");
            navigate("/");
        } catch (err) {
            toast.error(err?.response?.data?.message || err.message || "Login failed");
        }
        setLoading(false);
    };

    const sectionStyle = (s) => ({
        flex: 1, padding: "8px 16px", border: "none",
        background: section === s ? "#1e3a8a" : "transparent",
        color: section === s ? "#fff" : "#64748b",
        fontWeight: 700, fontSize: 14, cursor: "pointer", borderRadius: 6,
        transition: "all 0.25s ease",
    });

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
                <div style={{ width: "100%", maxWidth: 460 }}>
                    <div style={{ textAlign: "center", marginBottom: 28 }}>
                        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#1e3a8a", marginBottom: 6 }}>Welcome Back</h1>
                        <p style={{ color: "#64748b", fontSize: 14 }}>Sign in to your CivicSync account</p>
                    </div>

                    {/* Section Toggle */}
                    <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "#e2e8f0", borderRadius: 8, padding: 4 }}>
                        <button type="button" onClick={() => setSection("citizen")} style={sectionStyle("citizen")} id="login-citizen-tab">
                            👤 Citizen
                        </button>
                        <button type="button" onClick={() => setSection("official")} style={sectionStyle("official")} id="login-official-tab">
                            🏛️ Official
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} style={{
                        background: "#fff", border: "1px solid #cbd5e1",
                        borderTop: section === "citizen" ? "4px solid #3b82f6" : "4px solid #f97316",
                        borderRadius: 8, padding: 32,
                        boxShadow: "0 4px 20px rgba(0,0,0,0.06)"
                    }}>
                        <div style={{
                            textAlign: "center", marginBottom: 24, padding: "12px 16px",
                            background: section === "citizen" ? "#eff6ff" : "#fff7ed",
                            borderRadius: 8, border: `1px solid ${section === "citizen" ? "#bfdbfe" : "#fed7aa"}`
                        }}>
                            <p style={{ fontSize: 13, fontWeight: 600, color: section === "citizen" ? "#1d4ed8" : "#c2410c" }}>
                                {section === "citizen"
                                    ? "Citizen Portal — Track & report civic issues"
                                    : "Official Portal — Manage & resolve civic operations"
                                }
                            </p>
                        </div>

                        <div style={{ marginBottom: 20 }}>
                            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Phone Number</label>
                            <input
                                type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                                className="input-field" placeholder="+91 9876543210" required id="login-phone"
                                style={{ fontSize: 16, letterSpacing: "0.5px" }}
                            />
                        </div>

                        <div style={{ marginBottom: 24 }}>
                            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6 }}>PIN</label>
                            <input
                                type="password" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                className="input-field" placeholder="Enter 4-6 digit PIN" required id="login-pin"
                                inputMode="numeric" maxLength={6}
                                style={{ fontSize: 22, letterSpacing: "8px", textAlign: "center", fontWeight: 700 }}
                            />
                        </div>

                        <button type="submit" className="btn-primary" style={{
                            width: "100%", justifyContent: "center", padding: "13px",
                            background: section === "citizen" ? "#1e3a8a" : "#ea580c",
                            borderRadius: 8, fontSize: 14, fontWeight: 700
                        }} disabled={loading} id="login-submit">
                            {loading ? <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> : "Sign In"}
                        </button>

                        <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "#64748b" }}>
                            Don't have an account?{" "}
                            <Link to="/register" style={{ color: "#1e3a8a", fontWeight: 600 }}>Register here</Link>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
}
