import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import DashboardLayout from "../../components/DashboardLayout";
import api from "../../utils/api";
import { getRoleTitle } from "../../config/roleConfig";
import DEPARTMENTS from "../../data/departments";
import toast from "react-hot-toast";

export default function DeptHeadManualQueue() {
  const { userProfile } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  const mode = userProfile?.mode || "urban";
  const roleTitle = getRoleTitle("dept_head", mode);
  const deptInfo = DEPARTMENTS.find(d => d.id === userProfile?.department);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get("/tickets/master?needsManualGeo=true");
        setTickets(res.data || []);
      } catch (err) {
        console.error("Fetch error:", err);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const needsGeo = tickets.filter(t => t.needsManualGeo && !["Closed", "Rejected"].includes(t.status));

  const handleUpdateGeo = async (ticketId, lat, lng, landmark) => {
    try {
      await api.put(`/tickets/master/${ticketId}`, {
        lat,
        lng,
        landmark,
        needsManualGeo: false,
      });
      toast.success("Location updated");
      const res = await api.get("/tickets/master?needsManualGeo=true");
      setTickets(res.data || []);
    } catch (err) {
      toast.error("Failed to update");
    }
  };

  return (
    <DashboardLayout title="Manual Pin-Drop Queue" subtitle="Fix geocoding failures by manually locating complaints">
      {loading ? (
        <div className="flex justify-center py-10"><div className="spinner" /></div>
      ) : needsGeo.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-lg">✅ All complaints located!</p>
          <p className="text-sm text-[var(--color-text-muted)] mt-2">No pending geocoding issues</p>
        </div>
      ) : (
        <div className="space-y-4">
          {needsGeo.map(t => (
            <ManualGeoCard key={t._id} ticket={t} onSave={handleUpdateGeo} />
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}

function ManualGeoCard({ ticket, onSave }) {
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [landmark, setLandmark] = useState(ticket.landmark || "");

  return (
    <div className="card p-4">
      <div className="flex justify-between items-start mb-4">
        <div>
          <span className="font-semibold">{(ticket.primaryCategory || "").replace(/_/g, " ")}</span>
          <span className={`badge severity-${(ticket.severity || "low").toLowerCase()} ml-2`}>{ticket.severity}</span>
        </div>
        <span className="text-xs text-[var(--color-text-muted)]">{ticket.source}</span>
      </div>
      
      <p className="text-sm mb-4">{ticket.description || "No description"}</p>

      {ticket.audioUrl && (
        <div className="mb-4">
          <audio controls src={ticket.audioUrl} className="w-full" />
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-3">
        <input
          type="text"
          placeholder="Latitude"
          value={lat}
          onChange={(e) => setLat(e.target.value)}
          className="input-field"
        />
        <input
          type="text"
          placeholder="Longitude"
          value={lng}
          onChange={(e) => setLng(e.target.value)}
          className="input-field"
        />
        <input
          type="text"
          placeholder="Landmark"
          value={landmark}
          onChange={(e) => setLandmark(e.target.value)}
          className="input-field"
        />
      </div>

      <button
        onClick={() => onSave(ticket._id, parseFloat(lat), parseFloat(lng), landmark)}
        disabled={!lat || !lng}
        className="btn-primary mt-3"
      >
        Save Location
      </button>
    </div>
  );
}
