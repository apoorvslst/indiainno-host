import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import DashboardLayout from "../../components/DashboardLayout";
import api from "../../utils/api";
import { getRoleTitle } from "../../config/roleConfig";
import DEPARTMENTS from "../../data/departments";
import toast from "react-hot-toast";

export default function OfficerReports() {
  const { userProfile } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reportRequest, setReportRequest] = useState({ show: false, deptHead: null });

  const mode = userProfile?.mode || "urban";
  const roleTitle = getRoleTitle("officer", mode);
  const deptHeadTitle = getRoleTitle("dept_head", mode);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ticketsRes, usersRes] = await Promise.all([
          api.get("/tickets/master"),
          api.get("/users"),
        ]);
        setTickets(ticketsRes.data || []);
        setUsers(usersRes.data || []);
      } catch (err) {
        console.error("Fetch error:", err);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const deptHeads = users.filter(u => u.role === "dept_head");

  const handleRequestReport = (deptHead) => {
    setReportRequest({ show: true, deptHead });
  };

  const sendReportRequest = async (message) => {
    toast.success(`Report request sent to ${reportRequest.deptHead.name}`);
    setReportRequest({ show: false, deptHead: null });
  };

  const getDeptStats = (deptId) => {
    const deptTickets = tickets.filter(t => t.department === deptId);
    return {
      total: deptTickets.length,
      active: deptTickets.filter(t => !["Closed", "Rejected", "Invalid_Spam"].includes(t.status)).length,
      closed: deptTickets.filter(t => t.status === "Closed").length,
    };
  };

  return (
    <DashboardLayout title="Reports" subtitle="Request reports from department heads and view city-wide statistics">
      {loading ? (
        <div className="flex justify-center py-10"><div className="spinner" /></div>
      ) : (
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="font-bold text-lg mb-4">📋 {deptHeadTitle}s Overview</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {deptHeads.map(dh => {
                const dept = DEPARTMENTS.find(d => d.id === dh.department);
                const stats = getDeptStats(dh.department);

                return (
                  <div key={dh._id} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold">{dh.name}</h3>
                        <p className="text-xs text-[var(--color-text-muted)]">{dept?.icon} {dept?.name}</p>
                      </div>
                      <span className={`badge ${dh.active ? 'status-open' : 'status-closed'}`}>
                        {dh.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="text-center">
                        <p className="font-bold text-blue-600">{stats.total}</p>
                        <p className="text-xs text-[var(--color-text-muted)]">Total</p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-orange-600">{stats.active}</p>
                        <p className="text-xs text-[var(--color-text-muted)]">Active</p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-green-600">{stats.closed}</p>
                        <p className="text-xs text-[var(--color-text-muted)]">Closed</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRequestReport(dh)}
                      className="w-full btn-secondary text-xs py-1"
                    >
                      📧 Request Report
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card p-6">
            <h2 className="font-bold text-lg mb-4">📊 City-Wide Statistics</h2>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-3xl font-bold text-blue-600">{tickets.length}</p>
                <p className="text-sm text-[var(--color-text-muted)]">Total Tickets</p>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <p className="text-3xl font-bold text-orange-600">
                  {tickets.filter(t => !["Closed", "Rejected", "Invalid_Spam"].includes(t.status)).length}
                </p>
                <p className="text-sm text-[var(--color-text-muted)]">Active</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-3xl font-bold text-green-600">
                  {tickets.filter(t => t.status === "Closed").length}
                </p>
                <p className="text-sm text-[var(--color-text-muted)]">Resolved</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-3xl font-bold text-red-600">
                  {tickets.filter(t => t.slaDeadline && new Date(t.slaDeadline) < new Date() && !["Closed", "Rejected"].includes(t.status)).length}
                </p>
                <p className="text-sm text-[var(--color-text-muted)]">SLA Breached</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {reportRequest.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card p-6 max-w-md w-full mx-4">
            <h3 className="font-bold text-lg mb-4">Request Report from {reportRequest.deptHead?.name}</h3>
            <textarea
              className="w-full p-3 border rounded-lg text-sm mb-4"
              rows={4}
              placeholder="Enter your request or message..."
              defaultValue="Please provide a detailed progress report for your department's pending cases."
            />
            <div className="flex gap-3">
              <button onClick={() => sendReportRequest("")} className="btn-primary flex-1">Send Request</button>
              <button onClick={() => setReportRequest({ show: false, deptHead: null })} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
