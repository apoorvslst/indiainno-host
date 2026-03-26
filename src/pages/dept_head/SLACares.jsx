import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import DashboardLayout from "../../components/DashboardLayout";
import api from "../../utils/api";
import { getRoleTitle } from "../../config/roleConfig";
import toast from "react-hot-toast";

export default function SLACares() {
  const { userProfile } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [juniors, setJuniors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime] = useState(() => Date.now());

  const mode = userProfile?.mode || "urban";
  const juniorTitle = getRoleTitle("junior", mode);

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
        console.error("Fetch error:", err);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const delayedTickets = tickets.filter(t => {
    if (["Closed", "Invalid_Spam", "Rejected"].includes(t.status)) return false;
    if (!t.slaDeadline) return false;
    return new Date(t.slaDeadline) < new Date();
  });

  const nearSLA = tickets.filter(t => {
    if (["Closed", "Invalid_Spam", "Rejected"].includes(t.status)) return false;
    if (!t.slaDeadline) return false;
    const hoursLeft = (new Date(t.slaDeadline) - new Date()) / (1000 * 60 * 60);
    return hoursLeft > 0 && hoursLeft <= 6;
  });

  const handlePenalty = async (juniorId, points) => {
    try {
      await api.post(`/users/${juniorId}/penalty`, { points });
      const res = await api.get("/users?role=junior");
      setJuniors(res.data || []);
      toast.success(`${points} penalty points applied`);
    } catch (err) {
      toast.error("Failed to apply penalty");
    }
  };

  const getJuniorPerformance = (juniorId) => {
    const junior = juniors.find(j => j._id === juniorId);
    return junior?.performancePoints ?? 100;
  };

  return (
    <DashboardLayout title="SLA Cares" subtitle="Cases breaching or near SLA deadline">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="animate-fadeInUp">
          <h2 className="text-lg font-bold mb-4 text-[#ef4444]">⚠ SLA Breached ({delayedTickets.length})</h2>
          {loading ? (
            <div className="flex justify-center py-10"><div className="spinner" /></div>
          ) : delayedTickets.length === 0 ? (
            <div className="card p-6 text-center">
              <p className="text-[var(--color-text-muted)]">No SLA breaches! 🎉</p>
            </div>
          ) : (
            <div className="space-y-3">
              {delayedTickets.map(t => {
                const assignee = t.assignedJuniorId || t.assignedEngineerId;
                const assigneeId = typeof assignee === "object" ? assignee?._id : assignee;
                const assigneeName = typeof assignee === "object" ? assignee?.name : "Unassigned";
                const daysOverdue = Math.floor((currentTime - new Date(t.slaDeadline)) / (1000 * 60 * 60 * 24));
                const points = getJuniorPerformance(assigneeId);

                return (
                  <div key={t._id} className="card p-4" style={{ borderLeft: "4px solid #ef4444" }}>
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-semibold">{(t.primaryCategory || "").replace(/_/g, " ")}</span>
                        <p className="text-xs text-[#ef4444] mt-1">{daysOverdue} days overdue</p>
                        <p className="text-xs text-[var(--color-text-muted)]">Assigned: {assigneeName} ({points} pts)</p>
                      </div>
                      <div className="text-right">
                        <span className="badge" style={{ background: "#fecaca", color: "#991b1b" }}>{daysOverdue}d</span>
                        {assigneeId && (
                          <div className="mt-2 flex gap-1">
                            <button
                              onClick={() => handlePenalty(assigneeId, 5)}
                              className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded"
                            >-5</button>
                            <button
                              onClick={() => handlePenalty(assigneeId, 10)}
                              className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded"
                            >-10</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="animate-fadeInUp" style={{ animationDelay: "100ms" }}>
          <h2 className="text-lg font-bold mb-4 text-[#f59e0b]">⏰ Near SLA Deadline ({nearSLA.length})</h2>
          {nearSLA.length === 0 ? (
            <div className="card p-6 text-center">
              <p className="text-[var(--color-text-muted)]">No cases near deadline</p>
            </div>
          ) : (
            <div className="space-y-3">
              {nearSLA.map(t => {
                const hoursLeft = Math.floor((new Date(t.slaDeadline) - new Date()) / (1000 * 60 * 60));
                const assignee = t.assignedJuniorId || t.assignedEngineerId;
                const assigneeName = typeof assignee === "object" ? assignee?.name : "Unassigned";

                return (
                  <div key={t._id} className="card p-4" style={{ borderLeft: "4px solid #f59e0b" }}>
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-semibold">{(t.primaryCategory || "").replace(/_/g, " ")}</span>
                        <p className="text-xs text-[#f59e0b] mt-1">{hoursLeft} hours left</p>
                        <p className="text-xs text-[var(--color-text-muted)]">Assigned: {assigneeName}</p>
                      </div>
                      <span className="badge" style={{ background: "#fef3c7", color: "#92400e" }}>{hoursLeft}h</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
