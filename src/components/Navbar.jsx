import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { HiOutlineMenu, HiOutlineX, HiOutlineLogout } from "react-icons/hi";
import { useState } from "react";

const NAV_LINKS = {
    user: [
        { to: "/citizen", label: "Dashboard", icon: "📊" },
        { to: "/citizen/submit", label: "Submit Complaint", icon: "📝" },
        { to: "/citizen/complaints", label: "My Complaints", icon: "📋" },
        { to: "/citizen/map", label: "City Map", icon: "🗺️" },
    ],
    engineer: [
        { to: "/engineer", label: "Dashboard", icon: "🔧" },
    ],
    admin: [
        { to: "/admin", label: "Dashboard", icon: "📊" },
        { to: "/admin/tickets", label: "Tickets", icon: "🎫" },
        { to: "/admin/map", label: "Live Map", icon: "🗺️" },
        { to: "/admin/engineers", label: "Engineers", icon: "👷" },
        { to: "/admin/departments", label: "Departments", icon: "🏛️" },
        { to: "/admin/manual-queue", label: "Manual Queue", icon: "📌" },
    ],
};

export default function Navbar() {
    const { user, userProfile, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = useState(false);

    if (!user) return null;

    const links = NAV_LINKS[userProfile?.role] || [];
    const roleName = userProfile?.role === "admin" ? "Senior Officer" : userProfile?.role === "engineer" ? "Engineer" : "Citizen";

    const handleLogout = async () => {
        await logout();
        navigate("/");
    };

    return (
        <>
            {/* Sidebar */}
            <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
                <div style={{ padding: "16px 20px 24px", borderBottom: "1px solid #e2e8f0" }}>
                    <Link to="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
                        <div style={{
                            width: 36, height: 36, background: "#1e3a8a", color: "#fff",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontWeight: 800, fontSize: 14, borderRadius: 4
                        }}>CS</div>
                        <div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: "#1e3a8a" }}>CivicSync</div>
                            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 500 }}>{roleName}</div>
                        </div>
                    </Link>
                </div>

                <nav style={{ display: "flex", flexDirection: "column", marginTop: 8 }}>
                    {links.map((link) => (
                        <Link
                            key={link.to}
                            to={link.to}
                            className={`sidebar-link ${location.pathname === link.to ? "active" : ""}`}
                            onClick={() => setMobileOpen(false)}
                        >
                            <span style={{ fontSize: 18 }}>{link.icon}</span>
                            <span>{link.label}</span>
                        </Link>
                    ))}
                </nav>

                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 16, borderTop: "1px solid #e2e8f0", background: "#f8fafc" }}>
                    <div style={{ padding: "0 4px", marginBottom: 12 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userProfile?.name}</p>
                        <p style={{ fontSize: 11, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userProfile?.email}</p>
                    </div>
                    <button onClick={handleLogout} className="btn-secondary" style={{ width: "100%", justifyContent: "center", fontSize: 13 }}>
                        <HiOutlineLogout style={{ fontSize: 16 }} />
                        Logout
                    </button>
                </div>
            </aside>

            {/* Mobile Toggle */}
            <button
                style={{
                    position: "fixed", top: 12, left: 12, zIndex: 50,
                    padding: 8, borderRadius: 4, background: "#fff",
                    border: "1px solid #cbd5e1", cursor: "pointer",
                    display: "none"
                }}
                className="md-hidden-toggle"
                onClick={() => setMobileOpen(!mobileOpen)}
            >
                {mobileOpen ? <HiOutlineX style={{ fontSize: 20 }} /> : <HiOutlineMenu style={{ fontSize: 20 }} />}
            </button>

            {/* Mobile Backdrop */}
            {mobileOpen && (
                <div
                    style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 30 }}
                    onClick={() => setMobileOpen(false)}
                />
            )}

            <style>{`
                @media (max-width: 768px) {
                    .md-hidden-toggle { display: block !important; }
                }
            `}</style>
        </>
    );
}
