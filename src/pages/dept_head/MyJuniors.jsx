import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import DashboardLayout from "../../components/DashboardLayout";
import api from "../../utils/api";
import { getRoleTitle } from "../../config/roleConfig";
import DEPARTMENTS from "../../data/departments";
import toast from "react-hot-toast";

export default function MyJuniors() {
  const { userProfile } = useAuth();
  const [juniors, setJuniors] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime] = useState(() => Date.now());

  const mode = userProfile?.mode || "urban";
  const juniorTitle = getRoleTitle("junior", mode);
  const deptInfo = DEPARTMENTS.find(d => d.id === userProfile?.department);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [juniorsRes, ticketsRes] = await Promise.all([
          api.get("/users?role=junior"),
          api.get("/tickets/master"),
        ]);
        setJuniors(juniorsRes.data || []);
        setTickets(ticketsRes.data || []);
      } catch (err) {
        console.error("Fetch error:", err);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const handlePenalty = async (juniorId, points, reason) => {
    try {
      await api.post(`/users/${juniorId}/penalty`, { points });
      const res = await api.get("/users?role=junior");
      setJuniors(res.data || []);
      toast.success(`${points} penalty applied: ${reason}`);
    } catch (err) {
      toast.error("Failed to apply penalty");
    }
  };

  const getJuniorStats = (juniorId) => {
    const jTickets = tickets.filter(t =>
      (t.assignedJuniorId?._id || t.assignedJuniorId || t.assignedEngineerId?._id || t.assignedEngineerId) === juniorId
    );
    const active = jTickets.filter(t => !["Closed", "Rejected", "Invalid_Spam"].includes(t.status)).length;
    const closed = jTickets.filter(t => t.status === "Closed").length;
    const delayed = jTickets.filter(t => {
      if (!t.slaDeadline || ["Closed", "Rejected"].includes(t.status)) return false;
      return new Date(t.slaDeadline) < new Date();
    }).length;
    return { active, closed, delayed };
  };

  return (
    <DashboardLayout title={`My ${juniorTitle}s`} subtitle={deptInfo ? `${deptInfo.icon} ${deptInfo.name}` : "Team Overview"}>
      {loading ? (
        <div className="flex justify-center py-10"><div className="spinner" /></div>
      ) : juniors.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-lg">No {juniorTitle}s assigned to your department</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {juniors.map(j => {
            const stats = getJuniorStats(j._id);
            const daysSinceActive = j.lastActiveDate
              ? Math.floor((currentTime - new Date(j.lastActiveDate)) / (1000 * 60 * 60 * 24))
              : "—";
            const isDelayed = daysSinceActive > 3;

            return (
              <div key={j._id} className={`card p-4 ${isDelayed ? 'bg-red-50 border-red-200' : ''}`}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold">{j.name}</h3>
                    <p className="text-xs text-[var(--color-text-muted)]">{j.phone}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-lg font-bold ${j.performancePoints > 50 ? 'text-green-600' : j.performancePoints > 20 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {j.performancePoints ?? 100}
                    </span>
                    <p className="text-xs text-[var(--color-text-muted)]">points</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="text-center p-2 bg-blue-50 rounded">
                    <p className="text-lg font-bold text-blue-600">{stats.active}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">Active</p>
                  </div>
                  <div className="text-center p-2 bg-green-50 rounded">
                    <p className="text-lg font-bold text-green-600">{stats.closed}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">Closed</p>
                  </div>
                  <div className="text-center p-2 bg-red-50 rounded">
                    <p className="text-lg font-bold text-red-600">{stats.delayed}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">Delayed</p>
                  </div>
                </div>

                {isDelayed && (
                  <p className="text-xs text-red-600 mb-2">⚠ Inactive for {daysSinceActive} days</p>
                )}

                <div className="flex gap-2 pt-2 border-t">
                  <button
                    onClick={() => handlePenalty(j._id, 5, "Delay in response")}
                    className="flex-1 px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded"
                  >-5 pts</button>
                  <button
                    onClick={() => handlePenalty(j._id, 10, "SLA breach")}
                    className="flex-1 px-2 py-1 text-xs bg-red-100 text-red-700 rounded"
                  >-10 pts</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
