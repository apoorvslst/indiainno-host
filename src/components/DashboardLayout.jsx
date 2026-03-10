import Navbar from "./Navbar";

export default function DashboardLayout({ children, title, subtitle }) {
    return (
        <div style={{ minHeight: "100vh", background: "#f1f5f9" }}>
            <Navbar />
            <main style={{ marginLeft: 250, padding: "32px 32px" }}>
                {title && (
                    <div style={{ marginBottom: 32 }}>
                        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1e3a8a", marginBottom: 4 }}>{title}</h1>
                        {subtitle && <p style={{ color: "#64748b", fontSize: 14 }}>{subtitle}</p>}
                    </div>
                )}
                {children}
            </main>

            <style>{`
                @media (max-width: 768px) {
                    main { margin-left: 0 !important; padding: 16px !important; }
                }
            `}</style>
        </div>
    );
}
