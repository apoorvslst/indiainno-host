import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import DashboardLayout from "../../components/DashboardLayout";
import api from "../../utils/api";
import { getRoleTitle } from "../../config/roleConfig";
import toast from "react-hot-toast";

export default function PendingCases() {
  const { userProfile } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [juniors, setJuniors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);

  const mode = userProfile?.mode || "urban";
  const roleTitle = getRoleTitle("dept_head", mode);
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

  const pendingTickets = tickets.filter(t => 
    ["Registered", "Open"].includes(t.status) && !["Closed", "Invalid_Spam", "Rejected"].includes(t.status)
  );

  const handleAssign = async (ticketId, juniorId) => {
    try {
      await api.put(`/tickets/master/${ticketId}`, {
        assignedJuniorId: juniorId,
        status: "Assigned",
      });
      const res = await api.get("/tickets/master");
      setTickets(res.data || []);
      toast.success("Assigned successfully");
    } catch (err) {
      toast.error("Failed to assign");
    }
  };

  return (
    <DashboardLayout title="Pending Cases" subtitle="Cases awaiting assignment">
      <div className="flex gap-6">
        <div className="flex-1">
          {loading ? (
            <div className="flex justify-center py-10"><div className="spinner" /></div>
          ) : pendingTickets.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-lg">✅ All cases assigned!</p>
              <p className="text-sm text-[var(--color-text-muted)] mt-2">No pending cases at the moment</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {pendingTickets.map(t => (
                <div
                  key={t._id || t.id}
                  className={`card p-4 cursor-pointer transition-all ${selectedTicket?._id === t._id ? 'ring-2 ring-[var(--color-primary)]' : ''}`}
                  onClick={() => setSelectedTicket(t)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-semibold">{(t.primaryCategory || "").replace(/_/g, " ")}</span>
                    <span className={`badge severity-${(t.severity || "low").toLowerCase()}`}>{t.severity}</span>
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)]">{t.description?.substring(0, 60)}...</p>
                  <p className="text-xs mt-2">📍 {t.landmark || "No landmark"}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedTicket && (
          <div className="w-80">
            <div className="card p-4 sticky top-4">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-bold">Case Details</h3>
                <button onClick={() => setSelectedTicket(null)} className="text-xl">×</button>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-xs text-[var(--color-text-muted)]">Category</span>
                  <p className="font-semibold">{(selectedTicket.primaryCategory || "").replace(/_/g, " ")}</p>
                </div>
                <div>
                  <span className="text-xs text-[var(--color-text-muted)]">Description</span>
                  <p>{selectedTicket.description}</p>
                </div>
                <div>
                  <span className="text-xs text-[var(--color-text-muted)]">Location</span>
                  <p>{selectedTicket.landmark || "Needs manual geocoding"}</p>
                </div>
                <div className="pt-3 border-t">
                  <select
                    className="w-full p-2 text-sm border rounded-lg"
                    onChange={(e) => handleAssign(selectedTicket._id, e.target.value)}
                  >
                    <option value="">Assign to {juniorTitle}...</option>
                    {juniors.filter(j => j.active).map(j => (
                      <option key={j._id} value={j._id}>{j.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
