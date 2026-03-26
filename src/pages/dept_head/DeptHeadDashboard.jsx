import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../contexts/AuthContext";
import DashboardLayout from "../../components/DashboardLayout";
import api from "../../utils/api";
import { getRoleTitle } from "../../config/roleConfig";
import { HiOutlineTicket, HiOutlineUsers, HiOutlineExclamationCircle, HiOutlineChartPie, HiOutlineBan } from "react-icons/hi";
import { Link } from "react-router-dom";
import DEPARTMENTS from "../../data/departments";
import toast from "react-hot-toast";

export default function DeptHeadDashboard() {
  const { userProfile } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [juniors, setJuniors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [banModal, setBanModal] = useState({ show: false, ticket: null, phone: '' });
  const [currentTime] = useState(() => Date.now());

  const mode = userProfile?.mode || "urban";
  const roleTitle = getRoleTitle("dept_head", mode);
  const juniorTitle = getRoleTitle("junior", mode);
  const deptInfo = DEPARTMENTS.find(d => d.id === userProfile?.department);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ticketsRes, juniorsRes] = await Promise.all([
          api.get("/tickets/master"),
          api.get("/users?role=junior"),
        ]);
        setTickets(ticketsRes.data || []);
        setJuniors(juniorsRes.data || []);
      } catch (err) {
        console.error("DeptHead fetch error:", err);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const activeTickets = tickets.filter(t => !["Closed", "Invalid_Spam", "Rejected"].includes(t.status));
  const pendingTickets = activeTickets.filter(t => t.status === "Registered" || t.status === "Open");
  const delayedTickets = activeTickets.filter(t => {
    if (!t.slaDeadline) return false;
    return new Date(t.slaDeadline) < new Date();
  });

    const handleAssignJunior = async (ticketId, juniorId) => {
    try {
      await api.put(`/tickets/master/${ticketId}`, {
        assignedJuniorId: juniorId,
        assignedEngineerId: juniorId,
        status: "Assigned",
      });
      const res = await api.get("/tickets/master");
      setTickets(res.data || []);
      toast.success("Junior assigned successfully");
    } catch {
      toast.error("Failed to assign");
    }
  };

    const handleBanCitizen = async (ticket) => {
    if (!ticket.complainantPhone) {
      toast.error("No phone number available for this citizen");
      return;
    }
    setBanModal({ show: true, ticket, phone: ticket.complainantPhone });
  };

  const confirmBan = async (reason) => {
    try {
      const citizenRes = await api.get(`/users?phone=${banModal.phone}`);
      const citizen = citizenRes.data?.[0];
      if (!citizen) {
        toast.error("Citizen not found");
        setBanModal({ show: false, ticket: null, phone: '' });
        return;
      }
      await api.post(`/users/${citizen._id}/ban`, { reason });
      toast.success("Citizen banned successfully");
      setBanModal({ show: false, ticket: null, phone: '' });
    } catch {
      toast.error("Failed to ban citizen");
    }
  };

  const handlePenalty = async (juniorId, points) => {
    try {
      await api.post(`/users/${juniorId}/penalty`, { points });
      const res = await api.get("/users?role=junior");
      setJuniors(res.data || []);
      toast.success(`${points} penalty points deducted`);
    } catch {
      toast.error("Failed to apply penalty");
    }
  };

  const statCards = [
    { label: "Total Cases", value: tickets.length, icon: <HiOutlineTicket className="text-2xl text-[#6366f1]" />, bg: "from-[#6366f1]/10" },
    { label: "Pending Assignment", value: pendingTickets.length, icon: <HiOutlineChartPie className="text-2xl text-[#f59e0b]" />, bg: "from-[#f59e0b]/10" },
    { label: "SLA Breached", value: delayedTickets.length, icon: <HiOutlineExclamationCircle className="text-2xl text-[#ef4444]" />, bg: "from-[#ef4444]/10", textColor: "#ef4444" },
    { label: `Active ${juniorTitle}s`, value: juniors.filter(j => j.active).length, icon: <HiOutlineUsers className="text-2xl text-[#06b6d4]" />, bg: "from-[#06b6d4]/10" },
  ];

  return (
    <DashboardLayout title={`${roleTitle} Dashboard`} subtitle={deptInfo ? `${deptInfo.icon} ${deptInfo.name} — ${userProfile?.city || ""}` : "Department Operations"}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 stagger">
        {statCards.map((s, i) => (
          <div key={i} className={`stat-card bg-gradient-to-br ${s.bg} to-transparent animate-fadeInUp`}>
            <div className="flex items-center justify-between mb-3">
              {s.icon}
              <span className="text-2xl font-bold" style={s.textColor ? { color: s.textColor } : {}}>{loading ? "—" : s.value}</span>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-6">
        <div className="flex-1 animate-fadeInUp">
          <h2 className="text-lg font-bold mb-4">{juniorTitle} Performance</h2>
          {loading ? (
            <div className="flex justify-center py-10"><div className="spinner" /></div>
          ) : juniors.length === 0 ? (
            <div className="card p-6 text-center"><p className="text-[var(--color-text-muted)]">No {juniorTitle}s found</p></div>
          ) : (
            <div className="card" style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                    <th style={{ textAlign: "left", padding: "10px 14px", fontWeight: 700, color: "#475569" }}>Name</th>
                    <th style={{ textAlign: "center", padding: "10px 14px", fontWeight: 700, color: "#475569" }}>Active</th>
                    <th style={{ textAlign: "center", padding: "10px 14px", fontWeight: 700, color: "#475569" }}>Points</th>
                    <th style={{ textAlign: "center", padding: "10px 14px", fontWeight: 700, color: "#475569" }}>Status</th>
                    <th style={{ textAlign: "center", padding: "10px 14px", fontWeight: 700, color: "#475569" }}>Penalty</th>
                  </tr>
                </thead>
                <tbody>
                  {juniors.map(j => {
                    const jTickets = tickets.filter(t =>
                      (t.assignedJuniorId?._id || t.assignedJuniorId || t.assignedEngineerId?._id || t.assignedEngineerId) === j._id &&
                      !["Closed", "Rejected"].includes(t.status)
                    );
                    const daysSinceActive = j.lastActiveDate
                      ? Math.floor((currentTime - new Date(j.lastActiveDate).getTime()) / (1000 * 60 * 60 * 24))
                      : "—";
                    const isDelayed = daysSinceActive > 5;

                    return (
                      <tr key={j._id} style={{ borderBottom: "1px solid #f1f5f9", background: isDelayed ? "#fef2f2" : "transparent" }}>
                        <td style={{ padding: "10px 14px" }}>
                          <div style={{ fontWeight: 600, color: "#1e293b" }}>{j.name}</div>
                          <div style={{ fontSize: 11, color: "#94a3b8" }}>{j.phone}</div>
                        </td>
                        <td style={{ textAlign: "center", padding: "10px 14px", fontWeight: 600 }}>{jTickets.length}</td>
                        <td style={{ textAlign: "center", padding: "10px 14px" }}>
                          <span style={{
                            fontWeight: 700,
                            color: (j.performancePoints || 100) > 50 ? "#22c55e" : (j.performancePoints || 100) > 20 ? "#f59e0b" : "#ef4444"
                          }}>{j.performancePoints ?? 100}</span>
                        </td>
                        <td style={{ textAlign: "center", padding: "10px 14px" }}>
                          <span className={`badge ${j.active ? "status-open" : "status-closed"}`}>
                            {j.active ? "Active" : "Locked"}
                          </span>
                        </td>
                        <td style={{ textAlign: "center", padding: "10px 14px" }}>
                          <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                            <button
                              onClick={() => handlePenalty(j._id, 5)}
                              style={{ padding: "2px 8px", fontSize: 10, background: "#fef3c7", border: "1px solid #f59e0b", borderRadius: 4, cursor: "pointer" }}
                              title="5 points penalty"
                            >-5</button>
                            <button
                              onClick={() => handlePenalty(j._id, 10)}
                              style={{ padding: "2px 8px", fontSize: 10, background: "#fee2e2", border: "1px solid #ef4444", borderRadius: 4, cursor: "pointer" }}
                              title="10 points penalty"
                            >-10</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selectedTicket && (
          <div className="w-96 animate-fadeInUp" style={{ animationDelay: "100ms" }}>
            <div className="card p-4 sticky top-4">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-bold text-lg">Ticket Details</h3>
                <button onClick={() => setSelectedTicket(null)} style={{ fontSize: 20, background: "none", border: "none", cursor: "pointer" }}>×</button>
              </div>
              <div className="space-y-3">
                <div>
                  <span className="text-xs text-[var(--color-text-muted)]">Category</span>
                  <p className="font-semibold">{(selectedTicket.primaryCategory || "").replace(/_/g, " ")}</p>
                </div>
                <div>
                  <span className="text-xs text-[var(--color-text-muted)]">Description</span>
                  <p className="text-sm">{selectedTicket.description || "—"}</p>
                </div>
                <div>
                  <span className="text-xs text-[var(--color-text-muted)]">Location</span>
                  <p className="text-sm">{selectedTicket.landmark || "Coordinates pinned"}</p>
                </div>
                <div>
                  <span className="text-xs text-[var(--color-text-muted)]">Severity</span>
                  <p><span className={`badge severity-${(selectedTicket.severity || "low").toLowerCase()}`}>{selectedTicket.severity}</span></p>
                </div>
                <div>
                  <span className="text-xs text-[var(--color-text-muted)]">Complainant</span>
                  <p className="text-sm">{selectedTicket.complainantName || "Anonymous"}</p>
                  {selectedTicket.complainantPhone && (
                    <p className="text-xs text-[var(--color-text-muted)]">{selectedTicket.complainantPhone}</p>
                  )}
                </div>
                <div className="pt-3 border-t">
                  <select
                    style={{ width: "100%", padding: "8px 12px", fontSize: 13, border: "1px solid #cbd5e1", borderRadius: 6, background: "#f8fafc" }}
                    defaultValue={selectedTicket.assignedJuniorId?._id || selectedTicket.assignedEngineerId?._id || ""}
                    onChange={(e) => { if (e.target.value) handleAssignJunior(selectedTicket._id || selectedTicket.id, e.target.value); }}
                  >
                    <option value="">Assign to {juniorTitle}...</option>
                    {juniors.filter(j => j.active).map(j => (
                      <option key={j._id} value={j._id}>{j.name} ({j.performancePoints ?? 100}pts)</option>
                    ))}
                  </select>
                </div>
                {selectedTicket.complainantPhone && (
                  <div className="pt-3 border-t">
                    <button
                      onClick={() => handleBanCitizen(selectedTicket)}
                      style={{ width: "100%", padding: "6px 12px", fontSize: 11, background: "#fee2e2", color: "#991b1b", border: "1px solid #ef4444", borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}
                    >
                      <HiOutlineBan /> Ban Citizen (Fake Case)
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {!selectedTicket && (
        <div className="mt-8 animate-fadeInUp">
          <h2 className="text-lg font-bold mb-4">Pending Assignment (Click to expand)</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingTickets.length === 0 ? (
              <div className="card p-6 text-center col-span-full"><p className="text-sm text-[var(--color-text-muted)]">All cases assigned!</p></div>
            ) : (
              pendingTickets.map(t => (
                <div
                  key={t._id || t.id}
                  className="card p-4 cursor-pointer hover:bg-[var(--color-surface)] transition-colors"
                  onClick={() => setSelectedTicket(t)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm">{(t.primaryCategory || "").replace(/_/g, " ")}</span>
                    <span className={`badge severity-${(t.severity || "low").toLowerCase()}`}>{t.severity}</span>
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)]">{t.description?.substring(0, 50) || "—"}...</p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-2">📍 {t.landmark || "No landmark"}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {delayedTickets.length > 0 && (
        <div className="mt-8 animate-fadeInUp">
          <h2 className="text-lg font-bold mb-4" style={{ color: "#ef4444" }}>⚠ SLA Breached Cases ({delayedTickets.length})</h2>
          <div className="space-y-3">
            {delayedTickets.slice(0, 5).map(t => {
              const assignee = t.assignedJuniorId || t.assignedEngineerId;
              const assigneeName = typeof assignee === "object" ? assignee?.name : "Unassigned";
              const daysOverdue = Math.floor((currentTime - new Date(t.slaDeadline).getTime()) / (1000 * 60 * 60 * 24));
              return (
                <div key={t._id || t.id} className="card p-4" style={{ borderLeft: "4px solid #ef4444" }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-sm">{(t.primaryCategory || "").replace(/_/g, " ")}</span>
                      <p className="text-xs text-[#ef4444] mt-1">{daysOverdue} days overdue — Assigned: {assigneeName}</p>
                    </div>
                    <span className="badge" style={{ background: "#fecaca", color: "#991b1b" }}>{daysOverdue}d late</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {banModal.show && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div className="card p-6" style={{ maxWidth: 400, width: "100%" }}>
            <h3 className="font-bold text-lg mb-4">Ban Citizen</h3>
            <p className="text-sm text-[var(--color-text-muted)] mb-4">
              This will permanently ban phone number: <strong>{banModal.phone}</strong>
            </p>
            <p className="text-xs text-[#ef4444] mb-4">The citizen will no longer be able to submit complaints.</p>
            <div className="flex gap-3">
              <button
                onClick={() => confirmBan("Fake case reported")}
                className="btn-primary"
                style={{ background: "#ef4444" }}
              >Confirm Ban</button>
              <button onClick={() => setBanModal({ show: false, ticket: null, phone: '' })} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
