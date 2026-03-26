import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import DashboardLayout from "../../components/DashboardLayout";
import api from "../../utils/api";
import { getRoleTitle } from "../../config/roleConfig";
import DEPARTMENTS from "../../data/departments";

export default function DeptHeadReports() {
  const { userProfile } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [juniors, setJuniors] = useState([]);
  const [loading, setLoading] = useState(true);

  const mode = userProfile?.mode || "urban";
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
        console.error("Fetch error:", err);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const deptTickets = tickets.filter(t => t.department === userProfile?.department);
  const closedTickets = deptTickets.filter(t => t.status === "Closed");
  const activeTickets = deptTickets.filter(t => !["Closed", "Rejected", "Invalid_Spam"].includes(t.status));
  const delayedTickets = activeTickets.filter(t => t.slaDeadline && new Date(t.slaDeadline) < new Date());

  const avgResolutionTime = (() => {
    const withTime = closedTickets.filter(t => t.resolvedAt && t.createdAt);
    if (withTime.length === 0) return "—";
    const totalDays = withTime.reduce((sum, t) => {
      return sum + (new Date(t.resolvedAt) - new Date(t.createdAt)) / (1000 * 60 * 60 * 24);
    }, 0);
    return (totalDays / withTime.length).toFixed(1) + " days";
  })();

  const juniorPerformance = juniors.map(j => {
    const jTickets = deptTickets.filter(t =>
      (t.assignedJuniorId?._id || t.assignedJuniorId) === j._id
    );
    return {
      ...j,
      total: jTickets.length,
      closed: jTickets.filter(t => t.status === "Closed").length,
      active: jTickets.filter(t => !["Closed", "Rejected"].includes(t.status)).length,
    };
  });

  return (
    <DashboardLayout title="Reports" subtitle="Department performance and progress reports">
      {loading ? (
        <div className="flex justify-center py-10"><div className="spinner" /></div>
      ) : (
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="font-bold text-lg mb-4">📊 Department Summary - {deptInfo?.name}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{deptTickets.length}</p>
                <p className="text-sm text-[var(--color-text-muted)]">Total Tickets</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{closedTickets.length}</p>
                <p className="text-sm text-[var(--color-text-muted)]">Resolved</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-600">{delayedTickets.length}</p>
                <p className="text-sm text-[var(--color-text-muted)]">SLA Breached</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">{avgResolutionTime}</p>
                <p className="text-sm text-[var(--color-text-muted)]">Avg Resolution</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="font-bold text-lg mb-4">👥 {juniorTitle} Performance Report</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left p-3 font-semibold">{juniorTitle}</th>
                    <th className="text-center p-3 font-semibold">Active</th>
                    <th className="text-center p-3 font-semibold">Closed</th>
                    <th className="text-center p-3 font-semibold">Total</th>
                    <th className="text-center p-3 font-semibold">Points</th>
                    <th className="text-center p-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {juniorPerformance.map(j => (
                    <tr key={j._id} className="border-b">
                      <td className="p-3">{j.name}</td>
                      <td className="text-center p-3">{j.active}</td>
                      <td className="text-center p-3 text-green-600">{j.closed}</td>
                      <td className="text-center p-3">{j.total}</td>
                      <td className="text-center p-3 font-bold">{j.performancePoints ?? 100}</td>
                      <td className="text-center p-3">
                        <span className={`badge ${j.active ? 'status-open' : 'status-closed'}`}>
                          {j.active ? 'Active' : 'Locked'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="font-bold text-lg mb-4">📝 Present Condition Notes</h2>
            <textarea
              className="w-full p-3 border rounded-lg text-sm"
              rows={4}
              placeholder="Write about current department conditions, challenges, or observations..."
              defaultValue=""
            />
            <button className="mt-3 btn-primary">Save Notes</button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
